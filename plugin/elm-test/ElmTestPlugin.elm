module ElmTestPlugin exposing (TestRunner, findTests, runTest)

import Dict
import Json.Encode as Encode exposing (Value, int, object, string)
import Random
import Test as ElmTest exposing (Test)
import Test.Runner.Failure as ElmTestFailure
import Test.Runner as ElmTestRunner exposing (SeededRunners(..), fromTest, getFailureReason, isTodo)
import TestPlugin as Plugin
import Time


type TestRunner
    = ValidRunner ElmTestRunner.Runner
    | InvalidRunner String


type alias TestItem =
    Plugin.TestItem TestRunner


type alias TestRun =
    Plugin.TestRun TestRunner


type alias ElmTestFailure =
    { given : Maybe String
    , description : String
    , reason : ElmTestFailure.Reason
    }


-- QUEUE


type alias TestIdentifierContext =
    { next : Int
    , lookup : Dict.Dict (List String) Plugin.TestIdentifier
    , testId : Plugin.TestId
    }


findTests : ElmTest.Test -> Plugin.TestArgs -> Time.Posix -> TestRun
findTests test args time =
    let
        runCount =
            Maybe.withDefault 100 args.runCount

        initialSeed =
            Maybe.withDefault (Time.posixToMillis time) args.initialSeed

        seed =
            Random.initialSeed initialSeed

        config =
            encodeConfig runCount initialSeed

        runners =
            ElmTestRunner.fromTest runCount seed test

        rootTestId =
            { current = { uniqueId = 0, label = "root" }
            , parents = []
            }

        context =
            { next = 1, lookup = Dict.empty, testId = rootTestId }
    in
        { config = config, tests = toTestItems context runners }


toTestItems : TestIdentifierContext -> ElmTestRunner.SeededRunners -> List TestItem
toTestItems context seededRunners =
    let
        initial =
            ( context, [] )
    in
        case seededRunners of
            Plain runners ->
                List.foldl (\r acc -> toValidTestItem r Plugin.Normal acc) initial runners |> Tuple.second

            Only runners ->
                List.foldl (\r acc -> toValidTestItem r Plugin.Focusing acc) initial runners |> Tuple.second

            Skipping runners ->
                List.foldl (\r acc -> toValidTestItem r (Plugin.Skipping Nothing) acc) initial runners |> Tuple.second

            Invalid reason ->
                toInvalidTestItem reason initial |> Tuple.second


toValidTestItem : ElmTestRunner.Runner -> Plugin.TestRunType -> ( TestIdentifierContext, List TestItem ) -> ( TestIdentifierContext, List TestItem )
toValidTestItem runner runType ( context, tests ) =
    let
        ( newContext, newTestId ) =
            toTestId runner.labels context
    in
        ( newContext, { id = newTestId, test = ValidRunner runner, runType = runType } :: tests )


toInvalidTestItem : String -> ( TestIdentifierContext, List TestItem ) -> ( TestIdentifierContext, List TestItem )
toInvalidTestItem reason ( context, tests ) =
    let
        ( newContext, newTestId ) =
            toTestId [] context
    in
        ( newContext
        , { id = newTestId, test = InvalidRunner reason, runType = Plugin.Normal } :: tests
        )


toTestId : List String -> TestIdentifierContext -> ( TestIdentifierContext, Plugin.TestId )
toTestId labels context =
    let
        ( newContext, _, newId ) =
            List.foldr (\l ( c, ls, id ) -> buildTestId l ls id c) ( context, [], context.testId ) labels
    in
        ( newContext, newId )


buildTestId : String -> List String -> Plugin.TestId -> TestIdentifierContext -> ( TestIdentifierContext, List String, Plugin.TestId )
buildTestId label labels testId context =
    let
        ( newContext, id ) =
            buildTestIdentifier label labels context
    in
        ( newContext
        , label :: labels
        , { current = id, parents = testId.current :: testId.parents }
        )


buildTestIdentifier : String -> List String -> TestIdentifierContext -> ( TestIdentifierContext, Plugin.TestIdentifier )
buildTestIdentifier label labels context =
    case Dict.get (label :: labels) context.lookup of
        Just identifier ->
            ( context, identifier )

        Nothing ->
            let
                identifier =
                    { uniqueId = context.next, label = label }
            in
                ( { next = context.next + 1
                  , lookup = Dict.insert (label :: labels) identifier context.lookup
                  , testId = context.testId
                  }
                , identifier
                )



-- RUN


runTest : TestItem -> Time.Posix -> Plugin.TestResult
runTest testItem time =
    case testItem.test of
        ValidRunner runner ->
            runValidTest testItem.id testItem.runType runner time

        InvalidRunner reason ->
            Plugin.Skip
                { id = testItem.id
                , reason = reason
                }


runValidTest : Plugin.TestId -> Plugin.TestRunType -> ElmTestRunner.Runner -> Time.Posix -> Plugin.TestResult
runValidTest testId runType runner time =
    let
        partitionedTests =
            runner.run ()
                |> List.partition (\e -> ElmTestRunner.isTodo e)

        todoMessages =
            Tuple.first partitionedTests
                |> List.map ElmTestRunner.getFailureReason
                |> List.filterMap identity
                |> List.map toFailureMessage

        failedMessages =
            Tuple.second partitionedTests
                |> List.map ElmTestRunner.getFailureReason
                |> List.filterMap identity
                |> List.map toFailureMessage

    in
        if List.isEmpty (Tuple.first partitionedTests) then
            if List.isEmpty failedMessages then
                Plugin.Pass
                    { id = testId
                    , runType = runType
                    , startTime = time
                    }
            else
                Plugin.Fail
                    { id = testId
                    , runType = runType
                    , startTime = time
                    , messages = failedMessages
                    }
        else
            Plugin.Todo
                { id = testId
                , messages = todoMessages
                }


toFailureMessage : ElmTestFailure -> Plugin.FailureMessage
toFailureMessage failure =
    { given = failure.given
    , message = ElmTestFailure.format failure.description failure.reason
    , reason = toFailureReason failure.reason
    }


toFailureReason : ElmTestFailure.Reason -> Plugin.FailureReason
toFailureReason reason =
    case reason of
            ElmTestFailure.Custom ->
                Plugin.Unknown

            ElmTestFailure.Equality x y ->
                Plugin.Expectation

            ElmTestFailure.Comparison x y ->
                Plugin.Expectation

            ElmTestFailure.ListDiff x y ->
                Plugin.Expectation

            ElmTestFailure.CollectionDiff _ ->
                Plugin.Expectation

            ElmTestFailure.TODO ->
                Plugin.TodoTest

            ElmTestFailure.Invalid _ ->
                Plugin.Invalid


-- REPORT


encodeConfig : Int -> Int -> Encode.Value
encodeConfig runCount initialSeed =
    Encode.object
        [ ( "framework", Encode.string "elm-test" )
        , ( "initialSeed", Encode.int initialSeed )
        , ( "runCount", Encode.int runCount )
        ]

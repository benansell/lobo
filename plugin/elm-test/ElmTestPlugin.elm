module ElmTestPlugin exposing (TestArgs, TestRunner, toArgs, findTests, runTest)

import Dict
import Json.Decode exposing (Decoder, Value, decodeValue, field, int, map2, maybe)
import Random.Pcg exposing (initialSeed)
import Test as ElmTest exposing (Test)
import Test.Runner as ElmTestRunner exposing (SeededRunners(Plain, Only, Skipping, Invalid), fromTest, getFailure, isTodo)
import TestPlugin as Plugin
import Time exposing (Time)


type alias TestArgs =
    { initialSeed : Maybe Int
    , runCount : Maybe Int
    }


type TestRunner
    = ValidRunner ElmTestRunner.Runner
    | InvalidRunner String


type alias TestItem =
    Plugin.TestItem TestRunner



-- INIT


toArgs : Value -> TestArgs
toArgs args =
    case (decodeValue decodeArgs args) of
        Ok value ->
            value

        Err error ->
            Debug.crash "Invalid args"


decodeArgs : Decoder TestArgs
decodeArgs =
    map2 TestArgs
        (maybe (field "seed" int))
        (maybe (field "runCount" int))



-- QUEUE


type alias TestIdentifierContext =
    { next : Int
    , lookup : Dict.Dict (List String) Plugin.TestIdentifier
    , testId : Plugin.TestId
    }


findTests : ElmTest.Test -> TestArgs -> Time -> List TestItem
findTests test args time =
    let
        runCount =
            Maybe.withDefault 100 args.runCount

        seed =
            Maybe.withDefault (round time) args.initialSeed
                |> Random.Pcg.initialSeed

        runners =
            ElmTestRunner.fromTest runCount seed test

        rootTestId =
            { current = { uniqueId = 0, label = "root" }
            , parents = []
            }

        context =
            { next = 1, lookup = Dict.empty, testId = rootTestId }
    in
        toTestItems context runners


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
        ( newContext, _, id ) =
            List.foldr (\l ( c, ls, id ) -> buildTestId l ls id c) ( context, [], context.testId ) labels
    in
        ( newContext, id )


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


runTest : TestItem -> Time -> Plugin.TestResult
runTest testItem time =
    case testItem.test of
        ValidRunner runner ->
            runValidTest testItem.id testItem.runType runner time

        InvalidRunner reason ->
            Plugin.Skip
                { id = testItem.id
                , reason = reason
                }


runValidTest : Plugin.TestId -> Plugin.TestRunType -> ElmTestRunner.Runner -> Time -> Plugin.TestResult
runValidTest testId runType runner time =
    let
        partitionedTests =
            runner.run ()
                |> List.partition (\e -> ElmTestRunner.isTodo e)

        todoMessages =
            Tuple.first partitionedTests
                |> List.map ElmTestRunner.getFailure
                |> List.filterMap identity

        failedMessages =
            Tuple.second partitionedTests
                |> List.map ElmTestRunner.getFailure
                |> List.filterMap identity
    in
        if List.isEmpty (Tuple.first partitionedTests) then
            if List.isEmpty failedMessages then
                Plugin.Pass
                    { id = testId
                    , startTime = time
                    , runType = runType
                    }
            else
                Plugin.Fail
                    { id = testId
                    , startTime = time
                    , messages = failedMessages
                    }
        else
            Plugin.Todo
                { id = testId
                , messages = todoMessages
                }

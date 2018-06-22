module ElmTestExtraPlugin exposing (TestArgs, TestRunner, toArgs, findTests, runTest)

import ElmTest.Runner as Extra exposing (Test(..))
import Json.Decode as Decode exposing (Decoder, Value, decodeValue, field, int, map2, maybe)
import Json.Encode as Encode exposing (Value, int, object, string)
import Random
import Test.Runner as ElmTestRunner exposing (Runner, SeededRunners(..), fromTest, getFailureReason)
import Test.Runner.Failure as ElmTestFailure
import TestPlugin as Plugin
import Time
import Tuple


type alias TestArgs =
    { initialSeed : Maybe Int
    , runCount : Maybe Int
    }


type TestRunner
    = ValidRunner ElmTestRunner.Runner
    | InvalidRunner String
    | TodoRunner String


type alias TestItem =
    Plugin.TestItem TestRunner


type alias TestRun =
    Plugin.TestRun TestRunner


type alias TestQueue =
    { nextUniqueId : Int
    , tests : List TestItem
    }


type alias ElmTestFailure =
    { given : Maybe String
    , description : String
    , reason : ElmTestFailure.Reason
    }


-- INIT


toArgs : Decode.Value -> TestArgs
toArgs args =
    case (decodeValue decodeArgs args) of
        Ok value ->
            value

        Err error ->
            Debug.todo "Invalid args"


decodeArgs : Decode.Decoder TestArgs
decodeArgs =
    Decode.map2 TestArgs
        (Decode.maybe (Decode.field "seed" Decode.int))
        (Decode.maybe (Decode.field "runCount" Decode.int))



-- QUEUE


findTests : Extra.Test -> TestArgs -> Time.Posix -> TestRun
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

        runner =
            fromTest runCount seed test

        rootTestId =
            { current = { uniqueId = 0, label = "root" }
            , parents = []
            }

        testQueue =
            findTestItem runner rootTestId Plugin.Normal { nextUniqueId = 1, tests = [] }
    in
        { config = config, tests = testQueue.tests }


findTestItem : ExtraRunner -> Plugin.TestId -> Plugin.TestRunType -> TestQueue -> TestQueue
findTestItem runner testId runType testQueue =
    case runner of
        Runnable runnable ->
            { testQueue | tests = { id = testId, test = runnable, runType = runType } :: testQueue.tests }

        Labeled label labeledRunner ->
            let
                newTestId =
                    { current = { uniqueId = testQueue.nextUniqueId, label = label }
                    , parents = testId.current :: testId.parents
                    }

                newTestQueue =
                    { testQueue | nextUniqueId = testQueue.nextUniqueId + 1 }
            in
                findTestItem labeledRunner newTestId runType newTestQueue

        Batch runners ->
            List.foldl (\r nq -> findTestItem r testId runType nq) testQueue runners

        Skipped reason skippedRunner ->
            findTestItem skippedRunner testId (Plugin.Skipping (Just reason)) testQueue

        Only onlyRunner ->
            case runType of
                Plugin.Normal ->
                    findTestItem onlyRunner testId Plugin.Focusing testQueue

                Plugin.Focusing ->
                    findTestItem onlyRunner testId runType testQueue

                Plugin.Skipping _ ->
                    findTestItem onlyRunner testId runType testQueue

        Todo reason ->
            let
                newTestId =
                    { current = { uniqueId = testQueue.nextUniqueId, label = reason }
                    , parents = testId.current :: testId.parents
                    }
            in
                { nextUniqueId = testQueue.nextUniqueId + 1, tests = { id = newTestId, test = TodoRunner reason, runType = runType } :: testQueue.tests }



-- RUN


runTest : TestItem -> Time.Posix -> Plugin.TestResult
runTest testItem time =
    case testItem.test of
        ValidRunner runner ->
            runValidTest testItem.id runner time

        InvalidRunner reason ->
            Plugin.Skip
                { id = testItem.id
                , reason = reason
                }

        TodoRunner reason ->
            Plugin.Todo
                { id = testItem.id
                , messages = [ { given = Nothing, message = reason, reason = Plugin.TodoTest } ]
                }


runValidTest : Plugin.TestId -> ElmTestRunner.Runner -> Time.Posix -> Plugin.TestResult
runValidTest testId runner time =
    let
        messages =
            runner.run ()
                |> List.map ElmTestRunner.getFailureReason
                |> List.filterMap identity
                |> List.map toFailureMessage
    in
        if List.isEmpty messages then
            Plugin.Pass
                { id = testId
                , startTime = time
                , runType = Plugin.Normal
                }
        else
            Plugin.Fail
                { id = testId
                , runType = Plugin.Normal
                , startTime = time
                , messages = messages
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

-- ELM TEST


type ExtraRunner
    = Runnable TestRunner
    | Labeled String ExtraRunner
    | Batch (List ExtraRunner)
    | Skipped String ExtraRunner
    | Only ExtraRunner
    | Todo String


toRunner : ElmTestRunner.SeededRunners -> ExtraRunner
toRunner runner =
    let
        processRunners =
            (\rs -> Batch <| List.map toExtraRunner rs)
    in
        case runner of
            ElmTestRunner.Plain runners ->
                processRunners runners

            ElmTestRunner.Only runners ->
                processRunners runners

            ElmTestRunner.Skipping runners ->
                processRunners runners

            ElmTestRunner.Invalid reason ->
                Runnable (InvalidRunner reason)


toExtraRunner : ElmTestRunner.Runner -> ExtraRunner
toExtraRunner runner =
    let
        label =
            String.concat runner.labels
    in
        ValidRunner runner
            |> Runnable
            |> Labeled label


fromTest : Int -> Random.Seed -> Extra.Test -> ExtraRunner
fromTest runs seed test =
    case test of
        Extra.Test ordinaryTest ->
            ElmTestRunner.fromTest runs seed ordinaryTest
                |> toRunner

        Extra.Labeled label subTest ->
            subTest
                |> fromTest runs seed
                |> Labeled label

        Extra.Batch subTests ->
            subTests
                |> List.foldl (distributeSeeds runs) ( seed, [] )
                |> Tuple.second
                |> Batch

        Extra.Skipped reason subTest ->
            subTest
                |> fromTest runs seed
                |> Skipped reason

        Extra.Only subTest ->
            subTest
                |> fromTest runs seed
                |> Only

        Extra.Todo reason ->
            TodoRunner reason
                |> Runnable


distributeSeeds : Int -> Extra.Test -> ( Random.Seed, List ExtraRunner ) -> ( Random.Seed, List ExtraRunner )
distributeSeeds runs test ( startingSeed, runners ) =
    case test of
        Extra.Test subTest ->
            let
                ( seed, nextSeed ) =
                    Random.step Random.independentSeed startingSeed

                runner =
                    ElmTestRunner.fromTest runs seed subTest
                        |> toRunner
            in
                ( nextSeed, runners ++ [ runner ] )

        Extra.Labeled label subTest ->
            let
                ( nextSeed, nextRunners ) =
                    distributeSeeds runs subTest ( startingSeed, [] )

                finalRunners =
                    List.map (Labeled label) nextRunners
            in
                ( nextSeed, runners ++ finalRunners )

        Extra.Batch tests ->
            let
                ( nextSeed, nextRunners ) =
                    List.foldl (distributeSeeds runs) ( startingSeed, [] ) tests
            in
                ( nextSeed, [ Batch (runners ++ nextRunners) ] )

        Extra.Skipped reason subTest ->
            let
                ( nextSeed, nextRunners ) =
                    distributeSeeds runs subTest ( startingSeed, [] )
            in
                ( nextSeed, runners ++ List.map (\t -> Skipped reason t) nextRunners )

        Extra.Only subTest ->
            let
                ( nextSeed, nextRunners ) =
                    distributeSeeds runs subTest ( startingSeed, [] )
            in
                ( nextSeed, runners ++ List.map (\t -> Only t) nextRunners )

        Extra.Todo reason ->
            ( startingSeed, runners ++ [ Todo reason ] )



-- REPORT


encodeConfig : Int -> Int -> Encode.Value
encodeConfig runCount initialSeed =
    Encode.object
        [ ( "framework", Encode.string "elm-test-extra" )
        , ( "initialSeed", Encode.int initialSeed )
        , ( "runCount", Encode.int runCount )
        ]

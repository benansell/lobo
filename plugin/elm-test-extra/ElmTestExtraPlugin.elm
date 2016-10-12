module ElmTestExtraPlugin exposing (TestArgs, TestRunner, toArgs, findTests, runTest)

import TestPlugin as Plugin
import Json.Decode exposing (Decoder, Value, (:=), decodeValue, int, object2, maybe)
import Expect as Expect exposing (getFailure)
import Time exposing (Time)
import Test.Runner as ElmRunner exposing (Runner(Runnable, Labeled, Batch), fromTest)
import Random.Pcg exposing (initialSeed)
import ElmTest.Runner as Extra exposing (Test(Test, Labeled, Batch, Skipped, Focus))
import Expect exposing (Expectation)


type alias TestArgs =
    { initialSeed : Maybe Int
    , runCount : Maybe Int
    }


type alias TestRunner =
    ElmRunner.Runnable


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
    object2 TestArgs
        (maybe ("seed" := int))
        (maybe ("runCount" := int))



-- QUEUE


findTests : Extra.Test -> TestArgs -> Time -> List TestItem
findTests test args time =
    let
        runCount =
            Maybe.withDefault 100 args.runCount

        seed =
            Maybe.withDefault (round time) args.initialSeed
                |> Random.Pcg.initialSeed

        runner =
            fromTest runCount seed test

        rootTestId =
            { current = { uniqueId = 0, label = "root" }
            , parents = []
            }
    in
        findTestItem runner rootTestId False Nothing ( 1, [] )
            |> snd


findTestItem : Runner -> Plugin.TestId -> Bool -> Maybe String -> ( Int, List TestItem ) -> ( Int, List TestItem )
findTestItem runner testId focus skipReason ( next, queue ) =
    case runner of
        Runnable runnable ->
            ( next, { id = testId, test = runnable, focus = focus, skipReason = skipReason } :: queue )

        Labeled label runner ->
            let
                newTestId =
                    { current = { uniqueId = next, label = label }
                    , parents = testId.current :: testId.parents
                    }
            in
                findTestItem runner newTestId focus skipReason ( next + 1, queue )

        Batch runners ->
            List.foldl (\r nq -> findTestItem r testId focus skipReason nq) ( next, queue ) runners

        Skipped reason runner ->
            findTestItem runner testId False (Just reason) ( next, queue )

        Focus runner ->
            case skipReason of
                Nothing ->
                    findTestItem runner testId True skipReason ( next, queue )

                Just reason ->
                    findTestItem runner testId False skipReason ( next, queue )



-- RUN


runTest : TestItem -> Time -> Plugin.TestResult
runTest testItem time =
    let
        messages =
            ElmRunner.run testItem.test
                |> List.map Expect.getFailure
                |> List.filterMap identity
    in
        if List.isEmpty messages then
            Plugin.Pass
                { id = testItem.id
                , startTime = time
                }
        else
            Plugin.Fail
                { id = testItem.id
                , startTime = time
                , messages = messages
                }



-- ELM TEST


type Runner
    = Runnable ElmRunner.Runnable
    | Labeled String Runner
    | Batch (List Runner)
    | Skipped String Runner
    | Focus Runner


toRunner : ElmRunner.Runner -> Runner
toRunner runner =
    case runner of
        ElmRunner.Runnable runnable ->
            Runnable runnable

        ElmRunner.Labeled label runner ->
            toRunner runner
                |> Labeled label

        ElmRunner.Batch subRunners ->
            List.map toRunner subRunners
                |> Batch


fromTest : Int -> Random.Pcg.Seed -> Extra.Test -> Runner
fromTest runs seed test =
    case test of
        Extra.Test test ->
            ElmRunner.fromTest runs seed test
                |> toRunner

        Extra.Labeled label subTest ->
            subTest
                |> fromTest runs seed
                |> Labeled label

        Extra.Batch subTests ->
            subTests
                |> List.foldl (distributeSeeds runs) ( seed, [] )
                |> snd
                |> Batch

        Extra.Skipped reason subTest ->
            subTest
                |> fromTest runs seed
                |> Skipped reason

        Extra.Focus subTest ->
            subTest
                |> fromTest runs seed
                |> Focus


distributeSeeds : Int -> Extra.Test -> ( Random.Pcg.Seed, List Runner ) -> ( Random.Pcg.Seed, List Runner )
distributeSeeds runs test ( startingSeed, runners ) =
    case test of
        Extra.Test subTest ->
            let
                ( seed, nextSeed ) =
                    Random.Pcg.step Random.Pcg.independentSeed startingSeed

                runner =
                    ElmRunner.fromTest runs seed subTest
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
        Extra.Focus subTest ->
            let
                ( nextSeed, nextRunners ) =
                    distributeSeeds runs subTest ( startingSeed, [] )
            in
                ( nextSeed, runners ++ List.map (\t -> Focus t) nextRunners )

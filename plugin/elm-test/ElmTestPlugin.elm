module ElmTestPlugin exposing (TestArgs, TestRunner, toArgs, findTests, runTest)

import Expect as Expect exposing (getFailure)
import Json.Decode exposing (Decoder, Value, decodeValue, field, int, map2, maybe)
import Random.Pcg exposing (initialSeed)
import Test as ElmTest exposing (Test)
import Test.Runner as Runner exposing (Runnable, fromTest, run)
import TestPlugin as Plugin
import Time exposing (Time)
import Tuple


type alias TestArgs =
    { initialSeed : Maybe Int
    , runCount : Maybe Int
    }


type alias TestRunner =
    Runner.Runnable


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


findTests : ElmTest.Test -> TestArgs -> Time -> List TestItem
findTests test args time =
    let
        runCount =
            Maybe.withDefault 100 args.runCount

        seed =
            Maybe.withDefault (round time) args.initialSeed
                |> Random.Pcg.initialSeed

        runner =
            Runner.fromTest runCount seed test

        rootTestId =
            { current = { uniqueId = 0, label = "root" }
            , parents = []
            }
    in
        findTestItem runner rootTestId False Nothing ( 1, [] )
            |> Tuple.second


findTestItem : Runner.Runner -> Plugin.TestId -> Bool -> Maybe String -> ( Int, List TestItem ) -> ( Int, List TestItem )
findTestItem runner testId focus skipReason ( next, queue ) =
    case runner of
        Runner.Runnable runnable ->
            ( next, { id = testId, test = runnable, focus = focus, skipReason = skipReason } :: queue )

        Runner.Labeled label runner ->
            let
                newTestId =
                    { current = { uniqueId = next, label = label }
                    , parents = testId.current :: testId.parents
                    }
            in
                findTestItem runner newTestId focus skipReason ( next + 1, queue )

        Runner.Batch runners ->
            List.foldl (\r nq -> findTestItem r testId focus skipReason nq) ( next, queue ) runners



-- RUN


runTest : TestItem -> Time -> Plugin.TestResult
runTest testItem time =
    let
        messages =
            Runner.run testItem.test
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

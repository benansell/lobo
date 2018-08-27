port module TestRunner exposing (Model, Msg, Plugin, run)

import Json.Decode as Decode exposing (Decoder, Value, bool, decodeValue, field, map)
import Json.Encode as Encode exposing (Value, null)
import Platform
import Task exposing (perform)
import TestPlugin exposing (Args, FailureMessage, TestArgs, TestId, TestIdentifier, TestItem, TestResult(..), TestRun, TestRunType(..), toArgs)
import TestReporter exposing (TestReport, encodeError, encodeReports, toProgressMessage, toTestReport)
import Time


run : Plugin a -> Program Decode.Value (Model a) Msg
run plugin =
    Platform.worker
        { init = init plugin
        , update = update
        , subscriptions = subscriptions
        }



-- MODEL


type alias Model a =
    { args : Args
    , runArgs : TestRunArgs
    , runConfig : Encode.Value
    , plugin : Plugin a
    , queue : List (TestItem a)
    , reports : List TestReport
    }


type alias TestRunArgs =
    { reportProgress : Bool
    }


type alias Plugin a =
    { findTests : TestArgs -> Time.Posix -> TestRun a
    , runTest : TestItem a -> Time.Posix -> TestResult
    , toArgs : Decode.Value -> Result String TestArgs
    }


type alias RunQueue a =
    { queue : List (TestItem a)
    , reports : List TestReport
    }


init : Plugin a -> Decode.Value -> ( Model a, Cmd Msg )
init plugin rawArgs =
    case (toArgs rawArgs) of

        Ok pluginArgs ->
            ( { args = { pluginArgs = pluginArgs }
              , runArgs = { reportProgress = False }
              , runConfig = Encode.null
              , plugin = plugin
              , queue = []
              , reports = []
              }
            , Cmd.none
            )

        Err message ->
            ( { args = { pluginArgs = { initialSeed = Nothing, runCount = Nothing } }
              , runArgs = { reportProgress = False }
              , runConfig = Encode.null
              , plugin = plugin
              , queue = []
              , reports = []
              }
            , error <| encodeError message
            )



-- UPDATE


type Msg
    = StartTestRun TestRunArgs
    | FinishedTestRun
    | OnError String
    | QueueTest Time.Posix
    | RunNextTest Bool
    | StartTest Time.Posix
    | FinishTest TestResult Time.Posix
    | TimeThen (Time.Posix-> Msg)


port begin : Int -> Cmd msg

port progress : Decode.Value -> Cmd msg

port error: Decode.Value -> Cmd msg

port end : Decode.Value -> Cmd msg


update : Msg -> Model a -> ( Model a, Cmd Msg )
update msg model =
    case msg of
        OnError message ->
            (model, error <| encodeError message)

        StartTestRun runArgs ->
            QueueTest
                |> timeThenUpdate { model | runArgs = runArgs }

        QueueTest time ->
            let
                ( config, runQueue ) =
                    queueTests model.plugin model.args time

                next =
                    StartTest
                        |> updateTime

                testCount =
                    List.length runQueue.queue + List.length runQueue.reports
            in
                ( { model | runConfig = config, queue = runQueue.queue, reports = runQueue.reports }
                , begin testCount
                )

        RunNextTest _ ->
            (model, StartTest |> updateTime)

        StartTest time ->
            let
                nextTest =
                    List.head model.queue
            in
                case nextTest of
                    Nothing ->
                        update FinishedTestRun model

                    Just item ->
                        model.plugin.runTest item time
                            |> FinishTest
                            |> timeThenUpdate { model | queue = List.drop 1 model.queue }

        FinishTest testResult time ->
            let
                testReport =
                    toTestReport testResult time

                newModel =
                    { model | reports = testReport :: model.reports }
            in
                ( newModel, progress (toProgressMessage testReport) )

        FinishedTestRun ->
            let
                result =
                    encodeReports model.runConfig model.reports
            in
                ( model, end result )

        TimeThen next ->
            ( model, updateTime next )


updateTime : (Time.Posix -> Msg) -> Cmd Msg
updateTime next =
    Task.perform next Time.now


timeThenUpdate : Model a -> (Time.Posix -> Msg) -> ( Model a, Cmd Msg )
timeThenUpdate model next =
    ( model, updateTime next )


queueTests : Plugin a -> Args -> Time.Posix -> ( Encode.Value, RunQueue a )
queueTests plugin args time =
    let
        testRun =
            plugin.findTests args.pluginArgs time

        runQueue =
            dequeReports time testRun.tests
    in
        ( testRun.config, runQueue )


dequeReports : Time.Posix -> List (TestItem b) -> RunQueue b
dequeReports time tests =
    let
        partitionedTests =
            List.partition (\t -> t.runType == Focusing) tests
    in
        case partitionedTests of
            ( x :: xs, ys ) ->
                { queue = x :: xs, reports = List.map (ignoreTest time) ys }

            ( [], ys ) ->
                List.foldl (\t -> testItemToQueuedTest time t) { queue = [], reports = [] } ys


testItemToQueuedTest : Time.Posix -> TestItem b -> RunQueue b -> RunQueue b
testItemToQueuedTest time testItem runQueue =
    case testItem.runType of
        Normal ->
            { runQueue | queue = testItem :: runQueue.queue }

        Focusing ->
            { runQueue | queue = testItem :: runQueue.queue }

        Skipping maybeReason ->
            case maybeReason of
                Nothing ->
                    { runQueue | queue = testItem :: runQueue.queue }

                Just reason ->
                    { runQueue | reports = (skipTest time testItem.id reason) :: runQueue.reports }


ignoreTest : Time.Posix -> TestItem a -> TestReport
ignoreTest time testItem =
    let
        result =
            Ignore { id = testItem.id }
    in
        toTestReport result time


skipTest : Time.Posix -> TestId -> String -> TestReport
skipTest time testId reason =
    let
        result =
            Skip { id = testId, reason = reason }
    in
        toTestReport result time



-- SUBSCRIPTIONS


port startTestRun : (TestRunArgs -> msg) -> Sub msg

port runNextTest : (Bool -> msg) -> Sub msg


subscriptions : Model a -> Sub Msg
subscriptions model =
    Sub.batch [ startTestRun StartTestRun, runNextTest RunNextTest ]

-- todo: decode test run args and runNext test messages

{-
toTestRunArgs : Decode.Value -> Result String TestRunArgs
toTestRunArgs value =
    let
        result =
            decodeValue testRunArgsDecoder value
    in
        case result of
            Ok runArgs ->
                runArgs

            Err _ ->
                Err "Failed to decode runArgs"


testRunArgsDecoder : Decode.Decoder TestRunArgs
testRunArgsDecoder =
    Decode.map TestRunArgs
        (field "reportProgress" Decode.bool)
-}

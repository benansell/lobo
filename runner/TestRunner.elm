port module TestRunner exposing (Model, Msg, Plugin, run)

import Json.Decode as Decode exposing (Decoder, Value, bool, decodeValue, field, map)
import Json.Encode as Encode exposing (Value, null)
import Platform
import Task exposing (perform)
import TestPlugin exposing (Args, FailureMessage, TestId, TestIdentifier, TestItem, TestResult(Pass, Fail, Ignore, Skip), TestRun, TestRunType(Focusing, Normal, Skipping))
import TestReporter exposing (TestReport, encodeReports, toProgressMessage, toTestReport)
import Time exposing (Time)


run : Plugin a b -> Program Decode.Value (Model a b) Msg
run plugin =
    Platform.programWithFlags
        { init = init plugin
        , update = update
        , subscriptions = subscriptions
        }



-- MODEL


type alias Model a b =
    { args : Args a
    , runArgs : RunArgs
    , runConfig : Encode.Value
    , plugin : Plugin a b
    , queue : List (TestItem b)
    , reports : List TestReport
    }


type alias RunArgs =
    { reportProgress : Bool
    }


type alias Plugin a b =
    { findTests : a -> Time -> TestRun b
    , runTest : TestItem b -> Time -> TestResult
    , toArgs : Decode.Value -> a
    }


type alias RunQueue b =
    { queue : List (TestItem b)
    , reports : List TestReport
    }


init : Plugin a b -> Decode.Value -> ( Model a b, Cmd Msg )
init plugin rawArgs =
    ( { args = { pluginArgs = plugin.toArgs rawArgs }
      , runArgs = { reportProgress = False }
      , runConfig = Encode.null
      , plugin = plugin
      , queue = []
      , reports = []
      }
    , Cmd.none
    )



-- UPDATE


type Msg
    = Start RunArgs
    | Finished
    | QueueTest Time
    | StartTest Time
    | FinishTest TestResult Time
    | TimeThen (Time -> Msg)


port begin : Int -> Cmd msg


port progress : Decode.Value -> Cmd msg


port end : Decode.Value -> Cmd msg


update : Msg -> Model a b -> ( Model a b, Cmd Msg )
update msg model =
    case msg of
        Start runArgs ->
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
                , Cmd.batch [ begin testCount, next ]
                )

        StartTest time ->
            let
                nextTest =
                    List.head model.queue
            in
                case nextTest of
                    Nothing ->
                        update Finished model

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

                next =
                    StartTest |> updateTime
            in
                if model.runArgs.reportProgress then
                    ( newModel, Cmd.batch [ progress (toProgressMessage testReport), next ] )
                else
                    ( newModel, next )

        Finished ->
            let
                result =
                    encodeReports model.runConfig model.reports
            in
                ( model, end result )

        TimeThen next ->
            ( model, updateTime next )


updateTime : (Time -> Msg) -> Cmd Msg
updateTime next =
    Task.perform next Time.now


timeThenUpdate : Model args testItem -> (Time -> Msg) -> ( Model args testItem, Cmd Msg )
timeThenUpdate model next =
    ( model, updateTime next )


queueTests : Plugin a b -> Args a -> Time -> ( Encode.Value, RunQueue b )
queueTests plugin args time =
    let
        testRun =
            plugin.findTests args.pluginArgs time

        runQueue =
            dequeReports time testRun.tests
    in
        ( testRun.config, runQueue )


dequeReports : Time -> List (TestItem b) -> RunQueue b
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


testItemToQueuedTest : Time -> TestItem b -> RunQueue b -> RunQueue b
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


ignoreTest : Time -> TestItem a -> TestReport
ignoreTest time testItem =
    let
        result =
            Ignore { id = testItem.id }
    in
        toTestReport result time


skipTest : Time -> TestId -> String -> TestReport
skipTest time testId reason =
    let
        result =
            Skip { id = testId, reason = reason }
    in
        toTestReport result time



-- SUBSCRIPTIONS


port runTests : (RunArgs -> msg) -> Sub msg


subscriptions : Model args testItem -> Sub Msg
subscriptions model =
    Sub.batch [ runTests Start ]


toRunArgs : Decode.Value -> RunArgs
toRunArgs value =
    let
        result =
            decodeValue runArgsDecoder value
    in
        case result of
            Ok runArgs ->
                runArgs

            Err _ ->
                Debug.crash "Failed to decode runArgs"


runArgsDecoder : Decode.Decoder RunArgs
runArgsDecoder =
    Decode.map RunArgs
        (field "reportProgress" Decode.bool)

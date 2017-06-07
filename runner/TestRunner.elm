port module TestRunner exposing (Model, Msg, Plugin, run)

import Json.Decode as Decode exposing (Decoder, Value, bool, decodeValue, field, map)
import Platform
import Task exposing (perform)
import TestPlugin exposing (Args, FailureMessage, TestId, TestIdentifier, TestItem, TestResult(Pass, Fail, Ignore, Skip), TestRunType(Normal, Focusing, Skipping))
import TestReporter exposing (TestReport, encodeReports, toProgressMessage, toTestReport)
import Time exposing (Time)


run : Plugin a b -> Program Value (Model a b) Msg
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
    , plugin : Plugin a b
    , queue : List (TestItem b)
    , reports : List TestReport
    }


type alias RunArgs =
    { reportProgress : Bool
    }


type alias Plugin a b =
    { findTests : a -> Time -> List (TestItem b)
    , runTest : TestItem b -> Time -> TestResult
    , toArgs : Value -> a
    }


init : Plugin a b -> Value -> ( Model a b, Cmd Msg )
init plugin rawArgs =
    ( { args = { pluginArgs = plugin.toArgs rawArgs }
      , runArgs = { reportProgress = False }
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


port progress : String -> Cmd msg


port end : Value -> Cmd msg


update : Msg -> Model a b -> ( Model a b, Cmd Msg )
update msg model =
    case msg of
        Start runArgs ->
            QueueTest
                |> timeThenUpdate { model | runArgs = runArgs }

        QueueTest time ->
            let
                ( queue, reports ) =
                    queueTests model.plugin model.args time

                next =
                    StartTest
                        |> updateTime

                testCount =
                    List.length queue + List.length reports
            in
                ( { model | queue = queue, reports = reports }
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
                    encodeReports model.reports
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


queueTests : Plugin a b -> Args a -> Time -> ( List (TestItem b), List TestReport )
queueTests plugin args time =
    let
        tests =
            plugin.findTests args.pluginArgs time

        partitionedTests =
            List.partition (\t -> t.runType == Focusing) tests
    in
        case partitionedTests of
            ( x :: xs, ys ) ->
                ( x :: xs, List.map (ignoreTest time) ys )

            ( [], ys ) ->
                List.foldl (\t -> testItemToQueuedTest time t) ( [], [] ) ys


testItemToQueuedTest : Time -> TestItem b -> ( List (TestItem b), List TestReport ) -> ( List (TestItem b), List TestReport )
testItemToQueuedTest time testItem ( queue, reports ) =
    case testItem.runType of
        Normal ->
            ( testItem :: queue, reports )

        Focusing ->
            ( testItem :: queue, reports )

        Skipping maybeReason ->
            case maybeReason of
                Nothing ->
                    ( testItem :: queue, reports )

                Just reason ->
                    ( queue, (skipTest time testItem.id reason) :: reports )


ignoreTest : Time -> TestItem a -> TestReport
ignoreTest time testItem =
    let
        result =
            Ignore
                { id = testItem.id
                }
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

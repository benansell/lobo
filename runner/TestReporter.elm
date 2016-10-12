module TestReporter exposing (TestReport, encodeReports, toProgressMessage, toTestReport)

import Json.Encode exposing (Value, encode, float, list, null, object, string)
import Time exposing (Time)
import TestPlugin exposing (Args, FailureMessage, TestId, TestIdentifier, TestItem, TestResult(Fail, Ignore, Pass, Skip))


-- RESULT TYPE


type alias ResultType =
    { passed : String
    , failed : String
    , skipped : String
    , ignored : String
    }


resultType : ResultType
resultType =
    { failed = "FAILED"
    , ignored = "IGNORED"
    , passed = "PASSED"
    , skipped = "SKIPPED"
    }



-- TEST REPORT


type TestReport
    = TestFail FailReport
    | TestIgnore IgnoreReport
    | TestPass PassReport
    | TestSkip SkipReport


type alias FailReport =
    { id : TestId
    , messages : List FailureMessage
    , startTime : Time
    , endTime : Time
    }


type alias IgnoreReport =
    { id : TestId
    }


type alias PassReport =
    { id : TestId
    , startTime : Time
    , endTime : Time
    }


type alias SkipReport =
    { id : TestId
    , reason : String
    }


toTestReport : TestResult -> Time -> TestReport
toTestReport testResult endTime =
    case testResult of
        Fail result ->
            TestFail
                { id = result.id
                , startTime = result.startTime
                , endTime = endTime
                , messages = result.messages
                }

        Ignore result ->
            TestIgnore
                { id = result.id
                }

        Pass result ->
            TestPass
                { id = result.id
                , startTime = result.startTime
                , endTime = endTime
                }

        Skip result ->
            TestSkip
                { id = result.id
                , reason = result.reason
                }


toProgressMessage : TestReport -> String
toProgressMessage testReport =
    case testReport of
        TestFail _ ->
            resultType.failed

        TestIgnore _ ->
            resultType.ignored

        TestPass _ ->
            resultType.passed

        TestSkip _ ->
            resultType.skipped



-- TEST REPORT NODE


type TestReportNode
    = Failed FailedLeaf
    | Ignored IgnoredLeaf
    | Passed PassedLeaf
    | Skipped SkippedLeaf
    | Suite SuiteNode


type alias FailedLeaf =
    { id : Int
    , label : String
    , messages : List FailureMessage
    , startTime : Time
    , endTime : Time
    }


type alias IgnoredLeaf =
    { id : Int
    , label : String
    }


type alias PassedLeaf =
    { id : Int
    , label : String
    , startTime : Time
    , endTime : Time
    }


type alias SkippedLeaf =
    { id : Int
    , label : String
    , reason : String
    }


type alias SuiteNode =
    { id : Int
    , label : String
    , reports : List TestReportNode
    , startTime : Maybe Time
    , endTime : Maybe Time
    }


type alias DetachedNode =
    { id : TestId
    , report : TestReportNode
    }


toTestReportNode : List TestReport -> List TestReportNode
toTestReportNode reports =
    let
        detachedNode =
            List.map toDetachedNode reports
                |> attachNode
    in
        case detachedNode of
            Nothing ->
                []

            Just node ->
                [ node.report ]


attachNode : List DetachedNode -> Maybe DetachedNode
attachNode nodes =
    case findByLongestTestIds nodes of
        Nothing ->
            Nothing

        Just next ->
            let
                ( parents, others ) =
                    List.filter (\x -> next.id.current.uniqueId /= x.id.current.uniqueId) nodes
                        |> List.partition (byTestIds next.id.parents)
            in
                case parents of
                    [] ->
                        case next.id.parents of
                            [] ->
                                Just next

                            x :: xs ->
                                { id = { current = x, parents = xs }, report = fromDetachedNode next }
                                    :: others
                                    |> attachNode

                    x :: _ ->
                        { id = x.id, report = attachChild next.report x.report }
                            :: others
                            |> attachNode


byTestIds : List TestIdentifier -> DetachedNode -> Bool
byTestIds testIds node =
    case testIds of
        [] ->
            False

        x :: _ ->
            x.uniqueId == node.id.current.uniqueId


findByLongestTestIds : List DetachedNode -> Maybe DetachedNode
findByLongestTestIds results =
    case results of
        [] ->
            Nothing

        x :: xs ->
            List.foldl longestTestIds x xs
                |> Just


longestTestIds : DetachedNode -> DetachedNode -> DetachedNode
longestTestIds x y =
    if List.length x.id.parents >= List.length y.id.parents then
        x
    else
        y


toDetachedNode : TestReport -> DetachedNode
toDetachedNode testReport =
    case testReport of
        TestFail report ->
            { id = report.id
            , report =
                Failed
                    { id = report.id.current.uniqueId
                    , label = report.id.current.label
                    , startTime = report.startTime
                    , endTime = report.endTime
                    , messages = report.messages
                    }
            }

        TestIgnore report ->
            { id = report.id
            , report =
                Ignored
                    { id = report.id.current.uniqueId
                    , label = report.id.current.label
                    }
            }

        TestPass report ->
            { id = report.id
            , report =
                Passed
                    { id = report.id.current.uniqueId
                    , label = report.id.current.label
                    , startTime = report.startTime
                    , endTime = report.endTime
                    }
            }

        TestSkip report ->
            { id = report.id
            , report =
                Skipped
                    { id = report.id.current.uniqueId
                    , label = report.id.current.label
                    , reason = report.reason
                    }
            }


fromDetachedNode : DetachedNode -> TestReportNode
fromDetachedNode node =
    Suite
        { id = node.id.current.uniqueId
        , label = node.id.current.label
        , reports = []
        , startTime = Nothing
        , endTime = Nothing
        }
        |> attachChild node.report


attachChild : TestReportNode -> TestReportNode -> TestReportNode
attachChild child parent =
    case parent of
        Failed _ ->
            Debug.crash "Impossible to attach a child to a failed test"

        Ignored _ ->
            Debug.crash "Impossible to attach a child to a ignored test"

        Passed _ ->
            Debug.crash "Impossible to attach a child to a passed test"

        Skipped _ ->
            Debug.crash "Impossible to attach a child to a skipped test"

        Suite node ->
            let
                startTime =
                    extractStartTime child
                        |> improveTime (<) node.startTime

                endTime =
                    extractEndTime child
                        |> improveTime (>) node.endTime
            in
                Suite
                    { node
                        | reports = child :: node.reports
                        , startTime = startTime
                        , endTime = endTime
                    }


improveTime : (Time -> Time -> Bool) -> Maybe Time -> Maybe Time -> Maybe Time
improveTime isImprovement x y =
    case ( x, y ) of
        ( Nothing, _ ) ->
            y

        ( _, Nothing ) ->
            x

        ( Just currentTime, Just newTime ) ->
            if isImprovement newTime currentTime then
                Just newTime
            else
                Just currentTime


extractStartTime : TestReportNode -> Maybe Time
extractStartTime result =
    case result of
        Failed report ->
            Just report.startTime

        Ignored _ ->
            Nothing

        Passed report ->
            Just report.startTime

        Skipped _ ->
            Nothing

        Suite report ->
            report.startTime


extractEndTime : TestReportNode -> Maybe Time
extractEndTime result =
    case result of
        Failed report ->
            Just report.endTime

        Ignored _ ->
            Nothing

        Passed report ->
            Just report.endTime

        Skipped _ ->
            Nothing

        Suite report ->
            report.endTime



-- ENCODE


encodeReports : List TestReport -> Value
encodeReports reports =
    toTestReportNode reports
        |> encodeTestReportNodeList


encodeTestReportNodeList : List TestReportNode -> Value
encodeTestReportNodeList reports =
    List.map encodeTestReportNode reports
        |> list


encodeTestReportNode : TestReportNode -> Value
encodeTestReportNode reportTree =
    case reportTree of
        Failed report ->
            encodeFailedLeaf report

        Ignored report ->
            encodeIgnoredLeaf report

        Passed report ->
            encodePassedLeaf report

        Skipped report ->
            encodeSkippedLeaf report

        Suite report ->
            encodeSuiteNode report


encodeFailedLeaf : FailedLeaf -> Value
encodeFailedLeaf leaf =
    object
        [ ( "label", string leaf.label )
        , ( "resultType", string resultType.failed )
        , ( "resultMessages", list (List.map encodeFailureMessage leaf.messages) )
        , ( "startTime", float leaf.startTime )
        , ( "endTime", float leaf.endTime )
        ]


encodeFailureMessage : FailureMessage -> Value
encodeFailureMessage failureMessage =
    object
        [ ( "given", string failureMessage.given )
        , ( "message", string failureMessage.message )
        ]


encodeIgnoredLeaf : IgnoredLeaf -> Value
encodeIgnoredLeaf leaf =
    object
        [ ( "label", string leaf.label )
        , ( "resultType", string resultType.ignored )
        ]


encodePassedLeaf : PassedLeaf -> Value
encodePassedLeaf leaf =
    object
        [ ( "label", string leaf.label )
        , ( "resultType", string resultType.passed )
        , ( "startTime", float leaf.startTime )
        , ( "endTime", float leaf.endTime )
        ]


encodeSkippedLeaf : SkippedLeaf -> Value
encodeSkippedLeaf leaf =
    object
        [ ( "label", string leaf.label )
        , ( "resultType", string resultType.skipped )
        , ( "reason", string leaf.reason )
        ]


encodeSuiteNode : SuiteNode -> Value
encodeSuiteNode report =
    object
        [ ( "label", string report.label )
        , ( "results", encodeTestReportNodeList report.reports )
        , ( "startTime", encodeMaybeTime report.startTime )
        , ( "endTime", encodeMaybeTime report.endTime )
        ]


encodeMaybeTime : Maybe Float -> Value
encodeMaybeTime time =
    Maybe.map float time
        |> Maybe.withDefault null

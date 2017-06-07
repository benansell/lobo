module TestReporter exposing (TestReport, encodeReports, toProgressMessage, toTestReport)

import Json.Encode exposing (Value, encode, float, list, null, object, string)
import TestPlugin exposing (Args, FailureMessage, TestId, TestIdentifier, TestItem, TestResult(Fail, Ignore, Pass, Skip, Todo), TestRunType(Normal, Focusing, Skipping))
import Time exposing (Time)


-- RESULT TYPE


type alias ResultType =
    { passed : String
    , failed : String
    , skipped : String
    , ignored : String
    , todo : String
    }


resultType : ResultType
resultType =
    { failed = "FAILED"
    , ignored = "IGNORED"
    , passed = "PASSED"
    , skipped = "SKIPPED"
    , todo = "TODO"
    }



-- TEST REPORT


type TestReport
    = TestFail FailReport
    | TestIgnore IgnoreReport
    | TestPass PassReport
    | TestSkip SkipReport
    | TestTodo TodoReport


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
    , runType : Maybe String
    }


type alias SkipReport =
    { id : TestId
    , reason : String
    }


type alias TodoReport =
    { id : TestId
    , messages : List FailureMessage
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
                , runType = toRunType result.runType
                }

        Skip result ->
            TestSkip
                { id = result.id
                , reason = result.reason
                }

        Todo result ->
            TestTodo
                { id = result.id
                , messages = result.messages
                }


toRunType : TestRunType -> Maybe String
toRunType runType =
    case runType of
        Normal ->
            Nothing

        Focusing ->
            Just "INCOMPLETE-FOCUS"

        Skipping _ ->
            Just "INCOMPLETE-SKIP"


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

        TestTodo _ ->
            resultType.todo



-- TEST REPORT NODE


type TestReportNode
    = Failed FailedLeaf
    | Ignored IgnoredLeaf
    | Passed PassedLeaf
    | Skipped SkippedLeaf
    | Suite SuiteNode
    | Todoed TodoLeaf


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
    , runType : Maybe String
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


type alias TodoLeaf =
    { id : Int
    , label : String
    , messages : List FailureMessage
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
                toTestReportNodeList node


toTestReportNodeList : DetachedNode -> List TestReportNode
toTestReportNodeList node =
    case node.report of
        Failed _ ->
            [ node.report ]

        Ignored _ ->
            [ node.report ]

        Passed _ ->
            [ node.report ]

        Skipped _ ->
            [ node.report ]

        Suite suiteNode ->
            suiteNode.reports

        Todoed _ ->
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
                                -- done when run out of parents
                                Just next

                            x :: xs ->
                                -- create new parent with next as a child and repeat
                                { id = { current = x, parents = xs }, report = fromDetachedNode x next }
                                    :: others
                                    |> attachNode

                    [ x ] ->
                        -- add next to it's parent and repeat
                        { x | report = attachChild next.report x.report }
                            :: others
                            |> attachNode

                    x :: xs ->
                        Debug.crash "Impossible to have more than 1 parent node"


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
                    , runType = report.runType
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

        TestTodo report ->
            { id = report.id
            , report =
                Todoed
                    { id = report.id.current.uniqueId
                    , label = report.id.current.label
                    , messages = report.messages
                    }
            }


fromDetachedNode : TestIdentifier -> DetachedNode -> TestReportNode
fromDetachedNode parentId node =
    Suite
        { id = parentId.uniqueId
        , label = parentId.label
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

        Todoed node ->
            let
                todoNode =
                    { node | label = List.map (\x -> x.message) node.messages |> String.concat }
            in
                Suite
                    { id = node.id
                    , label = node.label
                    , reports = Todoed todoNode :: []
                    , startTime = Nothing
                    , endTime = Nothing
                    }
                    |> attachChild child

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

        Todoed report ->
            Nothing


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

        Todoed report ->
            Nothing



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

        Todoed report ->
            encodeTodoLeaf report


encodeFailedLeaf : FailedLeaf -> Value
encodeFailedLeaf leaf =
    object
        [ ( "label", string leaf.label )
        , ( "resultType", string resultType.failed )
        , ( "resultMessages", list (List.map encodeFailureMessage leaf.messages) )
        , ( "startTime", float leaf.startTime )
        , ( "endTime", float leaf.endTime )
        ]


encodeIgnoredLeaf : IgnoredLeaf -> Value
encodeIgnoredLeaf leaf =
    object
        [ ( "label", string leaf.label )
        , ( "resultType", string resultType.ignored )
        ]


encodePassedLeaf : PassedLeaf -> Value
encodePassedLeaf leaf =
    let
        info =
            [ ( "label", string leaf.label )
            , ( "resultType", string resultType.passed )
            , ( "startTime", float leaf.startTime )
            , ( "endTime", float leaf.endTime )
            ]
    in
        case leaf.runType of
            Nothing ->
                object info

            Just rt ->
                object <| ( "runType", string rt ) :: info


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


encodeTodoLeaf : TodoLeaf -> Value
encodeTodoLeaf leaf =
    object
        [ ( "label", string leaf.label )
        , ( "resultType", string resultType.todo )
        ]


encodeFailureMessage : FailureMessage -> Value
encodeFailureMessage failureMessage =
    let
        messages =
            [ ( "message", string failureMessage.message ) ]
    in
        case failureMessage.given of
            Nothing ->
                object messages

            Just givenMessage ->
                ( "given", encodeMaybeString failureMessage.given )
                    :: messages
                    |> object


encodeMaybeString : Maybe String -> Value
encodeMaybeString value =
    Maybe.map string value
        |> Maybe.withDefault null


encodeMaybeTime : Maybe Float -> Value
encodeMaybeTime time =
    Maybe.map float time
        |> Maybe.withDefault null

module TestReporter exposing (TestReport, encodeReports, toProgressMessage, toTestReport)

import Json.Encode exposing (Value, encode, float, int, list, null, object, string)
import TestPlugin exposing (Args, FailureMessage, TestId, TestIdentifier, TestItem, TestResult(Fail, Ignore, Pass, Skip, Todo), TestRunType(Focusing, Normal, Skipping))
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
    , runType : TestRunType
    , messages : List FailureMessage
    , startTime : Time
    , endTime : Time
    }


type alias IgnoreReport =
    { id : TestId
    }


type alias PassReport =
    { id : TestId
    , runType : TestRunType
    , startTime : Time
    , endTime : Time
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
                , runType = result.runType
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
                , runType = result.runType
                , startTime = result.startTime
                , endTime = endTime
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


toRunType : TestRunType -> String
toRunType runType =
    case runType of
        Normal ->
            "NORMAL"

        Focusing ->
            "FOCUS"

        Skipping _ ->
            "SKIP"


toProgressMessage : TestReport -> Value
toProgressMessage testReport =
    case testReport of
        TestFail report ->
            encodeProgressMessage resultType.failed report.id

        TestIgnore report ->
            encodeProgressMessage resultType.ignored report.id

        TestPass report ->
            encodeProgressMessage resultType.passed report.id

        TestSkip report ->
            encodeProgressMessage resultType.skipped report.id

        TestTodo report ->
            encodeProgressMessage resultType.todo report.id


encodeProgressMessage : String -> TestId -> Value
encodeProgressMessage resultType id =
    object
        [ ( "id", int id.current.uniqueId )
        , ( "label", string id.current.label )
        , ( "resultType", string resultType )
        ]



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
    , runType : TestRunType
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
    , runType : TestRunType
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
    , runType : TestRunType
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


toTestReportNode : List TestReport -> SuiteNode
toTestReportNode reports =
    let
        detachedNode =
            List.map toDetachedNode reports
                |> attachNode
    in
    case detachedNode of
        Nothing ->
            Debug.crash "Impossible not to have any detached nodes"

        Just node ->
            toSuiteNode node


toSuiteNode : DetachedNode -> SuiteNode
toSuiteNode node =
    case node.report of
        Failed failedLeaf ->
            { id = failedLeaf.id
            , runType = failedLeaf.runType
            , label = failedLeaf.label
            , reports = [ node.report ]
            , startTime = Just failedLeaf.startTime
            , endTime = Just failedLeaf.endTime
            }

        Ignored _ ->
            Debug.crash "Impossible to have ignored node as root"

        Passed _ ->
            Debug.crash "Impossible to have passed node as root"

        Skipped _ ->
            Debug.crash "Impossible to have skipped node as root"

        Suite suiteNode ->
            suiteNode

        Todoed _ ->
            Debug.crash "Impossible to have todo node as root"


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
                    , runType = report.runType
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
                    , runType = report.runType
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
        , runType = Normal
        , label = parentId.label
        , reports = []
        , startTime = Nothing
        , endTime = Nothing
        }
        |> attachChild node.report


attachChild : TestReportNode -> TestReportNode -> TestReportNode
attachChild child parent =
    case parent of
        Failed node ->
            Suite
                { id = node.id
                , runType = node.runType
                , label = node.label
                , reports = [parent, child]
                , startTime = Just node.startTime
                , endTime = Just node.endTime
                }

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
                , runType = Normal
                , label = node.label
                , reports = Todoed todoNode :: []
                , startTime = Nothing
                , endTime = Nothing
                }
                |> attachChild child

        Suite node ->
            let
                runType =
                    extractRunType child
                        |> improveRunType node.runType

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
                    , runType = runType
                    , startTime = startTime
                    , endTime = endTime
                }


improveRunType : TestRunType -> TestRunType -> TestRunType
improveRunType x y =
    case ( x, y ) of
        ( Normal, Normal ) ->
            Normal

        ( Normal, _ ) ->
            y

        ( _, Normal ) ->
            x

        ( Focusing, Focusing ) ->
            x

        ( Skipping _, Skipping _ ) ->
            x

        ( Focusing, Skipping _ ) ->
            Debug.crash "Impossible to have different TestRunTypes: Focusing & Skipping"

        ( Skipping _, Focusing ) ->
            Debug.crash "Impossible to have different TestRunTypes: Skipping & Focusing"


extractRunType : TestReportNode -> TestRunType
extractRunType result =
    case result of
        Failed report ->
            report.runType

        Ignored report ->
            Normal

        Passed report ->
            report.runType

        Skipped report ->
            Normal

        Suite report ->
            report.runType

        Todoed report ->
            Normal


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


encodeReports : Value -> List TestReport -> Value
encodeReports config reports =
    toTestReportNode reports
        |> encodeRootNode config


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
        [ ( "id", int leaf.id )
        , ( "label", string leaf.label )
        , ( "resultType", string resultType.failed )
        , ( "resultMessages", list (List.map encodeFailureMessage leaf.messages) )
        , ( "startTime", float leaf.startTime )
        , ( "endTime", float leaf.endTime )
        ]


encodeIgnoredLeaf : IgnoredLeaf -> Value
encodeIgnoredLeaf leaf =
    object
        [ ( "id", int leaf.id )
        , ( "label", string leaf.label )
        , ( "resultType", string resultType.ignored )
        ]


encodePassedLeaf : PassedLeaf -> Value
encodePassedLeaf leaf =
    object
        [ ( "id", int leaf.id )
        , ( "label", string leaf.label )
        , ( "resultType", string resultType.passed )
        , ( "startTime", float leaf.startTime )
        , ( "endTime", float leaf.endTime )
        ]


encodeSkippedLeaf : SkippedLeaf -> Value
encodeSkippedLeaf leaf =
    object
        [ ( "id", int leaf.id )
        , ( "label", string leaf.label )
        , ( "resultType", string resultType.skipped )
        , ( "reason", string leaf.reason )
        ]


encodeRootNode : Value -> SuiteNode -> Value
encodeRootNode config node =
    object
        [ ( "id", int node.id )
        , ( "runType", string <| toRunType node.runType )
        , ( "config", config )
        , ( "runResults", encodeTestReportNodeList node.reports )
        , ( "startTime", encodeMaybeTime node.startTime )
        , ( "endTime", encodeMaybeTime node.endTime )
        ]


encodeSuiteNode : SuiteNode -> Value
encodeSuiteNode node =
    object
        [ ( "id", int node.id )
        , ( "label", string node.label )
        , ( "results", encodeTestReportNodeList node.reports )
        , ( "startTime", encodeMaybeTime node.startTime )
        , ( "endTime", encodeMaybeTime node.endTime )
        ]


encodeTodoLeaf : TodoLeaf -> Value
encodeTodoLeaf leaf =
    object
        [ ( "id", int leaf.id )
        , ( "label", string leaf.label )
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

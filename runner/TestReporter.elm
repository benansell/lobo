module TestReporter exposing (TestReport, encodeError, encodeReports, toProgressMessage, toTestReport)

import Json.Encode exposing (Value, encode, float, int, list, null, object, string)
import TestPlugin exposing (Args, FailureMessage, TestId, TestIdentifier, TestItem, TestResult(..), TestRunType(..))
import Time


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
    , startTime : Time.Posix
    , endTime : Time.Posix
    }


type alias IgnoreReport =
    { id : TestId
    }


type alias PassReport =
    { id : TestId
    , runType : TestRunType
    , startTime : Time.Posix
    , endTime : Time.Posix
    }


type alias SkipReport =
    { id : TestId
    , reason : String
    }


type alias TodoReport =
    { id : TestId
    , messages : List FailureMessage
    }


toTestReport : TestResult -> Time.Posix -> TestReport
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
encodeProgressMessage resultTypeValue id =
    object
        [ ( "id", int id.current.uniqueId )
        , ( "label", string id.current.label )
        , ( "resultType", string resultTypeValue )
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
    , startTime : Time.Posix
    , endTime : Time.Posix
    }


type alias IgnoredLeaf =
    { id : Int
    , label : String
    }


type alias PassedLeaf =
    { id : Int
    , runType : TestRunType
    , label : String
    , startTime : Time.Posix
    , endTime : Time.Posix
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
    , startTime : Maybe Time.Posix
    , endTime : Maybe Time.Posix
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


toTestReportNode : List TestReport -> Result String SuiteNode
toTestReportNode reports =
    let
        detachedNodeResult =
            List.map toDetachedNode reports
                |> attachNode
    in
    case detachedNodeResult of
        Ok node ->
            toSuiteNode node

        Err message ->
            Err message


toSuiteNode : DetachedNode -> Result String SuiteNode
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
            |> Ok

        Ignored _ ->
            Err "Impossible to have ignored node as root"

        Passed _ ->
            Err "Impossible to have passed node as root"

        Skipped _ ->
            Err "Impossible to have skipped node as root"

        Suite suiteNode ->
            Ok suiteNode

        Todoed _ ->
            Err "Impossible to have todo node as root"


attachNode : List DetachedNode -> Result String DetachedNode
attachNode nodes =
    case findByLongestTestIds nodes of
        Nothing ->
            Err "No results"

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
                            Ok next

                        x :: xs ->
                            -- create new parent with next as a child and repeat
                            let attachResult = Suite
                                    { id = x.uniqueId
                                    , runType = Normal
                                    , label = x.label
                                    , reports = []
                                    , startTime = Nothing
                                    , endTime = Nothing
                                    }
                                    |> attachChild next.report
                            in
                            case attachResult of
                                Ok report ->
                                    { id = { current = x, parents = xs }, report = report }
                                        :: others
                                        |> attachNode

                                Err message ->
                                    Err message

                [ x ] ->
                    -- add next to it's parent and repeat
                    attachDetachedNode others x next.report x.report

                x :: xs ->
                    -- merge parents into single parent and add next to it's parent and repeat
                    let
                        merged = List.foldl mergeParent (Ok x) xs
                    in
                    case merged of
                        Ok node ->
                            let
                                child = attachChild next.report node.report
                            in
                            case child of
                                Ok childNode ->
                                    { node | report = childNode }
                                    :: others
                                    |> attachNode

                                Err message ->
                                    Err message

                        Err message ->
                            Err message


mergeParent : DetachedNode -> Result String DetachedNode -> Result String DetachedNode
mergeParent detachedNode result =
    case result of
        Ok node ->
            let
                child = attachChild node.report detachedNode.report
            in
            case child of
                Ok childNode ->
                    { node | report = childNode }
                    |> Ok

                Err message ->
                    Err message

        Err message ->
            Err message


attachDetachedNode : List DetachedNode -> DetachedNode -> TestReportNode -> TestReportNode -> Result String DetachedNode
attachDetachedNode others x child parent =
    let
        attachResult = attachChild child parent
    in
    case attachResult of
        Ok report ->
            { x | report = report }
                :: others
                |> attachNode

        Err message ->
            Err message


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


attachChild : TestReportNode -> TestReportNode -> Result String TestReportNode
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
                |> Ok

        Ignored _ ->
            Err "Impossible to attach a child to a ignored test"

        Passed _ ->
            Err "Impossible to attach a child to a passed test"

        Skipped _ ->
            Err "Impossible to attach a child to a skipped test"

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
                runTypeResult =
                    extractRunType child
                        |> improveRunType node.runType

                startTime =
                    extractStartTime child
                        |> improveTime (<) node.startTime

                endTime =
                    extractEndTime child
                        |> improveTime (>) node.endTime
            in
            case runTypeResult of
                Ok runType ->
                    Suite
                        { node
                            | reports = child :: node.reports
                            , runType = runType
                            , startTime = startTime
                            , endTime = endTime
                        }
                        |> Ok

                Err message ->
                    Err message


improveRunType : TestRunType -> TestRunType -> Result String TestRunType
improveRunType x y =
    case ( x, y ) of
        ( Normal, Normal ) ->
            Ok Normal

        ( Normal, _ ) ->
            Ok y

        ( _, Normal ) ->
            Ok x

        ( Focusing, Focusing ) ->
            Ok x

        ( Skipping _, Skipping _ ) ->
            Ok x

        ( Focusing, Skipping _ ) ->
            Err "Impossible to have different TestRunTypes: Focusing & Skipping"

        ( Skipping _, Focusing ) ->
            Err "Impossible to have different TestRunTypes: Skipping & Focusing"


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


improveTime : (Int -> Int -> Bool) -> Maybe Time.Posix -> Maybe Time.Posix -> Maybe Time.Posix
improveTime isImprovement x y =
    case ( x, y ) of
        ( Nothing, _ ) ->
            y

        ( _, Nothing ) ->
            x

        ( Just currentTime, Just newTime ) ->
            if isImprovement (Time.posixToMillis newTime) (Time.posixToMillis currentTime) then
                Just newTime
            else
                Just currentTime


extractStartTime : TestReportNode -> Maybe Time.Posix
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


extractEndTime : TestReportNode -> Maybe Time.Posix
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

encodeError : String -> Value
encodeError message =
    string message


encodeReports : Value -> List TestReport -> Value
encodeReports config reports =
    case (toTestReportNode reports) of
        Ok testReportNode ->
            encodeRootNode config testReportNode

        Err message ->
            object
                [ ( "id", int 0 )
                , ( "runType", string <| toRunType Normal )
                , ( "config", config )
                , ( "runError", encodeError message )
                , ( "startTime", encodeMaybeTime Nothing )
                , ( "endTime", encodeMaybeTime Nothing )
                ]


encodeTestReportNodeList : List TestReportNode -> Value
encodeTestReportNodeList reports =
    list encodeTestReportNode reports


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
        , ( "resultMessages", list encodeFailureMessage leaf.messages)
        , ( "startTime", encodeTime leaf.startTime )
        , ( "endTime", encodeTime leaf.endTime )
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
        , ( "startTime", encodeTime leaf.startTime )
        , ( "endTime", encodeTime leaf.endTime )
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


encodeMaybeTime : Maybe Time.Posix -> Value
encodeMaybeTime time =
    Maybe.map encodeTime time
        |> Maybe.withDefault null


encodeTime : Time.Posix -> Value
encodeTime time =
    Time.posixToMillis time
    |> int


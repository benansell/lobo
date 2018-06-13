module TestPlugin exposing (Args, FailureMessage, FailureReason(..), TestId, TestIdentifier, TestItem, TestResult(..), TestRun, TestRunType(..))

import Json.Encode as Encode exposing (Value)
import Time


type alias Args a =
    { pluginArgs : a
    }


type alias FailureMessage =
    { given : Maybe String
    , message : String
    , reason: FailureReason
    }


type FailureReason
    = Expectation
    | Invalid
    | TodoTest
    | Unknown


type alias TestId =
    { current : TestIdentifier
    , parents : List TestIdentifier
    }


type alias TestIdentifier =
    { uniqueId : Int
    , label : String
    }


type alias TestRun a =
    { config : Encode.Value
    , tests : List (TestItem a)
    }


type TestRunType
    = Focusing
    | Normal
    | Skipping (Maybe String)


type alias TestItem a =
    { id : TestId
    , test : a
    , runType : TestRunType
    }


type TestResult
    = Fail FailResult
    | Ignore IgnoreResult
    | Pass PassResult
    | Skip SkipResult
    | Todo TodoResult


type alias FailResult =
    { id : TestId
    , runType : TestRunType
    , startTime : Time.Posix
    , messages : List FailureMessage
    }


type alias IgnoreResult =
    { id : TestId
    }


type alias PassResult =
    { id : TestId
    , runType : TestRunType
    , startTime : Time.Posix
    }


type alias SkipResult =
    { id : TestId
    , reason : String
    }


type alias TodoResult =
    { id : TestId
    , messages : List FailureMessage
    }

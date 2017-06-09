module TestPlugin exposing (Args, FailureMessage, TestId, TestIdentifier, TestItem, TestResult(Fail, Ignore, Pass, Skip, Todo), TestRunType(Normal, Focusing, Skipping))

import Time exposing (Time)


type alias Args a =
    { pluginArgs : a
    }


type alias FailureMessage =
    { given : Maybe String
    , message : String
    }


type alias TestId =
    { current : TestIdentifier
    , parents : List TestIdentifier
    }


type alias TestIdentifier =
    { uniqueId : Int
    , label : String
    }


type TestRunType
    = Normal
    | Focusing
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
    , startTime : Time
    , messages : List FailureMessage
    }


type alias IgnoreResult =
    { id : TestId
    }


type alias PassResult =
    { id : TestId
    , runType : TestRunType
    , startTime : Time
    }


type alias SkipResult =
    { id : TestId
    , reason : String
    }


type alias TodoResult =
    { id : TestId
    , messages : List FailureMessage
    }

module TestPlugin exposing (Args, FailureMessage, TestId, TestIdentifier, TestItem, TestResult(Fail, Ignore, Pass, Skip))

import Time exposing (Time)


type alias Args a =
    { pluginArgs : a
    }


type alias FailureMessage =
    { given : String
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


type alias TestItem a =
    { id : TestId
    , test : a
    , focus : Bool
    , skipReason : Maybe String
    }


type TestResult
    = Fail FailResult
    | Ignore IgnoreResult
    | Pass PassResult
    | Skip SkipResult


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
    , startTime : Time
    }


type alias SkipResult =
    { id : TestId
    , reason : String
    }

module TestPlugin exposing (Args, FailureMessage, FailureReason(..), TestArgs, TestId, TestIdentifier, TestItem, TestResult(..), TestRun, TestRunType(..), toArgs)

import Json.Decode as Decode exposing (Decoder, Value, decodeValue, field, int, map2, maybe)
import Json.Encode as Encode exposing (Value)
import Time

type alias TestArgs =
    { initialSeed : Maybe Int
    , runCount : Maybe Int
    }

type alias Args =
    { pluginArgs : TestArgs
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


-- INIT

toArgs : Decode.Value -> Result String TestArgs
toArgs args =
    case (decodeValue decodeArgs args) of
        Ok value ->
            Ok value

        Err error ->
            Err "Invalid args"


decodeArgs : Decode.Decoder TestArgs
decodeArgs =
    Decode.map2 TestArgs
        (Decode.maybe (Decode.field "seed" Decode.int))
        (Decode.maybe (Decode.field "runCount" Decode.int))

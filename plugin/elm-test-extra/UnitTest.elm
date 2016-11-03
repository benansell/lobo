module UnitTest exposing (main)

import ElmTestExtraPlugin as ElmTestExtra
import Json.Decode exposing (Value)
import TestRunner as Runner
import Tests exposing (all)


main : Program Value (Runner.Model ElmTestExtra.TestArgs ElmTestExtra.TestRunner) Runner.Msg
main =
    Runner.run plugin


plugin : Runner.Plugin ElmTestExtra.TestArgs ElmTestExtra.TestRunner
plugin =
    { findTests = ElmTestExtra.findTests Tests.all
    , runTest = ElmTestExtra.runTest
    , toArgs = ElmTestExtra.toArgs
    }

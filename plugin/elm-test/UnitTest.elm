module UnitTest exposing (main)

import ElmTestPlugin as ElmTest
import Json.Decode exposing (Value)
import TestRunner as Runner
import Tests exposing (all)


main : Program Value (Runner.Model ElmTest.TestArgs ElmTest.TestRunner) Runner.Msg
main =
    Runner.run plugin


plugin : Runner.Plugin ElmTest.TestArgs ElmTest.TestRunner
plugin =
    { findTests = ElmTest.findTests Tests.all
    , runTest = ElmTest.runTest
    , toArgs = ElmTest.toArgs
    }

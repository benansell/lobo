module UnitTest exposing (main)

import TestRunner as Runner
import ElmTestPlugin as ElmTest
import Json.Decode exposing (Value)
import Tests exposing (all)

main : Program Value
main =
    Runner.run plugin


plugin : Runner.Plugin ElmTest.TestArgs ElmTest.TestRunner
plugin =
    { findTests = ElmTest.findTests Tests.all
    , runTest = ElmTest.runTest
    , toArgs = ElmTest.toArgs
    }

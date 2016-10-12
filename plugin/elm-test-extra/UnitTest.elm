module UnitTest exposing (main)

import TestRunner as Runner
import ElmTestExtraPlugin as ElmTestExtra
import Json.Decode exposing (Value)
import Tests exposing (all)

main : Program Value
main =
    Runner.run plugin


plugin : Runner.Plugin ElmTestExtra.TestArgs ElmTestExtra.TestRunner
plugin =
    { findTests = ElmTestExtra.findTests Tests.all
    , runTest = ElmTestExtra.runTest
    , toArgs = ElmTestExtra.toArgs
    }

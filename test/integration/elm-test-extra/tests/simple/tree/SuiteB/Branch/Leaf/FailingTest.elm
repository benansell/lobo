module SuiteB.Branch.Leaf.FailingTest exposing (..)

import Expect exposing (pass)
import ElmTest.Extra exposing (Test, describe, test)


failingTest : Test
failingTest =
    test "FailingTest - Leaf" <|
        \() ->
            Expect.fail "Expected fail"

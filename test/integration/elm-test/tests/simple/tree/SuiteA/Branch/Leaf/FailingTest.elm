module SuiteA.Branch.Leaf.FailingTest exposing (..)

import Expect exposing (pass)
import Test exposing (Test, describe, test)


failingTest : Test
failingTest =
    test "FailingTest - Leaf" <|
        \() ->
            Expect.fail "Expected fail"

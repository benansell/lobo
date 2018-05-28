module SuiteA.Leaf.FailingLeafTest exposing (..)

import Expect exposing (pass)
import Test exposing (Test, describe, test)


failingTest : Test
failingTest =
    test "FailingTest - GrandChild" <|
        \() ->
            Expect.fail "Expected fail"

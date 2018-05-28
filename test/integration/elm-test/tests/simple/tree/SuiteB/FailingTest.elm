module SuiteB.FailingTest exposing (..)

import Expect exposing (pass)
import Test exposing (Test, describe, test)


failingTest : Test
failingTest =
    test "FailingTest - Child" <|
        \() ->
            Expect.fail "Expected fail"

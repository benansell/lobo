module SuiteB.FailingTest exposing (..)

import Expect exposing (pass)
import Test exposing (Test, describe, test)


failingTest : Test
failingTest =
    test "FailingTest - Suite B" <|
        \() ->
            Expect.fail "Expected fail"

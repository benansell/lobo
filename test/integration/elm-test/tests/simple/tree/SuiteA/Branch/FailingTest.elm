module SuiteA.Branch.FailingTest exposing (..)

import Expect exposing (pass)
import Test exposing (Test, describe, test)


failingTest : Test
failingTest =
    test "FailingTest - Branch" <|
        \() ->
            Expect.fail "Expected fail"

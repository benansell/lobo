module SuiteA.FailingTest exposing (..)

import Expect exposing (pass)
import ElmTest.Extra exposing (Test, describe, test)


failingTest : Test
failingTest =
    test "FailingTest - Suite A" <|
        \() ->
            Expect.fail "Expected fail"

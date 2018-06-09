module SuiteB.PassingTest exposing (..)

import Expect exposing (pass)
import Test exposing (Test, describe, test)


passingTest : Test
passingTest =
    test "PassingTest Child" <|
        \() ->
            Expect.pass

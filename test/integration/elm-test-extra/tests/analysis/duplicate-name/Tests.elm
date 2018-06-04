module Tests exposing (..)


import Expect
import ElmTest.Extra exposing (Test, describe, test)

duplicate : Test
duplicate =
    test "Duplicate" <|
        \() ->
            Expect.pass


passingTest : Test
passingTest =
    test "passingTest" <|
        \() ->
            Expect.pass


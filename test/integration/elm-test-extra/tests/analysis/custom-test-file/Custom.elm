module Custom exposing (..)


import Expect
import ElmTest.Extra exposing (Test, describe, test)

passingTest : Test
passingTest =
    test "passingTest" <|
        \() ->
            Expect.pass

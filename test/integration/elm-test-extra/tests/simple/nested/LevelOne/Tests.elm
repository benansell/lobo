module LevelOne.Tests exposing (..)

import Expect
import ElmTest.Extra exposing (Test, test)


passingTest : Test
passingTest =
    test "passingTest" <|
        \() ->
            Expect.pass

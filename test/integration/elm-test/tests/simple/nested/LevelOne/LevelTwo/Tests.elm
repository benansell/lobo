module LevelOne.LevelTwo.Tests exposing (..)

import Expect
import Test exposing (Test, test)


passingTest : Test
passingTest =
    test "passingTest" <|
        \() ->
            Expect.pass

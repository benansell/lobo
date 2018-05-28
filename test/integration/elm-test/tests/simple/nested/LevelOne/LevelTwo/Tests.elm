module LevelOne.LevelTwo.Tests exposing (..)

import Expect
import Test exposing (Test, test)


failingTest : Test
failingTest =
    test "failingTest" <|
        \() ->
            Expect.fail "fail level two"

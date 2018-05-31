module Tests exposing (..)

import Expect exposing (pass)
import Test exposing (Test, describe, test)


passingTestA : Test
passingTestA =
    test "PassingTest A" <|
        \() ->
            Expect.pass

passingTestB : Test
passingTestB =
    test "PassingTest B" <|
        \() ->
            Expect.pass


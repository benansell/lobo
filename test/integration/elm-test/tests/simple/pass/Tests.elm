module Tests exposing (all)

import Expect exposing (pass)
import Test exposing (Test, test)


all : Test
all =
    test "passingTest" <|
        \() ->
            Expect.pass


module Tests exposing (all)

import Expect exposing (pass)
import Test exposing (Test, test)
import ImportCheck


all : Test
all =
    test "passingTest" <|
        \() ->
            Expect.pass

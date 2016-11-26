module Tests exposing (all)

import Expect exposing (pass)
import ElmTest.Extra exposing (Test, test)


all : Test
all =
    test "passingTest" <|
        \() ->
            Expect.pass

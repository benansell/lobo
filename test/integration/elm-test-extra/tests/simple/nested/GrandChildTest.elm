module GrandChildTest exposing (all)

import Expect exposing (pass)
import ElmTest.Extra exposing (Test, describe, test)


all : Test
all =
    describe "GrandChildTest"
        [ passingTest ]


passingTest : Test
passingTest =
    test "passingTest" <|
        \() ->
            Expect.pass

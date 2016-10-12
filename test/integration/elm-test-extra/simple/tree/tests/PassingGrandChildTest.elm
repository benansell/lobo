module PassingGrandChildTest exposing (all)

import Expect exposing (pass)
import ElmTest.Extra exposing (Test, describe, test)

all : Test
all =
    describe "PassingGrandChildTest"
        [ passingTest ]

passingTest : Test
passingTest =
    test "passingTest - Grandchild" <|
        \() ->
            Expect.pass

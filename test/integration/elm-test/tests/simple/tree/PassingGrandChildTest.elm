module PassingGrandChildTest exposing (all)

import Expect exposing (pass)
import Test exposing (Test, describe, test)


all : Test
all =
    describe "PassingGrandChildTest"
        [ passingTest ]


passingTest : Test
passingTest =
    test "PassingTest - Grandchild" <|
        \() ->
            Expect.pass

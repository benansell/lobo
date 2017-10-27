module FailingGrandChildTest exposing (all)

import Expect exposing (pass)
import ElmTest.Extra exposing (Test, describe, test)


all : Test
all =
    describe "FailingGrandChildTest"
        [ failingTest ]


failingTest : Test
failingTest =
    test "FailingTest - GrandChild" <|
        \() ->
            Expect.fail "Expected fail"
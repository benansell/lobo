module SecondChildTest exposing (all)

import Expect exposing (pass)
import FailingGrandChildTest exposing (all)
import PassingGrandChildTest exposing (all)
import ElmTest.Extra exposing (Test, describe, test)


all : Test
all =
    describe "SecondChildTest"
        [ FailingGrandChildTest.all
        , failingTest
        , PassingGrandChildTest.all
        ]


failingTest : Test
failingTest =
    test "FailingTest - Child" <|
        \() ->
            Expect.fail "Expected fail"

module ConcatChildTest exposing (all)

import Expect exposing (pass)
import FailingGrandChildTest exposing (all)
import PassingGrandChildTest exposing (all)
import Test exposing (Test, concat, test)

all : Test
all =
    concat
        [ failingTest
        , passingTest
        ]

failingTest : Test
failingTest =
    test "failingTest - Concat" <|
        \() ->
            Expect.fail "Expected fail"


passingTest : Test
passingTest =
    test "passingTest Concat" <|
        \() ->
            Expect.pass

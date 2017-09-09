module ConcatChildTest exposing (all)

import Expect exposing (pass)
import Test exposing (Test, concat, test)


all : Test
all =
    concat
        [ failingTest
        , passingTest
        ]


failingTest : Test
failingTest =
    test "FailingTest - Concat" <|
        \() ->
            Expect.fail "Expected fail"


passingTest : Test
passingTest =
    test "PassingTest Concat" <|
        \() ->
            Expect.pass

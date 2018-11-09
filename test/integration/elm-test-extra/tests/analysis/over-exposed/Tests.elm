module Tests exposing (..)


import Expect
import ElmTest.Extra exposing (Test, describe, test)

all : Test
all =
    describe "Tests"
        [ testOne
        , suiteTwo
        ]


suiteTwo : Test
suiteTwo =
    describe "Suite Two"
        [ testTwo ]


testOne : Test
testOne =
    test "Test One" <|
        \() ->
            Expect.pass


testTwo : Test
testTwo =
    test "Test Two" <|
        \() ->
            Expect.pass

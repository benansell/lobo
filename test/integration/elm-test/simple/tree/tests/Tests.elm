module Tests exposing (all)

import Expect exposing (pass)
import FirstChildTest exposing (all)
import FuzzyChildTest exposing (all)
import SecondChildTest exposing (all)
import Test exposing (Test, describe, test)

all : Test
all =
    describe "Tests"
        [ passingTest
        , FirstChildTest.all
        , SecondChildTest.all
        , FuzzyChildTest.all
        ]

passingTest : Test
passingTest =
    test "passingTest Child" <|
        \() ->
            Expect.pass

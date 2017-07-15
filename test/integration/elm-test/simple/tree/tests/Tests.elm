module Tests exposing (all)

import Expect exposing (pass)
import ConcatChildTest exposing (all)
import FirstChildTest exposing (all)
import FuzzyChildTest exposing (all)
import SecondChildTest exposing (all)
import Test exposing (Test, describe, test)


all : Test
all =
    describe "Tests"
        [ suiteA
        , suiteB
        ]

suiteA : Test
suiteA =
    describe "Suite A"
        [ passingTest
        , ConcatChildTest.all
        , FirstChildTest.all
        , SecondChildTest.all
        , FuzzyChildTest.all
        ]

suiteB : Test
suiteB =
    describe "Suite B"
        [ passingTest
        , ConcatChildTest.all
        , FirstChildTest.all
        , SecondChildTest.all
        , FuzzyChildTest.all
        ]


passingTest : Test
passingTest =
    test "PassingTest Child" <|
        \() ->
            Expect.pass

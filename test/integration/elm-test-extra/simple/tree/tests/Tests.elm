module Tests exposing (all)

import Expect exposing (pass)
import FirstChildTest exposing (all)
import FuzzyChildTest exposing (all)
import SecondChildTest exposing (all)
import ElmTest.Extra exposing (Test, describe, test)

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
        , FirstChildTest.all
        , SecondChildTest.all
        , FuzzyChildTest.all
        ]

suiteB : Test
suiteB =
    describe "Suite B"
        [ passingTest
        , FirstChildTest.all
        , SecondChildTest.all
        , FuzzyChildTest.all
        ]

passingTest : Test
passingTest =
    test "PassingTest Child" <|
        \() ->
            Expect.pass

module Tests exposing (all)

import Expect exposing (pass)
import FirstChildTest exposing (all)
import FuzzyChildTest exposing (all)
import SecondChildTest exposing (all)
import ElmTest.Extra exposing (Test, describe, test)

all : Test
all =
    describe "treeeTestSuite"
        [ suiteA
        , suiteB
        ]

suiteA : Test
suiteA =
    describe "Suite A"
        [ passingTestA
        , FirstChildTest.all
        , SecondChildTest.all
        , FuzzyChildTest.all
        ]

suiteB : Test
suiteB =
    describe "Suite B"
        [ passingTestB
        , FirstChildTest.all
        , SecondChildTest.all
        , FuzzyChildTest.all
        ]

passingTestA : Test
passingTestA =
    test "PassingTest Child A" <|
        \() ->
            Expect.pass

passingTestB : Test
passingTestB =
    test "PassingTest Child B" <|
        \() ->
            Expect.pass

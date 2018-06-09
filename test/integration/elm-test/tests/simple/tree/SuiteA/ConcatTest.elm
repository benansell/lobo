module SuiteA.ConcatTest exposing (all)

import Expect exposing (pass)
import Test exposing (Test, concat, test)


all : Test
all =
    concat
        [ passingTestOne
        , passingTestTwo
        ]


passingTestOne : Test
passingTestOne =
    test "PassingTest Concat One" <|
        \() ->
            Expect.pass


passingTestTwo : Test
passingTestTwo =
    test "PassingTest Concat Two" <|
        \() ->
            Expect.pass

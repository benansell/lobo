module Tests exposing (all)

import Expect exposing (pass)
import Test exposing (Test, describe, test, todo)


all : Test
all =
    describe "todoTestSuite"
        [ todoTest
        , passingTest
        ]


todoTest : Test
todoTest =
    todo "todoTest"


passingTest : Test
passingTest =
    test "passingTest" <|
        \() ->
            Expect.pass

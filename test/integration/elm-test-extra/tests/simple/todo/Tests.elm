module Tests exposing (all)

import Expect exposing (pass)
import ElmTest.Extra exposing (Test, describe, test, todo, only, skip)


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

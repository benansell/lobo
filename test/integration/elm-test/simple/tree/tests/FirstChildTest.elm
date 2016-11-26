module FirstChildTest exposing (all)

import Expect exposing (pass)
import PassingGrandChildTest exposing (all)
import Test exposing (Test, describe, test)


all : Test
all =
    describe "FirstChildTest"
        [ PassingGrandChildTest.all
        , passingTest
        ]


passingTest : Test
passingTest =
    test "passingTest Child" <|
        \() ->
            Expect.pass

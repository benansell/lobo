module Tests exposing (all)


import Expect
import Test exposing (describe, test)

all =
    describe "all"
    [ passingTest ]

passingTest =
    test "passingTest" <|
        \() ->
            Expect.pass


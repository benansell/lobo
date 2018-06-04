module Tests exposing (all)


import Expect
import ElmTest.Extra exposing (describe, test)

all =
    describe "all"
    [ passingTest ]

passingTest =
    test "passingTest" <|
        \() ->
            Expect.pass


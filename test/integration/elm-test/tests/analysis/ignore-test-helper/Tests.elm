module Tests exposing (..)

import Expect exposing (pass)
import Test exposing (Test, describe, test)


testOne : Test
testOne =
    test "Test One" <|
        \() ->
            Expect.fail "foo"


testTwo : Test
testTwo =
    test "Test Two" <|
        \() ->
            expectationHelper "foo"


testThree : Test
testThree =
    describe "Test Three"
        [ testHelper "foo"
        ]


expectationHelper : String -> Expect.Expectation
expectationHelper text =
    Expect.equal "foo" text


testHelper : String -> Test
testHelper text =
    test text <|
        \() -> expectationHelper text


testArgCheck : { foo : String, bar : String } -> String
testArgCheck { foo, bar } =
    "foo"

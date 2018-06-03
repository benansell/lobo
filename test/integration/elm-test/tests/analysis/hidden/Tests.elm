module Tests exposing (passingTest)


import Expect
import Test exposing (Test, describe, test)


passingTest : Test
passingTest =
    test "passingTest" <|
        \() ->
            Expect.pass

hiddenTest : Test
hiddenTest =
    test "Hidden" <|
       \() ->
            Expect.pass


expectationHelper : String -> Expect.Expectation
expectationHelper text =
    Expect.equal "foo" text


testHelper : String -> Test
testHelper text =
    test text <|
     \() -> expectationHelper text


testArgCheck : {foo: String, bar: String} -> String
testArgCheck {foo, bar} =
    "foo"

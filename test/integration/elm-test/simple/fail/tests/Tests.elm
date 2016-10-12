module Tests exposing (all)

import Expect exposing (atLeast, atMost, equal, fail, false, greaterThan, notEqual, true)
import Fuzz exposing (string)
import Test exposing (Test, describe, fuzz, fuzzWith, fuzz2, test)


all : Test
all =
    describe "Tests"
        [ testExpectFail
        , testExpectTrue
        , testExpectFalse
        , testExpectEqualString
        , testExpectEqualFloat
        , testExpectEqualList
        , testExpectEqualRecord
        , testExpectNotEqual
        , testExpectLessThan
        , testExpectGreaterThan
        , testExpectAtLeast
        , testExpectAtMost
        , testFuzz
        , testFuzzWith
        , testFuzz2
        ]


testExpectFail : Test
testExpectFail =
    test "Expect.fail test" <|
        \() ->
            Expect.fail "Expected fail"

testExpectTrue : Test
testExpectTrue =
    test "Expect.true test" <|
        \() ->
            False
            |> Expect.true "Expected true"

testExpectFalse : Test
testExpectFalse =
    test "Expect.false test" <|
        \() ->
            True
            |> Expect.false "Expected false"

testExpectEqualString : Test
testExpectEqualString =
    test "Expect.equal string test" <|
        \() ->
            Expect.equal "fao" "foobar"

testExpectEqualFloat : Test
testExpectEqualFloat =
    test "Expect.equal float test" <|
        \() ->
            Expect.equal 23.456  132.466

testExpectEqualList : Test
testExpectEqualList =
    test "Expect.equal List test" <|
        \() ->
            Expect.equal [1,2,3]  [1,5,3,4]

testExpectEqualRecord : Test
testExpectEqualRecord =
    test "Expect.equal record test" <|
        \() ->
            Expect.equal { x = 1, y = 2 } { y = 2, x = 3 }

testExpectNotEqual : Test
testExpectNotEqual =
    test "Expect.notEqual test" <|
        \() ->
            Expect.notEqual "foobar" "foobar"

testExpectLessThan : Test
testExpectLessThan =
    test "Expect.lessThan test" <|
        \() ->
            Expect.lessThan 123 123

testExpectGreaterThan : Test
testExpectGreaterThan =
    test "Expect.greaterThan test" <|
        \() ->
            Expect.greaterThan 123 123

testExpectAtLeast : Test
testExpectAtLeast =
    test "Expect.atLeast test" <|
        \() ->
            Expect.atLeast 12 3

testExpectAtMost : Test
testExpectAtMost =
    test "Expect.atMost test" <|
        \() ->
            Expect.atMost 3 12


testFuzz : Test
testFuzz =
    fuzz string "fuzz test" <|
        \randomlyGeneratedString ->
            randomlyGeneratedString
                |> Expect.equal (randomlyGeneratedString ++ randomlyGeneratedString)

testFuzzWith : Test
testFuzzWith =
    fuzzWith { runs = 13 } string "fuzzWith test" <|
        \randomlyGeneratedString ->
            randomlyGeneratedString
                |> Expect.equal (randomlyGeneratedString ++ randomlyGeneratedString)

testFuzz2 : Test
testFuzz2 =
    fuzz2 string string "fuzz2 test" <|
        \left right ->
                Expect.equal left right

module Tests exposing (all)

import Expect exposing (atLeast, atMost, equal, fail, false, greaterThan, notEqual, true)
import Fuzz exposing (string)
import ElmTest.Extra exposing (Test, describe, fuzz, fuzzWith, fuzz2, test)


all : Test
all =
    describe "Tests"
        [ testExpectFail
        , testExpectTrue
        , testExpectFalse
        , testExpectEqualStringShort
        , testExpectEqualStringLong
        , testExpectEqualFloat
        , testExpectEqualFloatNegative
        , testExpectEqualFloatExponent
        , testExpectEqualFloatNaN
        , testExpectEqualFloatInfinite
        , testExpectEqualList
        , testExpectEqualRecord
        , testExpectEqualTypeUnion
        , testExpectEqualUnionDifferentRecords
        , testExpectEqualUnionDifferentRecordsNoCommonField
        , testExpectEqualUnionDifferentRecordsCommonField
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


testExpectEqualStringShort : Test
testExpectEqualStringShort =
    test "Expect.equal string test" <|
        \() ->
            Expect.equal "fao" "foobar"


testExpectEqualStringLong : Test
testExpectEqualStringLong =
    test "Expect.equal string test" <|
        \() ->
            Expect.equal "Plan steps for world domination with tail in the air dream about hunting birds or lounge in doorway so chew foot. Chase red laser dot. Hola te quiero kick up litter or sit on human thinking longingly about tuna brine howl on top of tall thing. When in doubt, wash eat and than sleep on your face, claws in your leg stare at ceiling light yet cats making all the muffins" "Plan steps for world domination with tail in the air dream about hunting mouse or lounge in doorway so chew foot. Watch red laser dot. Hola te quiero kick up litter or sit on human thinking longingly about tuna brine howl on top of tall thing. When in doubt, wash eat and than sleep on your face, claws in your leg stare at ceiling light yet cats making all the muffins"


testExpectEqualFloat : Test
testExpectEqualFloat =
    test "Expect.equal float test" <|
        \() ->
            Expect.equal 23.456 132.466


testExpectEqualFloatNegative : Test
testExpectEqualFloatNegative =
    test "Expect.equal float test" <|
        \() ->
            Expect.equal -123.456 132.466


testExpectEqualFloatExponent : Test
testExpectEqualFloatExponent =
    test "Expect.equal float test" <|
        \() ->
            Expect.equal 1.234e122 123


testExpectEqualFloatNaN : Test
testExpectEqualFloatNaN =
    test "Expect.equal float test" <|
        \() ->
            Expect.equal 123 (sqrt -1)


testExpectEqualFloatInfinite : Test
testExpectEqualFloatInfinite =
    test "Expect.equal float test" <|
        \() ->
            Expect.equal 123 (1 / 0)


testExpectEqualList : Test
testExpectEqualList =
    test "Expect.equal List test" <|
        \() ->
            Expect.equal [ 1, 2, 3 ] [ 1, 3, 2 ]


testExpectEqualRecord : Test
testExpectEqualRecord =
    test "Expect.equal record test mixed order" <|
        \() ->
            Expect.equal { x = 1, y = 2 } { y = 2, x = 3 }


type Status
    = Waiting (Maybe Bool)
    | Fault String Bool
    | Go { id : Int }
    | Hold { id : Int, version : String }
    | Pause { id : Int, name : String, version : String }
    | Stop { name : String }


testExpectEqualTypeUnion : Test
testExpectEqualTypeUnion =
    test "Expect.equal union test" <|
        \() ->
            Expect.equal (Waiting <| Just True) (Fault "foo" True)


testExpectEqualUnionDifferentRecords : Test
testExpectEqualUnionDifferentRecords =
    test "Expect.equal different record test" <|
        \() ->
            Expect.equal (Hold <| { id = 1, version = "bar" }) (Stop { name = "foo" })


testExpectEqualUnionDifferentRecordsNoCommonField : Test
testExpectEqualUnionDifferentRecordsNoCommonField =
    test "Expect.equal different record no common field test" <|
        \() ->
            Expect.equal (Go { id = 2 }) (Stop { name = "baz" })


testExpectEqualUnionDifferentRecordsCommonField : Test
testExpectEqualUnionDifferentRecordsCommonField =
    test "Expect.equal different record common field test" <|
        \() ->
            Expect.equal (Pause { id = 2, name = "foo", version = "bar" }) (Hold <| { id = 1, version = "baz" })


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

module Tests exposing (all)

import Dict
import ElmTest.Extra exposing (Test, describe, fuzz, fuzzWith, fuzz2, test)
import Expect exposing (atLeast, atMost, equal, fail, false, greaterThan, notEqual, true)
import Fuzz exposing (string)
import Set


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
        , testExpectEqualTuple
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
        , testExpectEqualLists
        , testExpectEqualDicts
        , testExpectEqualSets
        , testFuzz
        , testFuzzWith
        , testFuzz2
        , testMultiLine
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


testExpectEqualTuple : Test
testExpectEqualTuple =
    test "Expect.equal Tuple test" <|
        \() ->
            Expect.equal ( 1, "foo" ) ( 1, "bar" )


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


testExpectEqualLists : Test
testExpectEqualLists =
    test "Expect.equalLists test" <|
        \() ->
            Expect.equalLists [ 1, 2, 3 ] [ 1, 5, 3, 4 ]


testExpectEqualDicts : Test
testExpectEqualDicts =
    test "Expect.equalDicts test" <|
        \() ->
            Expect.equalDicts (Dict.fromList [ ( 1, "one" ), ( 2, "two" ), ( 3, "three" ) ]) (Dict.fromList [ ( 1, "one" ), ( 5, "five" ), ( 3, "three" ), ( 4, "four" ) ])


testExpectEqualSets : Test
testExpectEqualSets =
    test "Expect.equalSets test" <|
        \() ->
            Expect.equalSets (Set.fromList [ 1, 2, 3 ]) (Set.fromList [ 1, 5, 3, 4 ])


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


type alias Todo =
    { outstanding : List TodoItem
    , archived : List TodoItem
    , active : Maybe Bool
    }


type alias TodoItem =
    { id : Int
    , name : String
    , description : String
    , status : TodoItemStatus
    }


type TodoItemStatus
    = NotStarted
    | Done


testMultiLine : Test
testMultiLine =
    test "multiline record test" <|
        \() ->
            Expect.equal ({ outstanding = [ { id = 1, name = "foo", description = "read a book", status = NotStarted }, { id = 2, name = "bar", description = "sleep", status = NotStarted } ], archived = [ { id = 3, name = "baz", description = "watch tv", status = NotStarted } ], active = Nothing }) ({ outstanding = [ { id = 1, name = "foo", description = "read a book", status = Done }, { id = 4, name = "baz", description = "sleep!", status = Done } ], archived = [], active = Just True })

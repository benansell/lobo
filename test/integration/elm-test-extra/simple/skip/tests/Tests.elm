module Tests exposing (all)

import Expect exposing (pass)
import Fuzz exposing (int, list)
import ElmTest.Extra exposing (Test, describe, focus, fuzz, skip, test)


all : Test
all =
    describe "skipTestSuite"
        [ skippedTest
        , skippedSuiteContainingFocus
        , passingTest
        , skipFuzzTest
        ]


skippedTest : Test
skippedTest =
    skip "ignore test" <|
        test "skippedTest" <|
            \() ->
                Expect.fail "Never runs"


skippedSuiteContainingFocus : Test
skippedSuiteContainingFocus =
    skip "ignore suite" <|
        describe "skippedSuite"
            [ normalTest
            , focusTest
            ]


normalTest : Test
normalTest =
    test "normalTest" <|
        \() ->
            Expect.fail "Never runs"


focusTest : Test
focusTest =
    focus <|
        test "focusTest" <|
            \() ->
                Expect.fail "Never runs"


passingTest : Test
passingTest =
    test "passingTest" <|
        \() ->
            Expect.pass


skipFuzzTest : Test
skipFuzzTest =
    skip "ignore test" <|
        fuzz (list int) "focusFuzzTest" <|
            \xs ->
                Expect.fail "Never runs"

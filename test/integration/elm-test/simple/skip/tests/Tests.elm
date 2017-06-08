module Tests exposing (all)

import Expect exposing (pass)
import Fuzz exposing (int, list)
import Test exposing (Test, describe, fuzz, only, skip, test, todo)


all : Test
all =
    describe "skipTestSuite"
        [ skippedTest
        , skippedSuiteContainingFocus
        , passingTest
        , skipFuzzTest
        , skipTodoTest
        ]


skippedTest : Test
skippedTest =
    skip <|
        test "skippedTest" <|
            \() ->
                Expect.fail "Never runs"


skippedSuiteContainingFocus : Test
skippedSuiteContainingFocus =
    skip <|
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
    only <|
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
    skip <|
        fuzz (list int) "focusFuzzTest" <|
            \xs ->
                Expect.fail "Never runs"


skipTodoTest : Test
skipTodoTest =
    skip <| todo "todoTest"

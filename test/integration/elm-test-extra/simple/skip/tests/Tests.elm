module Tests exposing (all)

import Expect exposing (pass)
import Fuzz exposing (int, list)
import ElmTest.Extra exposing (Test, describe, fuzz, only, skip, test, todo)


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
    skip "ignore test" <|
        test "skippedTest" <|
            \() ->
                Expect.fail "Never runs"


skippedSuiteContainingFocus : Test
skippedSuiteContainingFocus =
    skip "ignore suite" <|
        describe "skippedSuite"
            [ normalTest
            , onlyTest
            ]


normalTest : Test
normalTest =
    test "normalTest" <|
        \() ->
            Expect.fail "Never runs"


onlyTest : Test
onlyTest =
    only <|
        test "onlyTest" <|
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


skipTodoTest : Test
skipTodoTest =
    skip "skip todo test" <| todo "todoTest"

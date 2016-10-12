module Tests exposing (all)

import Expect exposing (pass)
import Fuzz exposing (int, list)
import ElmTest.Extra exposing (Test, describe, focus, fuzz, skip, test)


all : Test
all =
    describe "focusTestSuite"
        [ focusTest
        , focusSuiteContainingSkipped
        , passingTest
        , focusFuzzTest
        ]


focusTest : Test
focusTest =
    focus <|
        test "focusTest" <|
            \() ->
                Expect.pass


focusSuiteContainingSkipped : Test
focusSuiteContainingSkipped =
    focus <|
        describe "focusSuite"
            [ normalTest
            , skippedTest
            ]


normalTest : Test
normalTest =
    test "normalTest" <|
        \() ->
            Expect.pass


skippedTest : Test
skippedTest =
    skip "ignore test" <|
        test "skippedTest" <|
            \() ->
                Expect.fail "Never runs"


passingTest : Test
passingTest =
    test "passingTest" <|
        \() ->
            Expect.fail "Never runs"


focusFuzzTest : Test
focusFuzzTest =
    focus <|
        fuzz (list int) "focusFuzzTest" <|
            \xs ->
                List.sort xs
                    |> List.length
                    |> Expect.equal (List.length xs)
                    |> Debug.log "focusFuzzTest"

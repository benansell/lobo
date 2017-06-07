module Tests exposing (all)

import Expect exposing (pass)
import Fuzz exposing (int, list)
import Test exposing (Test, describe, fuzz, only, skip, test)


all : Test
all =
    describe "onlyTestSuite"
        [ onlyTest
        , onlySuiteContainingSkipped
        , passingTest
        , onlyFuzzTest
        ]


onlyTest : Test
onlyTest =
    only <|
        test "onlyTest" <|
            \() ->
                Expect.pass


onlySuiteContainingSkipped : Test
onlySuiteContainingSkipped =
    only <|
        describe "onlySuite"
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
    skip <|
        test "skippedTest" <|
            \() ->
                Expect.fail "Never runs"


passingTest : Test
passingTest =
    test "passingTest" <|
        \() ->
            Expect.fail "Never runs"


onlyFuzzTest : Test
onlyFuzzTest =
    only <|
        fuzz (list int) "onlyFuzzTest" <|
            \xs ->
                List.sort xs
                    |> List.length
                    |> Expect.equal (List.length xs)
                    |> Debug.log "onlyFuzzTest"

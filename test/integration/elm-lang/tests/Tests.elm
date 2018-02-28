module Tests exposing (all)

import Expect exposing (pass)
import ImportCheck
import ImportNavigation
import Test exposing (Test, describe, test)


all : Test
all =
    describe "Tests"
        [ testImportCheck
        , testImportNavigation
        ]


testImportCheck : Test
testImportCheck =
    test "test import check" <|
        \() ->
            Expect.true "truthy" ImportCheck.truthy


testImportNavigation : Test
testImportNavigation =
    test "test import navigation" <|
        \() ->
            ImportNavigation.update ImportNavigation.None {}
                |> Tuple.second
                |> Expect.equal Cmd.none

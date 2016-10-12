module FuzzyChildTest exposing (all)

import Expect exposing (pass)
import Fuzz exposing (int, list)
import Test exposing (Test, describe, fuzz)


all : Test
all =
    describe "FuzzyChildTests"
        [ fuzz (list int) "SortedListLength" <|
            \xs ->
                List.sort xs
                |> List.length
                |> Expect.equal (List.length xs)
        ]

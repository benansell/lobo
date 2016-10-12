module Tests exposing (all)

import Array exposing (initialize, toList)
import Expect exposing (equal)
import List exposing (map)
import ElmTest.Extra exposing (Test, describe, test)


all : Test
all =
    Array.initialize
        1000
        identity
        |> Array.toList
        |> List.map toTest
        |> describe "Tests"


toTest : Int -> Test
toTest num =
    "test "
        ++ toString num
        |> repeatedTest


repeatedTest : String -> Test
repeatedTest label =
    test label <|
        \() ->
            Expect.equal 1 1

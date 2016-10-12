module Tests exposing (all)

import Expect exposing (equal)
import Fuzz exposing (int, list, string)
import String exposing (reverse)
import Test exposing (Test, describe, fuzz, fuzzWith, fuzz2)


all : Test
all =
    describe "Tests"
        [ stringReverseTest
        , listLengthTest
        , fuzzWithTest
        , fuzz2Test
        ]


stringReverseTest : Test
stringReverseTest =
    fuzz string "fuzzingTest" <|
        \randomlyGeneratedString ->
            randomlyGeneratedString
                |> String.reverse
                |> String.reverse
                |> Expect.equal randomlyGeneratedString
                |> Debug.log "fuzzingTest-Executed"


listLengthTest : Test
listLengthTest =
    fuzz (list int) "listLengthTest" <|
        \xs ->
            List.sort xs
                |> List.length
                |> Expect.equal (List.length xs)
                |> Debug.log "listLengthTest-Executed"


fuzzWithTest : Test
fuzzWithTest =
    fuzzWith { runs = 13 } int "fuzzWithTest" <|
        \x ->
            List.member x [ x ]
                |> Expect.true "x is not part of the list"
                |> Debug.log "fuzzWithTest-Executed"


fuzz2Test : Test
fuzz2Test =
    fuzz2 string string "fuzz2Test" <|
        \left right ->
            (left ++ right)
                |> String.length
                |> Expect.equal (String.length left + String.length right)
                |> Debug.log "fuzz2Test-Executed"

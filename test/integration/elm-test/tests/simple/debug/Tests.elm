module Tests exposing (all)

import Expect exposing (equal)
import Test exposing (Test, describe, test)


all : Test
all =
    describe "Tests"
        [ testDebugFail
        , testDebugPass
        ]


testDebugPass : Test
testDebugPass =
    test "passing Debug.log test" <|
        \() ->
            toGreeting "Foo"
            |> Expect.equal "Hello Foo"


testDebugFail : Test
testDebugFail =
    test "failing Debug.log test" <|
        \() ->
            toGreeting "Bar"
            |> Expect.equal "Hello Foo"


toGreeting: String -> String
toGreeting name =
    "Hello " ++ name
    |> Debug.log name

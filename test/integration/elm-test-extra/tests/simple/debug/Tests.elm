module Tests exposing (..)

import Expect exposing (equal)
import ElmTest.Extra exposing (Test, describe, test)

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

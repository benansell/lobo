module Duplicate.Duplicate exposing (..)

import Expect
import Test exposing (Test, describe, test)

passingTest : Test
passingTest =
    test "passingTest" <|
        \() ->
            Expect.pass

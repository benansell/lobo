module Tests exposing (..)

import Expect exposing
    ( pass
    )
import Test exposing (Test, describe, test


passingTest : Test
passingTest =
    test "passingTest" <|
        \() ->
            pass

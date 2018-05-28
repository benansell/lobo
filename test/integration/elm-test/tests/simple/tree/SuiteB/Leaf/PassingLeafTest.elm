module SuiteB.Leaf.PassingLeafTest exposing (..)

import Expect exposing (pass)
import Test exposing (Test, describe, test)


passingTest : Test
passingTest =
    test "PassingTest - Grandchild" <|
        \() ->
            Expect.pass

module Tests exposing (all)

import Test exposing (Test, describe)
import ChildTest exposing (all)


all : Test
all =
    describe "Tests"
        [ ChildTest.all ]

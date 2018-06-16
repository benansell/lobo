module Tests exposing (all)

import ChildTest exposing (all)
import Test exposing (Test, describe)


all : Test
all =
    describe "Tests"
        [ ChildTest.all ]

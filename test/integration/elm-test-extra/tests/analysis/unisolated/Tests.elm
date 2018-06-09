module Tests exposing (all)

import ElmTest.Extra exposing (Test, describe)
import ChildTest exposing (all)


all : Test
all =
    describe "Tests"
        [ ChildTest.all ]

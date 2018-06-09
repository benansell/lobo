module ChildTest exposing (all)

import GrandChildTest exposing (all)
import ElmTest.Extra exposing (Test, describe, test)


all : Test
all =
    describe "ChildTest"
        [ GrandChildTest.all ]

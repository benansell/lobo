module Tests exposing (..)


import Expect
import Test exposing (Test, concat, describe, test)

testConcat: Test
testConcat =
    concat []


testDescribe : Test
testDescribe =
    describe "Test Describe"
        []

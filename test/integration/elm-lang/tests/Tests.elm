module Tests exposing (..)

import Expect exposing (pass)
import ImportCheck
import ImportNavigation
import ImportWebGL
import Test exposing (Test, describe, test)
import Url


testImportCheck : Test
testImportCheck =
    test "test import check" <|
        \() ->
            Expect.true "truthy" ImportCheck.truthy


testImportNavigation : Test
testImportNavigation =
    test "test import navigation" <|
        \() ->
            ImportNavigation.update ImportNavigation.None { route = Nothing }
                |> Tuple.second
                |> Expect.equal Cmd.none


testImportNavigationInit : Test
testImportNavigationInit =
    test "test import navigation init" <|
        \() ->
            { fragment = Just "qux"
            , host = "example.com:123"
            , protocol = Url.Http
            , port_ = Just 123
            , path = "/foo/bar"
            , query = Just "id=baz"
            }
                |> ImportNavigation.init
                |> Tuple.second
                |> Expect.equal Cmd.none

testImportWebGL : Test
testImportWebGL =
    test "test import WebGL" <|
        \() ->
            Expect.true "truthy" ImportWebGL.truthy

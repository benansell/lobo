module Tests exposing (..)

import Expect exposing (pass)
import ImportCheck
import ImportNavigation
import ImportWebGL
import Test exposing (Test, describe, test)


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
            { href = "https://somebody:secret@example.com:123/foo/bar?id=baz#qux"
            , host = "example.com:123"
            , hostname = "example.com"
            , protocol = "https"
            , origin = "https://example.com"
            , port_ = "123"
            , pathname = "/foo/bar"
            , search = "?id=baz"
            , hash = "#qux"
            , username = "somebody"
            , password = "secret"
            }
                |> ImportNavigation.init
                |> Tuple.second
                |> Expect.equal Cmd.none

testImportWebGL : Test
testImportWebGL =
    test "test import WebGL" <|
        \() ->
            Expect.true "truthy" ImportWebGL.truthy

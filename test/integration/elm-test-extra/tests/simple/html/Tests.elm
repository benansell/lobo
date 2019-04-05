module Tests exposing (..)

import Expect
import Html exposing (div, li, text, ul)
import Html.Attributes exposing (class)
import Html.Events exposing (onInput)
import Json.Encode as Encode exposing (Value)
import ElmTest.Extra exposing (Test, test)
import Test.Html.Event as Event
import Test.Html.Query as Query
import Test.Html.Selector exposing (classes, tag)

type Msg
    = Change String


testQueryCount : Test
testQueryCount =
    test "Query.count test" <|
        \() ->
            div []
                [ ul []
                    [ li [] [ text "foo" ]
                    , li [] [ text "bar" ]
                    , li [] [ text "baz" ]
                    ]
                ]
                |> Query.fromHtml
                |> Query.findAll [ tag "li" ]
                |> Query.count (Expect.equal 2)


testQueryContains : Test
testQueryContains =
    test "Query.contains test" <|
        \() ->
            div []
                [ ul []
                    [ li [] [ text "foo" ]
                    , li [] [ text "bar" ]
                    , li [] [ text "baz" ]
                    ]
                ]
                |> Query.fromHtml
                |> Query.contains [ li [] [text "qux"] ]


testQueryEach : Test
testQueryEach =
    test "Query.each test" <|
        \() ->
            div []
                [ ul []
                    [ li [class "foo"] [ text "a" ]
                    , li [class "bar"] [ text "b" ]
                    , li [class "baz"] [ text "c" ]
                    ]
                ]
                |> Query.fromHtml
                |> Query.findAll [tag "li"]
                |> Query.each
                    (Expect.all
                        [ Query.has [classes ["qux"]]]
                    )

testQueryHas : Test
testQueryHas =
    test "Query.has test" <|
        \() ->
            Html.button [class "foo"] [ Html.text "bar" ]
                |> Query.fromHtml
                |> Query.has [ classes ["baz"] ]


testQueryHasNot : Test
testQueryHasNot =
    test "Query.hasNot test" <|
        \() ->
            Html.button [class "foo" ] [ Html.text "bar" ]
                |> Query.fromHtml
                |> Query.hasNot [ classes ["foo"] ]



testEventExpect : Test
testEventExpect =
    test "Event.expect test" <|
        \() ->
            Html.input [ onInput Change ] [ ]
                |> Query.fromHtml
                |> Event.simulate (Event.input "foo")
                |> Event.expect (Change "bar")


testEventSimulate : Test
testEventSimulate =
    test "Event.simulate test" <|
        \() ->
            let
                simulatedEventObject : Value
                simulatedEventObject =
                    Encode.object
                        [ ( "foo"
                          , Encode.object [ ( "value", Encode.string "bar" ) ]
                          )
                        ]
            in
                Html.input [ onInput Change ] [ ]
                    |> Query.fromHtml
                    |> Event.simulate (Event.custom "input" simulatedEventObject)
                    |> Event.expect (Change "baz")

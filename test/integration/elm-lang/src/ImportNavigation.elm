module ImportNavigation exposing (..)

{--
 Test for a file that contains Navigation.program

 Note: Internally Browser.application calls Browser.geUrl that assumes the
 global object document.location exists
 --}

import Html exposing (Html, div)
import Browser exposing (Document, UrlRequest, application)
import Browser.Navigation exposing (Key)
import Url exposing (Url)
import Url.Parser



-- PROGRAM


main : Program Int Model Msg
main =
       application { view = view
        , init = (\_ url key -> init url)
        , update = update
        , subscriptions = always Sub.none
        , onUrlRequest = RequestUrl
        , onUrlChange = ChangedUrl
        }



-- MODEL


type alias Model =
    { route : Maybe Route }


type Route
    = AppRoute


routeParser : Url.Parser.Parser (Route -> a) a
routeParser =
    Url.Parser.s "foo"
        |> Url.Parser.map AppRoute


parseLocation : Url -> Maybe Route
parseLocation location =
    Url.Parser.parse routeParser location


init : Url -> ( Model, Cmd Msg )
init location =
    ( { route = parseLocation location }, Cmd.none )



-- UPDATE


type Msg
    = None
    | ChangedUrl Url
    | RequestUrl UrlRequest


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    ( model, Cmd.none )


-- VIEW


view : Model -> Document Msg
view model =
    { title = "foo"
    , body = []
    }

module ImportNavigation exposing (..)

{--
 Test for a file that contains Navigation.program

 Note: Internally Navigation.program calls Navigation.getLocation that assumes the
 global object document.location exists
 --}

import Html exposing (Html, div)
import Navigation


-- PROGRAM


main : Program Never Model Msg
main =
    Navigation.program OnLocationChange
        { view = view
        , init = init
        , update = update
        , subscriptions = always Sub.none
        }



-- MODEL


type alias Model =
    {}


init : Navigation.Location -> ( Model, Cmd Msg )
init location =
    ( {}, Cmd.none )



-- UPDATE


type Msg
    = None
    | OnLocationChange Navigation.Location


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    ( model, Cmd.none )



-- VIEW


view : Model -> Html Msg
view model =
    div []
        []

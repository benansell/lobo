module ImportCheck exposing (..)

-- Test native polyfills exist for all elm-lang libs

import AnimationFrame
import Dom
import Geolocation
import Keyboard
import Mouse
import Navigation
import PageVisibility
import Svg
import Trampoline
import VirtualDom
import WebSocket
import Window


truthy : Bool
truthy =
    True

import "@expo/metro-runtime";
import "react-native-gesture-handler";
import "react-native-reanimated";

import MapboxGL from "@rnmapbox/maps";
import { EXPO_PUBLIC_MAPBOX_TOKEN, NEXT_PUBLIC_MAPBOX_TOKEN } from "@env";

import { registerRootComponent } from "expo";

import App from "./App";

const mapboxToken = (EXPO_PUBLIC_MAPBOX_TOKEN || NEXT_PUBLIC_MAPBOX_TOKEN || "").trim();
if (mapboxToken) {
  MapboxGL.setAccessToken(mapboxToken);
} else {
  console.warn(
    "Mapbox access token is not set (EXPO_PUBLIC_MAPBOX_TOKEN or NEXT_PUBLIC_MAPBOX_TOKEN)."
  );
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

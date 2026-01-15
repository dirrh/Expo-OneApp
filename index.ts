import "@expo/metro-runtime";
import "react-native-gesture-handler";
import "react-native-reanimated";

import { Platform } from "react-native";

// Import expo-asset early to ensure native module is loaded
// This is required for asset loading (images, fonts) in SDK 51
// Must be imported before expo-font or any asset usage
import "expo-asset";
import { EXPO_PUBLIC_MAPBOX_TOKEN, NEXT_PUBLIC_MAPBOX_TOKEN } from "@env";

import { registerRootComponent } from "expo";

import App from "./App";

// Initialize Mapbox only on native platforms (web support may have issues)
if (Platform.OS !== 'web') {
  try {
    const MapboxGL = require("@rnmapbox/maps").default;
    const mapboxToken = (EXPO_PUBLIC_MAPBOX_TOKEN || NEXT_PUBLIC_MAPBOX_TOKEN || "").trim();
    if (mapboxToken) {
      MapboxGL.setAccessToken(mapboxToken);
    } else {
      console.warn(
        "Mapbox access token is not set (EXPO_PUBLIC_MAPBOX_TOKEN or NEXT_PUBLIC_MAPBOX_TOKEN)."
      );
    }
  } catch (error) {
    console.warn("Failed to initialize Mapbox:", error);
  }
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

import "@expo/metro-runtime";
import "react-native-gesture-handler";
import "react-native-reanimated";
import "./lib/shims/reanimated";


// Import expo-asset early to ensure native module is loaded
// This is required for asset loading (images, fonts) in SDK 51
// Must be imported before expo-font or any asset usage
import "expo-asset";
import { registerRootComponent } from "expo";

import App from "./App";

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

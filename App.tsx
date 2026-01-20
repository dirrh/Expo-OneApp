import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ActivityIndicator, StatusBar, View, Platform } from "react-native";

import Tabs from "./components/Tabs";
import SubscriptionActivationScreen from "./screens/profile/SubscriptionActivationScreen";
import FavoriteBranchesScreen from "./screens/FavoriteBranchesScreen";
import SettingsScreen from "./screens/profile/SettingsScreen";
import UserAccountScreen from "./screens/profile/UserAccountScreen"
import LanguageScreen from "./screens/profile/LanguageScreen";

import SignupScreen from "./screens/LoginRegister/SignupScreen";
import ForgottenPasswordScreen from "./screens/LoginRegister/ForgotPasswordScreen";
import LoginScreen from "./screens/LoginRegister/LoginScreen";
import OnboardingScreen from "./screens/OnboardingScreen";

import SavedLocationsScreen from "./screens/profile/SavedLocationsScreen";
import EditLocationScreen from "./screens/profile/EditLocationScreen";
import DiscoverScreen from "./screens/DiscoverScreen";

import { TextEncoder, TextDecoder } from "text-encoding";
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { SafeAreaProvider } from "react-native-safe-area-context";

import "./i18n";
import BusinessDetailScreen from "./screens/BusinessDetailScreen";

// AUTH
import { AuthProvider } from "./lib/AuthContext";
//AUTH

if (typeof global.TextEncoder === "undefined") {
  // @ts-ignore
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === "undefined") {
  // @ts-ignore
  global.TextDecoder = TextDecoder;
}

const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          {Platform.OS !== 'web' && (
            <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
          )}
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          {Platform.OS !== 'web' && (
            <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
          )}
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Tabs" component={Tabs} />
              <Stack.Screen
                name="SubscriptionActivation"
                component={SubscriptionActivationScreen}
              />
              <Stack.Screen
                name="FavoriteBranches"
                component={FavoriteBranchesScreen}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
              />
              <Stack.Screen
                name="UserAccount"
                component={UserAccountScreen}
              />
              <Stack.Screen
                name="Language"
                component={LanguageScreen}
              />
              <Stack.Screen
                name="BusinessDetailScreen"
                component={BusinessDetailScreen}
              />
              <Stack.Screen
                name="Signup"
                component={SignupScreen}
              />
              <Stack.Screen
                name="ForgottenPassword"
                component={ForgottenPasswordScreen}
              />
              <Stack.Screen
                name="Login"
                component={LoginScreen}
              />
              <Stack.Screen
                name="Onboarding"
                component={OnboardingScreen}
              />
              <Stack.Screen
                name="SavedLocations"
                component={SavedLocationsScreen}
              />
              <Stack.Screen name="Discover" component={DiscoverScreen} />
              <Stack.Screen name="EditLocation" component={EditLocationScreen}/>
            </Stack.Navigator>
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
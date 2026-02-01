import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ActivityIndicator, StatusBar, View, Platform, Text, TextInput, StyleSheet } from "react-native";

import Tabs from "./components/Tabs";
import SubscriptionActivationScreen from "./screens/profile/SubscriptionActivationScreen";
import FavoriteBranchesScreen from "./screens/FavoriteBranchesScreen";
import SettingsScreen from "./screens/profile/SettingsScreen";
import UserAccountScreen from "./screens/profile/UserAccountScreen"
import LanguageScreen from "./screens/profile/LanguageScreen";
import BenefitsScreen from "./screens/BenefitsScreen";

import SignupScreen from "./screens/LoginRegister/SignupScreen";
import ForgottenPasswordScreen from "./screens/LoginRegister/ForgotPasswordScreen";
import LoginScreen from "./screens/LoginRegister/LoginScreen";
import OnboardingScreen from "./screens/OnboardingScreen";

import SavedLocationsScreen from "./screens/profile/SavedLocationsScreen";
import EditLocationScreen from "./screens/profile/EditLocationScreen";
import DiscoverScreen from "./screens/DiscoverScreen";
import DiscoverListScreen from "./screens/DiscoverListScreen";
import ShowMoreScreen from "./screens/ShowMoreScreen";

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

// Globálne nastavenie Inter fontu pre všetky Text a TextInput komponenty
let defaultFontsPatched = false;
const setDefaultFonts = () => {
  if (defaultFontsPatched) {
    return;
  }
  defaultFontsPatched = true;

  const mergeDefaultFont = (style: any) => {
    const resolved = StyleSheet.flatten(style) || {};
    if (resolved.fontFamily) {
      return resolved;
    }
    return { ...resolved, fontFamily: "Inter_400Regular" };
  };

  const patchRender = (Component: any) => {
    if (!Component?.render) {
      return;
    }
    const oldRender = Component.render;
    Component.render = function (...args: any[]) {
      const origin = oldRender.call(this, ...args);
      if (!React.isValidElement(origin)) {
        return origin;
      }
      const element = origin as React.ReactElement<any>;
      return React.cloneElement(element, {
        style: mergeDefaultFont(element.props?.style),
      });
    };
  };

  patchRender(Text as any);
  patchRender(TextInput as any);
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Nastaví Inter font po načítaní fontov
  React.useEffect(() => {
    if (fontsLoaded) {
      setDefaultFonts();
    }
  }, [fontsLoaded]);

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
                name="Benefits"
                component={BenefitsScreen}
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
              <Stack.Screen name="DiscoverList" component={DiscoverListScreen} />
              <Stack.Screen name="ShowMore" component={ShowMoreScreen} />
              <Stack.Screen name="EditLocation" component={EditLocationScreen}/>
            </Stack.Navigator>
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

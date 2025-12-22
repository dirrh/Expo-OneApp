import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ActivityIndicator, View } from "react-native";

import Tabs from "./components/Tabs";
import SubscriptionActivationScreen from "./screens/SubscriptionActivationScreen";
import FavoriteBranchesScreen from "./screens/FavoriteBranchesScreen";
import SettingsScreen from "./screens/SettingsScreen";
import UserAccountScreen from "./screens/UserAccountScreen"
import LanguageScreen from "./screens/LanguageScreen";


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
import BusinessDetail from "./screens/BusinessDetail";


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
            name="BusinessDetail"
            component={BusinessDetail}
            ></Stack.Screen>
            
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ActivityIndicator, View, Platform, StyleSheet } from "react-native";

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

  const content = (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
        
          <Stack.Screen name="Tabs" component={Tabs} />

<<<<<<< Updated upstream
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
=======
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
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webWrapper}>
        <GestureHandlerRootView style={styles.webContainer}>
          {content}
        </GestureHandlerRootView>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      {content}
>>>>>>> Stashed changes
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  webContainer: {
    width: 375,
    maxWidth: '100%',
    height: '100%',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
  },
});

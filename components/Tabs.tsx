import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import CustomTabBar from "./CustomTabBar";

import HomeScreen from "../screens/HomeScreen";
import CardsStack from "./CardsStack";
import FeedScreen from "../screens/FeedScreen";
import DiscoverScreen from "../screens/DiscoverScreen";
import DiscoverListScreen from "../screens/DiscoverListScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import ProtectedRoute from "./ProtectedRoute";
import { useTranslation } from "react-i18next";

const Tab = createBottomTabNavigator();

/**
 * Tabs: Skladá spodnú tab navigáciu a mapuje obrazovky na jednotlivé sekcie aplikácie.
 *
 * Prečo: Jedno centrálne miesto pre poradie tabov znižuje riziko, že sa navigácia rozíde medzi obrazovkami.
 */
export default function Tabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      
      <Tab.Screen name="Cards" options={{ tabBarLabel: t("Cards") }}>
        {() => (
          <ProtectedRoute>
            <CardsStack />
          </ProtectedRoute>
        )}
      </Tab.Screen>

      
      <Tab.Screen name="Feed" component={FeedScreen} options={{ tabBarLabel: t("Feed") }} />
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t("Home") }} />
      <Tab.Screen name="Discover" component={DiscoverScreen} options={{ tabBarLabel: t("Discover") }} />
      <Tab.Screen
        name="DiscoverList"
        component={DiscoverListScreen}
        options={{ tabBarButton: () => null }}
      />

      
      <Tab.Screen name="Profile" options={{ tabBarLabel: t("Profile") }}>
        {() => (
          <ProtectedRoute>
            <ProfileScreen />
          </ProtectedRoute>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

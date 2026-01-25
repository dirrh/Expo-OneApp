import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import CustomTabBar from "./CustomTabBar";

import HomeScreen from "../screens/HomeScreen";
import FeedScreen from "../screens/FeedScreen";
import DiscoverScreen from "../screens/DiscoverScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import ProtectedRoute from "./ProtectedRoute";
import { useTranslation } from "react-i18next";

const Tab = createBottomTabNavigator();

export default function Tabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {/* CHRÁNENÝ - vyžaduje prihlásenie */}
      <Tab.Screen name="QR">
        {() => (
          <ProtectedRoute>
            <HomeScreen />
          </ProtectedRoute>
        )}
      </Tab.Screen>

      {/* VEREJNÉ - bez prihlásenia */}
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Home" component={FeedScreen} />
      <Tab.Screen name={t("Discover")} component={DiscoverScreen} />

      {/* CHRÁNENÝ - vyžaduje prihlásenie */}
      <Tab.Screen name={t("Profile")}>
        {() => (
          <ProtectedRoute>
            <ProfileScreen />
          </ProtectedRoute>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
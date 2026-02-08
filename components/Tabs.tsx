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

export default function Tabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {/* Protected - requires login */}
      <Tab.Screen name={t("Cards")}>
        {() => (
          <ProtectedRoute>
            <CardsStack />
          </ProtectedRoute>
        )}
      </Tab.Screen>

      {/* Public */}
      <Tab.Screen name={t("Feed")} component={FeedScreen} />
      <Tab.Screen name={t("Home")} component={HomeScreen} />
      <Tab.Screen name={t("Discover")} component={DiscoverScreen} />
      <Tab.Screen
        name="DiscoverList"
        component={DiscoverListScreen}
        options={{ tabBarButton: () => null }}
      />

      {/* Protected - requires login */}
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

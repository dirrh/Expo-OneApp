import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import CustomTabBar from "./CustomTabBar";

import HomeScreen from "../screens/HomeScreen";
import BenefitsScreen from "../screens/BenefitsScreen";
import DiscoverScreen from "../screens/DiscoverScreen";
import ProfileDecider from "../screens/profile/ProfileDecider";
import { useTranslation } from "react-i18next";

const Tab = createBottomTabNavigator();

export default function Tabs() {

  const { t } = useTranslation();

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="QR" component={HomeScreen} />
      <Tab.Screen name={t("Benefits")} component={BenefitsScreen} />
      <Tab.Screen name={t("Discover")} component={DiscoverScreen} />
      <Tab.Screen name={t("Profile")} component={ProfileDecider} />
    </Tab.Navigator>
  );
}

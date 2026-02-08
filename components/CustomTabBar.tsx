import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_BASE_HEIGHT, TAB_BAR_MIN_INSET } from "../lib/constants/layout";

type TabIconName = "cards" | "feed" | "home" | "discover" | "profile";

type TabItem = {
  route: any;
  routeIndex: number;
  label: string;
  tabKey: TabIconName | null;
  isHidden: boolean;
};

const TAB_ICONS: Record<TabIconName, keyof typeof Ionicons.glyphMap> = {
  cards: "scan-outline",
  feed: "play-circle-outline",
  home: "home-outline",
  discover: "location-outline",
  profile: "person-outline",
};

const resolveLabel = (options: any, route: any): string => {
  if (options.tabBarLabel !== undefined) {
    return String(options.tabBarLabel);
  }
  if (options.title !== undefined) {
    return String(options.title);
  }
  return String(route.name);
};

const resolveTabKey = (routeName: string, label: string): TabIconName | null => {
  const name = routeName.toLowerCase();
  const lbl = label.toLowerCase();

  if (name === "cards" || name === "karty" || lbl === "cards" || lbl === "karty") {
    return "cards";
  }

  if (name === "feed" || lbl === "feed") {
    return "feed";
  }

  if (name === "home" || name === "domov" || lbl === "home" || lbl === "domov") {
    return "home";
  }

  if (
    name === "discover" ||
    name === "discoverlist" ||
    name === "objavte" ||
    name === "objevit" ||
    lbl === "discover" ||
    lbl === "discoverlist" ||
    lbl === "objavte" ||
    lbl === "objevit"
  ) {
    return "discover";
  }

  if (name === "profile" || name === "profil" || lbl === "profile" || lbl === "profil") {
    return "profile";
  }

  return null;
};

export default function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const focusedOptions = descriptors[state.routes[state.index].key]?.options;

  if (focusedOptions?.tabBarStyle?.display === "none") {
    return null;
  }

  const bottomInset = Math.max(insets.bottom, TAB_BAR_MIN_INSET);

  const tabItems: TabItem[] = state.routes.map((route: any, routeIndex: number) => {
    const options = descriptors[route.key]?.options ?? {};
    const label = resolveLabel(options, route);
    const tabKey = resolveTabKey(String(route.name), label);
    const isHidden =
      typeof options.tabBarButton === "function" ||
      options.tabBarItemStyle?.display === "none";

    return {
      route,
      routeIndex,
      label,
      tabKey,
      isHidden,
    };
  });

  const focusedTabKey = tabItems[state.index]?.tabKey ?? null;
  const visibleItems = tabItems.filter((item) => !item.isHidden);

  return (
    <View
      style={[
        styles.wrapper,
        { paddingBottom: bottomInset },
      ]}
    >
      <View style={[styles.container, { height: TAB_BAR_BASE_HEIGHT }]}>
        {visibleItems.map((item) => {
          const iconName = item.tabKey ? TAB_ICONS[item.tabKey] : "help-circle-outline";
          const isFocused = focusedTabKey
            ? item.tabKey === focusedTabKey
            : state.index === item.routeIndex;

          const onPress = () => {
            navigation.navigate(item.route.name);
          };

          return (
            <TouchableOpacity
              key={item.route.key}
              onPress={onPress}
              style={styles.tabButton}
              activeOpacity={0.8}
            >
              <Ionicons
                name={iconName}
                size={22}
                color={isFocused ? "#000000" : "#7C7C7C"}
              />
              <Text
                style={[styles.label, isFocused ? styles.labelFocused : styles.labelInactive]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
  },
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7D7D7",
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tabButton: {
    justifyContent: "center",
    alignItems: "center",
    gap: 3,
    flex: 1,
    height: 39,
  },
  label: {
    fontSize: 15,
    lineHeight: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  labelFocused: {
    color: "#000000",
  },
  labelInactive: {
    color: "#7C7C7C",
  },
});

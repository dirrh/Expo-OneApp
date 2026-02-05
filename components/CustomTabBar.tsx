import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabIconName = "cards" | "feed" | "home" | "discover" | "profile";

const TAB_ICONS: Record<TabIconName, keyof typeof Ionicons.glyphMap> = {
  cards: "card-outline",
  feed: "play-circle-outline",
  home: "home-outline",
  discover: "location-outline",
  profile: "person-outline",
};

export default function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const focusedOptions = descriptors[state.routes[state.index].key]?.options;

  if (focusedOptions?.tabBarStyle?.display === "none") {
    return null;
  }

  const bottomInset = Math.max(insets.bottom, 6);

  return (
    <View style={[styles.container, { height: 64 + bottomInset, paddingBottom: bottomInset }]}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        // Map route name to icon key
        const getTabKey = (): TabIconName | null => {
          const name = String(route.name).toLowerCase();
          const lbl = String(label).toLowerCase();

          // Cards tab (previously QR)
          if (name === "cards" || name === "karty" || lbl === "cards" || lbl === "karty") return "cards";
          
          // Feed tab
          if (name === "feed" || lbl === "feed") return "feed";
          
          // Home tab
          if (name === "home" || name === "domov" || lbl === "home" || lbl === "domov") return "home";

          // Discover tab
          if (
            name === "discover" ||
            name === "objavte" ||
            name === "objevit" ||
            lbl === "discover" ||
            lbl === "objavte" ||
            lbl === "objevit"
          ) return "discover";

          // Profile tab
          if (
            name === "profile" ||
            name === "profil" ||
            lbl === "profile" ||
            lbl === "profil"
          ) return "profile";

          return null;
        };

        const tabKey = getTabKey();
        const iconName = tabKey ? TAB_ICONS[tabKey] : "help-circle-outline";

        const onPress = () => {
          navigation.navigate(route.name);
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabButton}
          >
            <Ionicons
              name={iconName}
              size={24}
              color={isFocused ? "#000" : "#999"}
            />
            <Text style={[styles.label, isFocused && styles.labelFocused]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    height: 70,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#eee",
    justifyContent: "space-around",
    alignItems: "center",
  },
  tabButton: {
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  labelFocused: {
    color: "#000",
    fontWeight: "600",
  },
});

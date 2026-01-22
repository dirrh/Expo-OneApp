import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function CustomTabBar({ state, descriptors, navigation }: any) {
  const focusedOptions = descriptors[state.routes[state.index].key]?.options;

  if (focusedOptions?.tabBarStyle?.display === "none") {
    return null;
  }

  return (
    <View style={styles.container}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        // Ikony z images/menu (b = black, w = white)
        const getTabKey = () => {
          // route.name je niekedy preložený, tak používame aj label
          const name = String(route.name);
          const lbl = String(label);

          if (name === "QR") return "qr";
          if (name === "Feed" || lbl === "Feed") return "feed";
          if (name === "Search" || lbl === "Search") return "search";

          if (
            name === "Discover" ||
            name === "Objavte" ||
            name === "Objevit" ||
            lbl === "Discover" ||
            lbl === "Objavte" ||
            lbl === "Objevit"
          ) return "discover";

          if (
            name === "Profile" ||
            name === "Profil" ||
            lbl === "Profile" ||
            lbl === "Profil"
          ) return "profile";

          return null;
        };

        const tabKey = getTabKey();
        const sources = {
          qr: {
            b: require("../images/menu/scanQR_b.png"),
            w: require("../images/menu/scanQR_w.png"),
          },
          feed: {
            b: require("../images/menu/feed_b.png"),
            w: require("../images/menu/feed_w.png"),
          },
          discover: {
            b: require("../images/menu/pin_b.png"),
            w: require("../images/menu/pin_w.png"),
          },
          search: {
            b: require("../images/menu/search_b.png"),
            w: require("../images/menu/search_w.png"),
          },
          profile: {
            b: require("../images/menu/user_b.png"),
            w: require("../images/menu/user_w.png"),
          },
        } as const;

        const iconSource =
          tabKey ? (isFocused ? sources[tabKey].b : sources[tabKey].w) : null;

        const onPress = () => {
          navigation.navigate(route.name);
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabButton}
          >
            {iconSource ? <Image source={iconSource} style={styles.icon} /> : null}
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
  icon: {
    width: 20,
    height: 20,
    resizeMode: "contain",
  },
  label: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  labelFocused: {
    color: "black",
    fontWeight: "600",
  },
});

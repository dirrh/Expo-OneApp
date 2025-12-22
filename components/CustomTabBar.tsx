import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";

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

        // Vlastné ikonky podľa názvu tabu
        let icon = null;

        if (route.name === "QR") {
          icon = (
            <MaterialCommunityIcons
              name="qrcode-scan"
              size={24}
              color={isFocused ? "black" : "#999"}
            />
          );
        } else if (route.name === "Benefits" || route.name === "Výhody") {
          icon = (
            <Ionicons
              name="ticket-outline"
              size={24}
              color={isFocused ? "black" : "#999"}
            />
          );
        } else if (route.name === "Discover" || route.name === "Objavte" || route.name === "Objevit") {
          icon = (
            <Feather
              name="compass"
              size={24}
              color={isFocused ? "black" : "#999"}
            />
          );
        } else if (route.name === "Profile" || route.name === "Profil") {
          icon = (
            <Ionicons
              name="person-outline"
              size={24}
              color={isFocused ? "black" : "#999"}
            />
          );
        }

        const onPress = () => {
          navigation.navigate(route.name);
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabButton}
          >
            {icon}
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
    color: "black",
    fontWeight: "600",
  },
});

import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";

type Props = {
  items: string[];
  active: string;
  onChange: (val: string) => void;
  width: number;
};

// memo() zabraňuje zbytočným renderom ak sa props nezmenia
export const TabMenu = memo(function TabMenu({ items, active, onChange, width }: Props) {
  return (
    <View style={styles.container}>
      {items.map((x) => {
        const isActive = active === x;
        return (
          <TouchableOpacity
            key={x}
            onPress={() => onChange(x)}
            style={[
              styles.tab,
              { width },
              isActive && styles.tabActive,
            ]}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {x}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    height: 48,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 0.5,
    borderColor: "#E4E4E7",
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  tab: {
    height: 37,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#EB8100",
  },
  tabText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 17,
    color: "#71717A",
    textAlign: "center",
  },
  tabTextActive: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});

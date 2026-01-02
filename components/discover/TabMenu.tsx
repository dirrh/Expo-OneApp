import React from "react";
import { View, Text } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";

type Props = {
  items: string[];
  active: string;
  onChange: (val: string) => void;
  width: number;
};

export function TabMenu({ items, active, onChange, width }: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        height: 52,
        borderRadius: 35,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#E4E4E7",
        paddingHorizontal: 2,
      }}
    >
      {items.map((x) => (
        <TouchableOpacity
          key={x}
          onPress={() => onChange(x)}
          style={{
            justifyContent: "center",
            backgroundColor: active === x ? "orange" : "white",
            padding: 5,
            borderRadius: 25,
            height: 37,
            marginTop: 7,
            width,
            marginLeft: 5,
          }}
        >
          <Text style={{ textAlign: "center" }}>{x}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

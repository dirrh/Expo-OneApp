import React from "react";
import { View, Text, Image } from "react-native";

export function NewsSection({ title }: { title: string }) {
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Image source={require("../../images/placeholder_pfp.png")} />
        <Text style={{ marginLeft: 10, fontWeight: "bold", flex: 1 }}>
          {title}
        </Text>
        <Image source={require("../../images/dots.png")} />
      </View>

      <Image
        style={{ width: "100%", borderRadius: 15, marginTop: 12 }}
        source={require("../../images/post_picture.png")}
      />

      <View style={{ flexDirection: "row", marginTop: 10 }}>
        <Image source={require("../../images/heart.png")} />
        <Text style={{ marginHorizontal: 5, fontWeight: "bold" }}>28</Text>

        <Image source={require("../../images/comment.png")} />
        <Text style={{ marginHorizontal: 5, fontWeight: "bold" }}>3</Text>
      </View>

      <Text style={{ marginTop: 8 }}>
        <Text style={{ fontWeight: "700" }}>{title} </Text>
        New flavors of protein shakes! Come workout and buy one and get the second one for free
      </Text>
    </View>
  );
}

import React from "react";
import { View, Text, Image } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import BottomSheet from "@gorhom/bottom-sheet";

export function BenefitsBottomSheet({ sheetRef, snapPoints, onLogin }: any) {
  return (
    <BottomSheet ref={sheetRef} index={-1} snapPoints={snapPoints} enablePanDownToClose>
      <View style={{ paddingHorizontal: 20 }}>
        <Image source={require("../../images/diamond.png")} style={{ alignSelf: "center" }} />
        <Text style={{ fontSize: 24, fontWeight: "bold", textAlign: "center" }}>
          Sign in to activate this benefit
        </Text>
        <TouchableOpacity onPress={onLogin}>
          <Text style={{ textAlign: "center" }}>Sign in</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

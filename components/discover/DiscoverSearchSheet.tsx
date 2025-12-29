import React from "react";
import { Image, View } from "react-native";
import { TextInput } from "react-native-gesture-handler";
import BottomSheet from "@gorhom/bottom-sheet";
import BranchCard from "../BranchCard";
import { styles } from "./discoverStyles";
import type { DiscoverSearchSheetProps } from "../../lib/interfaces";

export default function DiscoverSearchSheet({
  sheetRef,
  snapPoints,
  onSheetChange,
  sheetIndex,
  text,
  setText,
  filtered,
  t,
}: DiscoverSearchSheetProps) {
  return (
    <BottomSheet
      ref={sheetRef}
      index={sheetIndex}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onChange={onSheetChange}
    >
      <View style={styles.searchField}>
        <Image source={require("../../images/search.png")} style={styles.searchIcon} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t("searchbranches")}
          style={styles.searchInput}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        {filtered.map((b) => (
          <BranchCard key={b.title} {...b} />
        ))}
      </View>
    </BottomSheet>
  );
}

/**
 * DiscoverSearchSheet.tsx
 * 
 * Bottom sheet s vyhľadávaním pobočiek.
 * Obsahuje textové pole a virtualizovaný zoznam výsledkov.
 * 
 * OPTIMALIZÁCIE:
 * - BottomSheetFlatList namiesto ScrollView - virtualizácia (renderuje len viditeľné položky)
 * - memo() na komponente - zabraňuje zbytočným renderom
 * - useCallback() na renderItem a keyExtractor - stabilné referencie
 */

import React, { memo, useCallback } from "react";
import { Image, View, StyleSheet } from "react-native";
import { TextInput } from "react-native-gesture-handler";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import BranchCard from "../BranchCard";
import { styles } from "./discoverStyles";
import type { DiscoverSearchSheetProps, BranchCardProps } from "../../lib/interfaces";

function DiscoverSearchSheet({
  sheetRef,          // ref na BottomSheet (pre programatické ovládanie)
  snapPoints,        // body uchytenia (napr. ["25%", "85%"])
  onSheetChange,     // callback pri zmene pozície sheetu
  sheetIndex,        // aktuálna pozícia (-1 = zatvorený)
  text,              // text vo vyhľadávacom poli
  setText,           // funkcia na zmenu textu
  filtered,          // prefiltrované pobočky
  t,                 // prekladová funkcia
}: DiscoverSearchSheetProps) {
  
  /**
   * Funkcia na extrahovanie kľúča pre FlatList
   * useCallback zabezpečí stabilnú referenciu - FlatList sa nebude zbytočne renderovať
   */
  const keyExtractor = useCallback(
    (item: BranchCardProps) => item.id ?? item.title,
    []
  );

  /**
   * Funkcia na renderovanie položky
   * useCallback zabezpečí stabilnú referenciu
   */
  const renderItem = useCallback(
    ({ item }: { item: BranchCardProps }) => <BranchCard {...item} />,
    []
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={sheetIndex}
      snapPoints={snapPoints}
      enablePanDownToClose={true}  // umožníme zatvoriť potiahnutím nadol
      onChange={onSheetChange}
    >
      {/* Vyhľadávacie pole */}
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

      {/* Virtualizovaný zoznam pobočiek */}
      <BottomSheetFlatList
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={listStyles.contentContainer}
        showsVerticalScrollIndicator={false}
        // === OPTIMALIZAČNÉ NASTAVENIA ===
        initialNumToRender={5}       // koľko položiek vyrenderovať na začiatku
        maxToRenderPerBatch={10}     // koľko položiek vyrenderovať naraz pri scrolle
        windowSize={5}               // koľko "obrazoviek" držať v pamäti
        removeClippedSubviews={true} // odstráni položky mimo obrazovky (šetrí pamäť)
      />
    </BottomSheet>
  );
}

// memo() zabraňuje zbytočným renderom
export default memo(DiscoverSearchSheet);

// Štýly pre FlatList
const listStyles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
});

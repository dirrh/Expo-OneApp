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
import { FlatList, View, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import BranchCard from "../BranchCard";
import { styles } from "./discoverStyles";
import type { DiscoverSearchSheetProps, BranchCardProps } from "../../lib/interfaces";

function DiscoverSearchSheet({
  onSheetChange,     // callback pri zmene pozície sheetu
  sheetIndex,        // aktuálna pozícia (-1 = zatvorený)
  text,              // text vo vyhľadávacom poli
  setText,           // funkcia na zmenu textu
  filtered,          // prefiltrované pobočky
  t,                 // prekladová funkcia
}: DiscoverSearchSheetProps) {
  const insets = useSafeAreaInsets();
  
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

  if (sheetIndex === -1) {
    return null;
  }

  return (
    <View style={[styles.searchScreen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.searchTopRow}>
        <TouchableOpacity
          style={styles.searchBackButton}
          onPress={() => onSheetChange(-1)}
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={18} color="#000000" />
        </TouchableOpacity>

        {/* Vyhľadávacie pole */}
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search-outline" size={16} color="#000000" style={styles.searchIcon} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t("searchbranches")}
            style={styles.searchInput}
            placeholderTextColor="#71717A"
          />
          {text.length > 0 && (
            <TouchableOpacity
              onPress={() => setText("")}
              style={styles.searchClearButton}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Virtualizovaný zoznam pobočiek */}
      <FlatList
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
    </View>
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

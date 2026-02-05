/**
 * DiscoverBranchOverlay.tsx
 * 
 * Spodný overlay na Discover obrazovke.
 * Obsahuje prepínač kategórií a horizontálny carousel s kartami pobočiek.
 * 
 * OPTIMALIZÁCIE:
 * - FlatList namiesto ScrollView - virtualizácia (renderuje len viditeľné položky)
 * - memo() na komponente - zabraňuje zbytočným renderom
 * - useMemo() na dynamických štýloch - stabilné referencie
 * - useCallback() na handleroch - zabraňuje zbytočným renderom detí
 * - getItemLayout - okamžitý skok na položku (FlatList nemusí merať)
 */

import React, { memo, useCallback, useMemo } from "react";
import { FlatList, Image, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { ScrollView, TouchableOpacity } from "react-native-gesture-handler";
import BranchCard from "../BranchCard";
import { styles } from "./discoverStyles";
import type { DiscoverBranchOverlayProps, BranchCardProps } from "../../lib/interfaces";
import { useNavigation } from "@react-navigation/native";
import {
  BRANCH_CARD_BASELINE_OFFSET,
  BRANCH_CARD_OVERLAY_PADDING_Y,
} from "../../lib/constants/layout";

function DiscoverBranchOverlay({
  insetsBottom,        // spodný safe area inset (pre notch/home indicator)
  categoriesOpen,      // či je otvorený prepínač kategórií
  setCategoriesOpen,   // funkcia na otvorenie/zatvorenie prepínača
  filterOptions,       // možnosti filtrov (Fitness, Gastro, atď.)
  filterIcons,         // ikonky pre jednotlivé kategórie
  appliedFilters,      // aktuálne aplikované filtre
  setAppliedFilters,   // funkcia na zmenu filtrov
  setFilter,           // funkcia na nastavenie filtra v sheete
  branches,            // zoznam pobočiek na zobrazenie
  branchCardWidth,     // šírka karty (responzívna)
  t,                   // prekladová funkcia
}: DiscoverBranchOverlayProps) {
  
  const { width: screenWidth } = useWindowDimensions();
  const cardGap = Math.min(20, Math.max(12, Math.round(screenWidth * 0.04)));
  const sideInset = Math.max(0, Math.floor((screenWidth - branchCardWidth) / 2));
  const navigation = useNavigation<any>();
  const discoverCardBottomPadding = 14;
  const overlayBottomOffset = BRANCH_CARD_BASELINE_OFFSET;

  // === MEMOIZOVANÉ ŠTÝLY ===
  // Tieto štýly závisia od props, takže ich memoizujeme

  // Kontajner s dynamickým bottom (pre safe area)
  const containerStyle = useMemo(
    () => [styles.branchOverlay, { bottom: insetsBottom + overlayBottomOffset }],
    [insetsBottom, overlayBottomOffset]
  );

  // Kontajner pre kartu s dynamickou šírkou
  const cardContainerStyle = useMemo(
    () => ({ width: branchCardWidth }),
    [branchCardWidth]
  );

  // Štýl pre "stránku" v carousel
  const listContentStyle = useMemo(
    () => [overlayStyles.listContent, { paddingHorizontal: sideInset }],
    [sideInset]
  );

  const initialScrollIndex = branches.length > 1 ? 1 : undefined;

  // === MEMOIZOVANÉ FUNKCIE PRE FLATLIST ===

  /**
   * Extraktor kľúča pre FlatList
   * Stabilná referencia vďaka useCallback
   */
  const keyExtractor = useCallback(
    (item: BranchCardProps) => item.id ?? item.title,
    []
  );

  /**
   * Renderovacia funkcia pre položku
   * Vytvára kartu pobočky v kontajneri so správnou šírkou
   */
  const renderItem = useCallback(
    ({ item }: { item: BranchCardProps }) => {
      // Odstránime onPress z dát (nechceme ho posielať do navigácie)
      const { onPress: _onPress, ...branchData } = item;
      
      return (
        <View style={cardContainerStyle}>
          <BranchCard
            {...item}
            badgeVariant="more"
            cardPaddingBottom={discoverCardBottomPadding}
            onPress={() => {
              navigation.navigate("BusinessDetailScreen", { branch: branchData });
            }}
          />
        </View>
      );
    },
    [cardContainerStyle, navigation]
  );

  const renderSeparator = useCallback(
    () => <View style={{ width: cardGap }} />,
    [cardGap]
  );

  // === HANDLERY ===

  /**
   * Handler pre kliknutie na kategóriu
   * Ak je kategória už vybraná, zruší filter
   */
  const handleCategoryPress = useCallback(
    (option: string) => {
      setFilter(option);
      setAppliedFilters((prev) => {
        const next = new Set(prev);
        if (next.has(option)) {
          next.delete(option);
        } else {
          next.add(option);
        }
        return next;
      });
    },
    [setFilter, setAppliedFilters]
  );

  /**
   * Handler pre prepnutie viditeľnosti kategórií
   */
  const handleToggleCategories = useCallback(() => {
    setCategoriesOpen((prev) => !prev);
  }, [setCategoriesOpen]);

  return (
    <View style={containerStyle} pointerEvents="box-none">
      {/* Horizontálny carousel s kartami pobočiek */}
      <FlatList
        data={branches}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={listContentStyle}
        ItemSeparatorComponent={renderSeparator}
        initialScrollIndex={initialScrollIndex}
        snapToInterval={branchCardWidth + cardGap}
        snapToAlignment="start"
        decelerationRate="fast"          // rýchle zastavenie
        bounces={false}                  // bez bounce efektu na krajoch
        // === OPTIMALIZAČNÉ NASTAVENIA ===
        initialNumToRender={3}           // na začiatku vyrenderuj 3 položky
        maxToRenderPerBatch={5}          // pri scrolle renderuj max 5 naraz
        windowSize={3}                   // drž v pamäti 3 "obrazovky"
        removeClippedSubviews={true}     // odstráň položky mimo obrazovky
        // getItemLayout umožňuje okamžitý skok na položku (nemusíme merať)
        getItemLayout={(_, index) => ({
          length: branchCardWidth + cardGap,
          offset: (branchCardWidth + cardGap) * index,
          index,
        })}
      />
    </View>
  );
}

// memo() zabraňuje zbytočným renderom
export default memo(DiscoverBranchOverlay);

// Lokálne štýly pre overlay
const overlayStyles = StyleSheet.create({
  listContent: {
    paddingVertical: BRANCH_CARD_OVERLAY_PADDING_Y,
  },
});

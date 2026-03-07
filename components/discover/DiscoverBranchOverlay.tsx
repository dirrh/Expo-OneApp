import React, { memo, useCallback, useMemo } from "react";
import { FlatList, Image, Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { ScrollView, TouchableOpacity } from "react-native-gesture-handler";
import BranchCard from "../BranchCard";
import { styles } from "./discoverStyles";
import type { DiscoverBranchOverlayProps, BranchCardProps } from "../../lib/interfaces";
import { useNavigation } from "@react-navigation/native";
import {
  BRANCH_CARD_BASELINE_OFFSET,
  BRANCH_CARD_OVERLAY_PADDING_Y,
  BRANCH_CARD_EXTRA_OFFSET,
  TAB_BAR_BASE_HEIGHT,
  TAB_BAR_MIN_INSET,
} from "../../lib/constants/layout";

/**
 * DiscoverBranchOverlay: Spodný overlay na mape Discover s horizontálnym zoznamom podnikov a kategóriami.
 *
 * Prečo: Kombinuje mapu a rýchly preview výsledkov bez nutnosti prepínať na inú obrazovku.
 */
function DiscoverBranchOverlay({
  insetsBottom,
  categoriesOpen,
  setCategoriesOpen,
  filterOptions,
  filterIcons,
  appliedFilters,
  setAppliedFilters,
  setFilter,
  branches,
  branchCardWidth,
  t,
}: DiscoverBranchOverlayProps) {
  
  const { width: screenWidth } = useWindowDimensions();
  const cardGap = Math.min(20, Math.max(12, Math.round(screenWidth * 0.04)));
  const sideInset = Math.max(0, Math.floor((screenWidth - branchCardWidth) / 2));
  const navigation = useNavigation<any>();
  const discoverCardBottomPadding = 14;
  const tabBarInset = Math.max(insetsBottom, TAB_BAR_MIN_INSET);
  const overlayBottomOffset =
    tabBarInset +
    TAB_BAR_BASE_HEIGHT +
    BRANCH_CARD_BASELINE_OFFSET +
    BRANCH_CARD_EXTRA_OFFSET +
    10;

  const containerStyle = useMemo(
    () => [styles.branchOverlay, { bottom: overlayBottomOffset }],
    [overlayBottomOffset]
  );

  const cardContainerStyle = useMemo(
    () => ({ width: branchCardWidth }),
    [branchCardWidth]
  );

  const listContentStyle = useMemo(
    () => [overlayStyles.listContent, { paddingHorizontal: sideInset }],
    [sideInset]
  );

  const initialScrollIndex = branches.length > 1 ? 1 : undefined;

  const keyExtractor = useCallback(
    (item: BranchCardProps) => item.id ?? item.title,
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: BranchCardProps }) => {
      const { onPress: _onPress, ...branchData } = item;
      
      return (
        <View style={cardContainerStyle}>
          <BranchCard
            {...item}
            badgeVariant="more"
            cardPaddingBottom={discoverCardBottomPadding}
            onPress={() => {
              navigation.navigate("BusinessDetailScreen", {
                branch: branchData,
                source: "discover",
                disableTransitionAnimation: Platform.OS === "android",
              });
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

  const handleToggleCategories = useCallback(() => {
    setCategoriesOpen((prev) => !prev);
  }, [setCategoriesOpen]);

  return (
    <View style={containerStyle} pointerEvents="box-none">
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
        decelerationRate="fast"
        bounces={false}
        initialNumToRender={3}
        maxToRenderPerBatch={5}
        windowSize={3}
        removeClippedSubviews={true}
        getItemLayout={(_, index) => ({
          length: branchCardWidth + cardGap,
          offset: (branchCardWidth + cardGap) * index,
          index,
        })}
      />
    </View>
  );
}

export default memo(DiscoverBranchOverlay);

const overlayStyles = StyleSheet.create({
  listContent: {
    paddingVertical: BRANCH_CARD_OVERLAY_PADDING_Y,
  },
});

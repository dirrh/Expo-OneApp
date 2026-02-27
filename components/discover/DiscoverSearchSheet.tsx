import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  type LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type {
  DiscoverSearchSheetProps,
  BranchCardProps,
  DiscoverFavoritePlace,
} from "../../lib/interfaces";
import {
  DISCOVER_TOP_CONTROL_GAP,
  DISCOVER_TOP_CONTROL_HEIGHT,
  DISCOVER_TOP_HORIZONTAL_PADDING,
  DISCOVER_TOP_OFFSET,
} from "../../lib/constants/discoverUi";

const SEARCH_TOP_ROW_Y = DISCOVER_TOP_OFFSET;
const RESULT_ROW_FALLBACK_HEIGHT = 96;

/**
 * DiscoverSearchSheet: Google-like search overlay v Discover s favorites headerom a zoznamom nájdených podnikov.
 *
 * Prečo: Spojenie vstupu, klávesnice a výsledkov na jednej vrstve zrýchľuje vyhľadávanie na mape.
 */
function DiscoverSearchSheet({
  onSheetChange,
  onClose,
  sheetIndex,
  text,
  setText,
  filtered,
  onSelectBranch,
  favoritePlaces,
  onSelectFavorite,
  autoFocus = false,
  showFavorites = true,
  resultTabs,
  activeResultTabKey,
  onChangeResultTab,
  t,
}: DiscoverSearchSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const inputRef = useRef<TextInput>(null);
  const [listHeight, setListHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [rowHeight, setRowHeight] = useState(0);
  const rowScale = useMemo(() => Math.min(1, Math.max(0.84, windowWidth / 393)), [windowWidth]);
  const rowImageSize = useMemo(() => Math.round(72 * rowScale), [rowScale]);
  const rowImageRadius = useMemo(() => Math.round(10 * rowScale), [rowScale]);
  const rowGap = useMemo(() => Math.round(12 * rowScale), [rowScale]);
  const rowPaddingH = useMemo(() => Math.round(12 * rowScale), [rowScale]);
  const rowPaddingV = useMemo(() => Math.round(10 * rowScale), [rowScale]);
  const rowTitleSize = useMemo(() => Math.max(15, Math.round(16 * rowScale)), [rowScale]);
  const rowMetaSize = useMemo(() => Math.max(12, Math.round(13 * rowScale)), [rowScale]);
  const rowMoreSize = useMemo(() => Math.max(13, Math.round(14 * rowScale)), [rowScale]);

  useEffect(() => {
    if (sheetIndex === -1 || !autoFocus) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [sheetIndex, autoFocus]);

  const keyExtractor = useCallback((item: BranchCardProps) => item.id ?? item.title, []);

  const visibleResultsLimit = useMemo(() => {
    const fallbackLimit = Math.max(1, Math.floor((windowHeight * 0.62) / RESULT_ROW_FALLBACK_HEIGHT));
    const availableHeight = listHeight > 0 ? Math.max(0, listHeight - headerHeight) : 0;
    const itemHeight = rowHeight > 0 ? rowHeight : RESULT_ROW_FALLBACK_HEIGHT;

    if (availableHeight <= 0) {
      return Math.min(filtered.length, fallbackLimit);
    }

    return Math.max(1, Math.min(filtered.length, Math.floor(availableHeight / itemHeight)));
  }, [filtered.length, headerHeight, listHeight, rowHeight, windowHeight]);

  const displayedResults = useMemo(
    () => filtered.slice(0, visibleResultsLimit),
    [filtered, visibleResultsLimit]
  );

  const handleListLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    if (!Number.isFinite(nextHeight) || nextHeight <= 0 || nextHeight === listHeight) {
      return;
    }
    setListHeight(nextHeight);
  }, [listHeight]);

  const handleHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    if (!Number.isFinite(nextHeight) || nextHeight < 0 || nextHeight === headerHeight) {
      return;
    }
    setHeaderHeight(nextHeight);
  }, [headerHeight]);

  const handleRowLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    if (!Number.isFinite(nextHeight) || nextHeight <= 0 || nextHeight === rowHeight) {
      return;
    }
    setRowHeight(nextHeight);
  }, [rowHeight]);

  const renderItem = useCallback(
    ({ item, index }: { item: BranchCardProps; index: number }) => {
      const ratingText = Number.isFinite(item.rating) ? item.rating.toFixed(1) : "-";
      const resolvedOffers =
        Array.isArray(item.offers) && item.offers.length > 0
          ? item.offers
          : item.discount
            ? [item.discount]
            : [];
      const resolvedMoreCount =
        typeof item.moreCount === "number"
          ? item.moreCount
          : Math.max(0, resolvedOffers.length - (resolvedOffers.length > 0 ? 1 : 0));
      const isLast = index === displayedResults.length - 1;

      return (
        <TouchableOpacity
          activeOpacity={0.88}
          style={[
            localStyles.resultRow,
            isLast && localStyles.resultRowLast,
            { paddingHorizontal: rowPaddingH, paddingVertical: rowPaddingV },
          ]}
          onPress={() => onSelectBranch(item)}
          accessibilityRole="button"
          accessibilityLabel={item.title}
          onLayout={index === 0 ? handleRowLayout : undefined}
        >
          <Image
            source={item.image}
            style={[
              localStyles.resultImage,
              {
                width: rowImageSize,
                height: rowImageSize,
                borderRadius: rowImageRadius,
                marginRight: rowGap,
              },
            ]}
            resizeMode="cover"
          />

          <View style={localStyles.resultContent}>
            <View style={localStyles.resultTopRow}>
              <Text
                style={[
                  localStyles.resultTitle,
                  { fontSize: rowTitleSize, lineHeight: Math.round(rowTitleSize * 1.25) },
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#A1A1AA" />
            </View>

            <View style={localStyles.resultMetaRow}>
              <View style={localStyles.resultMetaItem}>
                <Ionicons name="star" size={12} color="#FFD000" />
                <Text
                  style={[
                    localStyles.resultMetaText,
                    { fontSize: rowMetaSize, lineHeight: Math.round(rowMetaSize * 1.3) },
                  ]}
                >
                  {ratingText}
                </Text>
              </View>
              <View style={localStyles.resultMetaItem}>
                <Ionicons name="location-outline" size={12} color="#7C7C7C" />
                <Text
                  style={[
                    localStyles.resultMetaText,
                    { fontSize: rowMetaSize, lineHeight: Math.round(rowMetaSize * 1.3) },
                  ]}
                >
                  {item.distance}
                </Text>
              </View>
              <View style={localStyles.resultMetaItem}>
                <Ionicons name="time-outline" size={12} color="#7C7C7C" />
                <Text
                  style={[
                    localStyles.resultMetaText,
                    { fontSize: rowMetaSize, lineHeight: Math.round(rowMetaSize * 1.3) },
                  ]}
                >
                  {item.hours}
                </Text>
              </View>
            </View>

            {resolvedOffers.length > 0 ? (
              <View style={localStyles.resultOfferRow}>
                {resolvedOffers[0] ? (
                  <View style={localStyles.resultOfferBadge}>
                    <Text style={localStyles.resultOfferText} numberOfLines={1}>
                      {t(resolvedOffers[0])}
                    </Text>
                  </View>
                ) : null}
                {resolvedMoreCount > 0 ? (
                  <Text
                    style={[
                      localStyles.resultMoreText,
                      { fontSize: rowMoreSize, lineHeight: Math.round(rowMoreSize * 1.25) },
                    ]}
                    numberOfLines={1}
                  >
                    + {resolvedMoreCount} {t("more")}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
    [
      displayedResults.length,
      handleRowLayout,
      onSelectBranch,
      rowGap,
      rowImageRadius,
      rowImageSize,
      rowMetaSize,
      rowMoreSize,
      rowPaddingH,
      rowPaddingV,
      rowTitleSize,
      t,
    ]
  );

  const handleClose = useCallback(() => {
    onSheetChange?.(-1);
    onClose();
  }, [onClose, onSheetChange]);

  const renderFavoriteChip = useCallback(
    (place: DiscoverFavoritePlace) => (
      <TouchableOpacity
        key={place.id}
        style={localStyles.favoriteChip}
        activeOpacity={0.9}
        onPress={() => onSelectFavorite(place)}
        accessibilityRole="button"
        accessibilityLabel={t("discoverSearchFavoriteA11y", { place: place.label })}
      >
        <Ionicons
          name={place.isSaved ? "bookmark-outline" : "location-outline"}
          size={14}
          color="#111111"
        />
        <Text style={localStyles.favoriteChipText} numberOfLines={1}>
          {place.label}
        </Text>
      </TouchableOpacity>
    ),
    [onSelectFavorite, t]
  );

  const listHeader = useMemo(() => {
    const hasResults = filtered.length > 0;
    const hasResultTabs = Array.isArray(resultTabs) && resultTabs.length > 0;

    if (!showFavorites && !hasResults && !hasResultTabs) {
      return null;
    }

    return (
      <View style={localStyles.listHeaderWrap} onLayout={handleHeaderLayout}>
        {showFavorites ? (
          <View style={localStyles.favoritesSection}>
            <View style={localStyles.favoritesHeading}>
              <Text style={localStyles.favoritesTitle}>{t("discoverSearchFavoritesTitle")}</Text>
              {favoritePlaces.length > 0 ? (
                <Text style={localStyles.favoritesCountText}>
                  {t("discoverSearchFavoritesCount", { count: favoritePlaces.length })}
                </Text>
              ) : null}
            </View>
            {favoritePlaces.length > 0 ? (
              <View style={localStyles.favoritesWrap}>
                {favoritePlaces.map((place) => renderFavoriteChip(place))}
              </View>
            ) : (
              <Text style={localStyles.favoritesEmpty}>{t("discoverSearchFavoritesEmpty")}</Text>
            )}
          </View>
        ) : null}

        {hasResultTabs ? (
          <View style={localStyles.resultsBlockHeader}>
            <View style={localStyles.resultsTabsRow}>
              {resultTabs.map((tab) => {
                const isActive = tab.key === activeResultTabKey;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[
                      localStyles.resultTabButton,
                      isActive && localStyles.resultTabButtonActive,
                    ]}
                    activeOpacity={0.75}
                    onPress={() => onChangeResultTab?.(tab.key)}
                  >
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={[
                        localStyles.resultTabText,
                        isActive && localStyles.resultTabTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : hasResults ? (
          <View style={[localStyles.resultsBlockHeader, localStyles.resultsBlockHeaderWithTitle]}>
            <Text style={localStyles.resultsSectionTitle}>{t("discoverSearchNearestTitle")}</Text>
          </View>
        ) : null}
      </View>
    );
  }, [
    activeResultTabKey,
    favoritePlaces,
    filtered.length,
    handleHeaderLayout,
    onChangeResultTab,
    renderFavoriteChip,
    resultTabs,
    showFavorites,
    t,
  ]);

  const listEmptyComponent = useMemo(() => {
    if (!text.trim()) {
      return null;
    }

    return (
      <View style={localStyles.emptyResults}>
        <Text style={localStyles.emptyResultsText}>{t("noPlacesFound")}</Text>
      </View>
    );
  }, [text, t]);

  if (sheetIndex === -1) {
    return null;
  }

  const isLegacy = !showFavorites;

  return (
    <View style={[localStyles.container, { paddingTop: insets.top + SEARCH_TOP_ROW_Y }]}>
      <View style={localStyles.searchTopRow}>
        <TouchableOpacity
          style={isLegacy ? localStyles.legacyBackButton : localStyles.backButton}
          onPress={handleClose}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t("discoverSearchBackA11y")}
        >
          <Ionicons name="chevron-back" size={18} color="#111111" />
        </TouchableOpacity>

        <View style={localStyles.searchInputWrapper}>
          {isLegacy ? (
            <Ionicons name="search-outline" size={16} color="#111111" style={localStyles.searchIcon} />
          ) : null}
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder={t("searchbranches")}
            style={localStyles.searchInput}
            placeholderTextColor="#71717A"
            accessibilityLabel={t("discoverSearchInputA11y")}
            autoFocus={autoFocus}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {text.length > 0 ? (
            <TouchableOpacity
              onPress={() => setText("")}
              style={localStyles.searchClearButton}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t("homeSearchClearA11y")}
            >
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        data={displayedResults}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmptyComponent}
        contentContainerStyle={localStyles.listContent}
        onLayout={handleListLayout}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={6}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
      />
    </View>
  );
}

export default memo(DiscoverSearchSheet);

const localStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 6000,
    elevation: 6000,
    backgroundColor: "#FAFAFA",
  },
  searchTopRow: {
    flexDirection: "row",
    alignItems: "center",
    height: DISCOVER_TOP_CONTROL_HEIGHT,
    gap: DISCOVER_TOP_CONTROL_GAP,
    paddingHorizontal: DISCOVER_TOP_HORIZONTAL_PADDING,
    marginBottom: 14,
  },
  backButton: {
    width: DISCOVER_TOP_CONTROL_HEIGHT,
    height: DISCOVER_TOP_CONTROL_HEIGHT,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.1)" }
      : {
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
        }),
  },
  legacyBackButton: {
    width: DISCOVER_TOP_CONTROL_HEIGHT,
    height: DISCOVER_TOP_CONTROL_HEIGHT,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.1)" }
      : {
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
        }),
  },
  searchInputWrapper: {
    flex: 1,
    minWidth: 120,
    height: DISCOVER_TOP_CONTROL_HEIGHT,
    borderRadius: 20,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.1)" }
      : {
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
        }),
  },
  searchIcon: {
    marginRight: 0,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    color: "#111111",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    includeFontPadding: false,
  },
  searchClearButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: DISCOVER_TOP_HORIZONTAL_PADDING,
    paddingTop: 2,
    paddingBottom: 24,
  },
  listHeaderWrap: {
    marginBottom: 0,
  },
  favoritesSection: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  favoritesHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  favoritesTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: "#111111",
  },
  favoritesCountText: {
    fontSize: 12,
    lineHeight: 16,
    color: "#71717A",
    fontWeight: "500",
  },
  favoritesWrap: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  favoriteChip: {
    minHeight: 36,
    maxWidth: "100%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  favoriteChipText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    color: "#111111",
    flexShrink: 1,
  },
  favoritesEmpty: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    color: "#71717A",
  },
  resultsSectionTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: "#111111",
    flexShrink: 1,
  },
  resultsBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E4E7",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    marginTop: 0,
    marginBottom: 0,
    width: "100%",
    overflow: "hidden",
  },
  resultsBlockHeaderWithTitle: {
    minHeight: 40,
    paddingHorizontal: 12,
  },
  resultsTabsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
  },
  resultTabButton: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  resultTabButtonActive: {
    borderBottomColor: "#EB8100",
  },
  resultTabText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "500",
    color: "#A1A1AA",
    textAlign: "center",
  },
  resultTabTextActive: {
    color: "#18181B",
    fontWeight: "600",
  },
  emptyResults: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyResultsText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: "#71717A",
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#E4E4E7",
    borderRadius: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 0,
    width: "100%",
  },
  resultRowLast: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    marginBottom: 10,
  },
  resultImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: "#E4E4E7",
  },
  resultContent: {
    flex: 1,
    minWidth: 0,
  },
  resultTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  resultTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
    color: "#111111",
  },
  resultMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 8,
    rowGap: 2,
    marginTop: 4,
    minWidth: 0,
  },
  resultMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    minWidth: 0,
  },
  resultMetaText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "500",
    color: "#7C7C7C",
    flexShrink: 1,
  },
  resultOfferRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 9,
    minWidth: 0,
    flexWrap: "nowrap",
  },
  resultOfferBadge: {
    borderRadius: 999,
    backgroundColor: "#EB8100",
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: "80%",
    minWidth: 0,
    flexShrink: 1,
  },
  resultOfferText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    flexShrink: 1,
  },
  resultMoreText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "500",
    color: "#111111",
    flexShrink: 1,
    minWidth: 0,
  },
});

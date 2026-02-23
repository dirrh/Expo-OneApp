import React, { memo, useCallback, useMemo } from "react";
import {
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { HomeSearchResult, HomeSearchScope } from "../../lib/search/homeSearchTypes";
import HomeSearchAssistChips from "./HomeSearchAssistChips";

interface HomeSearchOverlayProps {
  visible: boolean;
  query: string;
  setQuery: (value: string) => void;
  scope: HomeSearchScope;
  setScope: (value: HomeSearchScope) => void;
  scopeOptions: HomeSearchScope[];
  history: string[];
  onClearHistory: () => void;
  popularQueries: string[];
  onApplySuggestion: (value: string) => void;
  results: HomeSearchResult[];
  isSearchActive: boolean;
  onClose: () => void;
  onSelectResult: (value: HomeSearchResult) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

/**
 * HomeSearchOverlay: Full-screen vyhľadávacia vrstva na Home so scope filtrom, históriou a výsledkami.
 *
 * Prečo: Oddelenie search flow do overlay urýchľuje hľadanie bez opustenia kontextu domovskej obrazovky.
 */
function HomeSearchOverlay({
  visible,
  query,
  setQuery,
  scope,
  setScope,
  scopeOptions,
  history,
  onClearHistory,
  popularQueries,
  onApplySuggestion,
  results,
  isSearchActive,
  onClose,
  onSelectResult,
  t,
}: HomeSearchOverlayProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const layoutScale = useMemo(
    () => Math.min(1.08, Math.max(0.86, screenWidth / 393)),
    [screenWidth]
  );
  const horizontalPadding = useMemo(
    () => Math.max(12, Math.round(16 * layoutScale)),
    [layoutScale]
  );
  const headerControlsGap = useMemo(
    () => Math.max(10, Math.round(13 * layoutScale)),
    [layoutScale]
  );
  const headerTopOffset = useMemo(
    () => 16,
    []
  );
  const categoriesVerticalSpacing = useMemo(
    () => Math.max(6, Math.round(10 * layoutScale)),
    [layoutScale]
  );
  const categoriesChipGap = useMemo(
    () => Math.max(8, Math.round(10 * layoutScale)),
    [layoutScale]
  );

  const keyExtractor = useCallback(
    (item: HomeSearchResult, index: number) => item.branch.id ?? `${item.branch.title}-${index}`,
    []
  );

  const renderResult = useCallback(
    ({ item, index }: { item: HomeSearchResult; index: number }) => {
      const branch = item.branch;
      const resolvedOffers =
        Array.isArray(branch.offers) && branch.offers.length > 0
          ? branch.offers
          : branch.discount ? [branch.discount] : [];
      const resolvedMoreCount =
        typeof branch.moreCount === "number"
          ? branch.moreCount
          : Math.max(0, resolvedOffers.length - (resolvedOffers.length > 0 ? 1 : 0));
      const ratingText = Number.isFinite(branch.rating) ? branch.rating.toFixed(1) : "-";
      const isFirst = index === 0;
      const isLast = index === results.length - 1;

      return (
        <TouchableOpacity
          activeOpacity={0.88}
          style={[
            styles.resultRow,
            isFirst && styles.resultRowFirst,
            isLast && styles.resultRowLast,
          ]}
          onPress={() => onSelectResult(item)}
          accessibilityRole="button"
          accessibilityLabel={branch.title}
        >
          <Image source={branch.image} style={styles.resultImage} resizeMode="cover" />
          <View style={styles.resultContent}>
            <View style={styles.resultTopRow}>
              <Text style={styles.resultTitle} numberOfLines={1}>{branch.title}</Text>
              <Ionicons name="chevron-forward" size={16} color="#A1A1AA" />
            </View>
            <View style={styles.resultMetaRow}>
              <View style={styles.resultMetaItem}>
                <Ionicons name="star" size={12} color="#FFD000" />
                <Text style={styles.resultMetaText}>{ratingText}</Text>
              </View>
              <View style={styles.resultMetaItem}>
                <Ionicons name="location-outline" size={12} color="#7C7C7C" />
                <Text style={styles.resultMetaText}>{branch.distance}</Text>
              </View>
              <View style={styles.resultMetaItem}>
                <Ionicons name="time-outline" size={12} color="#7C7C7C" />
                <Text style={styles.resultMetaText}>{branch.hours}</Text>
              </View>
            </View>
            {resolvedOffers.length > 0 ? (
              <View style={styles.resultOfferRow}>
                {resolvedOffers[0] ? (
                  <View style={styles.resultOfferBadge}>
                    <Text style={styles.resultOfferText} numberOfLines={1}>
                      {t(resolvedOffers[0])}
                    </Text>
                  </View>
                ) : null}
                {resolvedMoreCount > 0 ? (
                  <Text style={styles.resultMoreText} numberOfLines={1}>
                    + {resolvedMoreCount} {t("more")}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
    [onSelectResult, results.length, t]
  );

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + headerTopOffset, paddingBottom: insets.bottom + 8 },
        ]}
      >
        <View style={[styles.topRow, { paddingHorizontal: horizontalPadding, gap: headerControlsGap }]}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.8}
            onPress={onClose}
            accessibilityLabel={t("homeSearchBackA11y")}
          >
            <Ionicons name="chevron-back" size={18} color="#000000" />
          </TouchableOpacity>

          <View style={styles.inputWrap}>
            <Ionicons name="search-outline" size={16} color="#000000" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("homeSearchPlaceholder")}
              placeholderTextColor="#71717A"
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              accessibilityLabel={t("homeSearchInputA11y")}
            />
            {query.length > 0 ? (
              <TouchableOpacity
                onPress={() => setQuery("")}
                style={styles.clearButton}
                activeOpacity={0.8}
                accessibilityLabel={t("homeSearchClearA11y")}
              >
                <Ionicons name="close" size={15} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <FlatList
          data={isSearchActive ? results : []}
          keyExtractor={keyExtractor}
          renderItem={renderResult}
          ListHeaderComponent={
            <View style={styles.headerContent}>
              <View
                style={[
                  styles.scopeWrap,
                  {
                    marginTop: categoriesVerticalSpacing,
                    marginBottom: categoriesVerticalSpacing,
                  },
                ]}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[styles.scopeRow, { gap: categoriesChipGap }]}
                >
                  {scopeOptions.map((option) => {
                    const isActive = option === scope;
                    const labelKey = option === "All" ? "showAll" : option;
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[styles.scopeChip, isActive && styles.scopeChipActive]}
                        activeOpacity={0.85}
                        onPress={() => setScope(option)}
                        accessibilityLabel={`${t("homeSearchScopeA11y")} ${t(labelKey)}`}
                      >
                        <Text style={[styles.scopeChipText, isActive && styles.scopeChipTextActive]}>
                          {t(labelKey)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {!isSearchActive ? (
                <View style={styles.idleContent}>
                  <HomeSearchAssistChips
                    title={t("homeSearchRecentTitle")}
                    chips={history}
                    onPressChip={onApplySuggestion}
                    onClear={onClearHistory}
                    clearLabel={t("homeSearchClearHistory")}
                  />
                  <HomeSearchAssistChips
                    title={t("homeSearchPopularTitle")}
                    chips={popularQueries.map((item) => t(`homeSearchChip_${item}`))}
                    onPressChip={onApplySuggestion}
                  />
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            isSearchActive ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTitle}>{t("homeSearchNoResultsTitle")}</Text>
                <Text style={styles.emptyText}>{t("homeSearchNoResultsText")}</Text>
              </View>
            ) : null
          }
          contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalPadding }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={4}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS !== "web"}
        />
      </View>
    </View>
  );
}

export default memo(HomeSearchOverlay);

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FAFAFA",
    zIndex: 80,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  inputWrap: {
    flex: 1,
    height: 42,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    color: "#000000",
    paddingVertical: 0,
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 16,
    flexGrow: 1,
  },
  headerContent: {
    gap: 0,
    marginBottom: 4,
  },
  scopeWrap: {
    height: 42,
  },
  scopeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  scopeChip: {
    height: 42,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "#E4E4E7",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  scopeChipActive: {
    backgroundColor: "#EB8100",
    borderColor: "#EB8100",
  },
  scopeChipText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "700",
    color: "#18181B",
  },
  scopeChipTextActive: {
    color: "#FFFFFF",
  },
  idleContent: {
    gap: 18,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#E4E4E7",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  resultRowFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
  },
  resultMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  resultMetaText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "500",
    color: "#7C7C7C",
  },
  resultOfferRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 9,
    minWidth: 0,
  },
  resultOfferBadge: {
    borderRadius: 999,
    backgroundColor: "#EB8100",
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: "80%",
  },
  resultOfferText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  resultMoreText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "500",
    color: "#111111",
    flexShrink: 1,
  },
  emptyWrap: {
    marginTop: 44,
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111111",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#7C7C7C",
    textAlign: "center",
  },
});

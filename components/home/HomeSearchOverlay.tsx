import React, { memo, useCallback, useMemo } from "react";
import {
  FlatList,
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
import BranchCard from "../BranchCard";
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

const RESULT_ITEM_HEIGHT = 144;

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
    () => Math.max(12, Math.round(18 * layoutScale)),
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
    ({ item }: { item: HomeSearchResult }) => (
      <View style={styles.resultItem}>
        <BranchCard
          {...item.branch}
          badgeRowOffset={-4}
          noElevation
          onPress={() => onSelectResult(item)}
        />
      </View>
    ),
    [onSelectResult]
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
          getItemLayout={(_, index) => ({
            length: RESULT_ITEM_HEIGHT,
            offset: RESULT_ITEM_HEIGHT * index,
            index,
          })}
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
    marginBottom: 10,
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
  resultItem: {
    marginBottom: 6,
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

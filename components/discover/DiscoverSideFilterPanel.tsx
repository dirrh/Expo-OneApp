import React, { memo, useCallback, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  PanGestureHandler,
  State,
  type PanGestureHandlerStateChangeEvent,
} from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";

interface Props {
  visible: boolean;
  onOpen: () => void;
  onClose: () => void;
  filterOptions: readonly string[];
  appliedFilters: Set<string>;
  setAppliedFilters: React.Dispatch<React.SetStateAction<Set<string>>>;
  rating: Set<string>;
  setRating: React.Dispatch<React.SetStateAction<Set<string>>>;
  setAppliedRatings: React.Dispatch<React.SetStateAction<Set<string>>>;
  subcategories: string[];
  sub: Set<string>;
  toggleSubcategory: (s: string) => void;
}

// Emoji ikony pre kategórie
const CATEGORY_EMOJIS: Record<string, string> = {
  Fitness: "🏋️",
  Relax: "🧖",
  Beauty: "💄",
  Gastro: "🍽️",
};

// Emoji ikony pre subcategories
const SUBCATEGORY_EMOJIS: Record<string, string> = {
  Vegan: "🌱",
  Coffee: "☕",
  Seafood: "🦐",
  Pizza: "🍕",
  Sushi: "🍣",
  "Fast Food": "🍟",
  Asian: "🥢",
  Beer: "🍺",
  Gym: "🏋️",
  "Personal Training": "💪",
  Training: "💪",
  "Group Classes": "👥",
  Classes: "👥",
  Yoga: "🧘",
  Haircut: "✂️",
  Manicure: "💅",
  Pedicure: "🦶",
  Facial: "✨",
  Massage: "💆",
  Spa: "🧖",
  Wellness: "🌿",
  Sauna: "🔥",
};

// Mapovanie subcategories na kategórie
const CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
  Gastro: ["Vegan", "Coffee", "Seafood", "Pizza", "Sushi", "Fast Food", "Asian", "Beer"],
  Fitness: ["Gym", "Training", "Classes", "Yoga"],
  Beauty: ["Haircut", "Manicure", "Pedicure", "Facial", "Massage"],
  Relax: ["Spa", "Wellness", "Massage", "Sauna"],
};

// Discover options (zatiaľ nič nerobia)
const DISCOVER_OPTIONS = ["topRated", "trending", "top10", "openNearYou"];

function DiscoverSideFilterPanel({
  visible,
  onOpen,
  onClose,
  filterOptions,
  appliedFilters,
  setAppliedFilters,
  rating,
  setRating,
  setAppliedRatings,
  subcategories,
  sub,
  toggleSubcategory,
}: Props) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const PANEL_WIDTH = 326;

  // Animácie
  const translateX = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const dragX = useRef(new Animated.Value(0)).current;
  const translateXValue = useRef(PANEL_WIDTH);
  const dragStartX = useRef(PANEL_WIDTH);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const pullHandleOpacity = useRef(new Animated.Value(visible ? 0 : 1)).current;

  // Discover state (zatiaľ nič nerobí)
  const [discoverOptions, setDiscoverOptions] = React.useState<Set<string>>(new Set());

  const openPanel = () => {
    dragX.setValue(0);
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(pullHandleOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closePanel = () => {
    dragX.setValue(0);
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: PANEL_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(pullHandleOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  useEffect(() => {
    const id = translateX.addListener(({ value }) => {
      translateXValue.current = value;
    });
    return () => translateX.removeListener(id);
  }, [translateX]);

  useEffect(() => {
    if (visible) {
      openPanel();
    } else {
      closePanel();
    }
  }, [visible]);

  useEffect(() => {
    pullHandleOpacity.setValue(visible ? 0 : 1);
  }, []);

  useEffect(() => {
    if (!visible) {
      translateX.setValue(PANEL_WIDTH);
      dragX.setValue(0);
      backdropOpacity.setValue(0);
      pullHandleOpacity.setValue(1);
    }
  }, [PANEL_WIDTH]);

  const toggleDiscover = (option: string) => {
    // Zatiaľ nič nerobí
    setDiscoverOptions((prev) => {
      const next = new Set(prev);
      if (next.has(option)) {
        next.delete(option);
      } else {
        next.add(option);
      }
      return next;
    });
  };

  const selectedCategories = filterOptions.filter((cat) => appliedFilters.has(cat));
  const isFilterActive = appliedFilters.size > 0 || rating.size > 0 || sub.size > 0;

  const panelTranslateX = useMemo(
    () => Animated.diffClamp(Animated.add(translateX, dragX), 0, PANEL_WIDTH),
    [translateX, dragX, PANEL_WIDTH]
  );

  const handleGestureEvent = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { translationX: dragX } }],
        { useNativeDriver: true }
      ),
    [dragX]
  );

  const handleGestureStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    const { state, translationX, velocityX } = event.nativeEvent;
    if (state === State.BEGAN) {
      dragStartX.current = translateXValue.current;
      dragX.setValue(0);
      return;
    }
    if (state !== State.END && state !== State.CANCELLED && state !== State.FAILED) {
      return;
    }

    const current = Math.max(0, Math.min(PANEL_WIDTH, dragStartX.current + translationX));
    translateX.setValue(current);
    dragX.setValue(0);

    const projected = current + velocityX * 120;
    if (projected > PANEL_WIDTH / 2) {
      if (visible) {
        closePanel();
      }
    } else {
      if (visible) {
        openPanel();
      } else {
        onOpen();
      }
    }
  };

  const handlePullHandleStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    const { state, translationX, velocityX } = event.nativeEvent;

    if (
      !visible &&
      state === State.END &&
      Math.abs(translationX) <= 6 &&
      Math.abs(velocityX) <= 250
    ) {
      onOpen();
      return;
    }

    handleGestureStateChange(event);
  };

  return (
    <>
      {/* Pull Handle - viditeľný keď panel nie je otvorený */}
      {!visible && (
        <>
          <PanGestureHandler
            onGestureEvent={handleGestureEvent}
            onHandlerStateChange={handlePullHandleStateChange}
            activeOffsetX={[-10, 999]}
            failOffsetY={[-10, 10]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Animated.View
              style={[
                styles.pullHandleContainer,
                {
                  opacity: pullHandleOpacity,
                  top: height / 2 - 27,
                },
              ]}
            >
              <View
                style={[
                  styles.pullHandle,
                  isFilterActive ? styles.pullHandleActive : styles.pullHandleInactive,
                ]}
              >
                <View
                  style={[
                    styles.pullHandleLine,
                    isFilterActive ? styles.pullHandleLineActive : styles.pullHandleLineInactive,
                  ]}
                />
              </View>
            </Animated.View>
          </PanGestureHandler>

          <PanGestureHandler
            onGestureEvent={handleGestureEvent}
            onHandlerStateChange={handleGestureStateChange}
            activeOffsetX={[-10, 999]}
            failOffsetY={[-10, 10]}
          >
            <View style={styles.edgeSwipeZone} pointerEvents="box-only" />
          </PanGestureHandler>
        </>
      )}

      <View
        style={[
          styles.overlay,
          { pointerEvents: visible ? "auto" : "none" },
        ]}
      >
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropOpacity,
              pointerEvents: visible ? "auto" : "none",
            },
          ]}
        >
          <TouchableWithoutFeedback onPress={closePanel}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
        </Animated.View>

        <Animated.View
          style={[
            styles.panel,
            {
              width: PANEL_WIDTH,
              transform: [{ translateX: panelTranslateX }],
            },
          ]}
        >
          {/* Orange Handle - pre swipe gesture na zatvorenie */}
          {visible && (
            <PanGestureHandler
              onGestureEvent={handleGestureEvent}
              onHandlerStateChange={handleGestureStateChange}
              activeOffsetX={[-999, 10]}
              failOffsetY={[-10, 10]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={styles.handleWrapper}>
                <View
                  style={[
                    styles.orangeHandle,
                    isFilterActive ? styles.pullHandleActive : styles.pullHandleInactive,
                  ]}
                >
                  <View
                    style={[
                      styles.orangeHandleLine,
                      isFilterActive ? styles.pullHandleLineActive : styles.pullHandleLineInactive,
                    ]}
                  />
                </View>
              </View>
            </PanGestureHandler>
          )}

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t("filter")}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closePanel}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color="#111111" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Categories */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("categories")}</Text>
              <View style={styles.chipsGrid}>
                {filterOptions.map((cat, index) => {
                  const isActive = appliedFilters.has(cat);
                  const emoji = CATEGORY_EMOJIS[cat] || "";
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.chip,
                        isActive && styles.chipActive,
                        index % 2 === 1 && styles.chipRight,
                      ]}
                      onPress={() =>
                        setAppliedFilters((prev) => {
                          const next = new Set(prev);
                          if (next.has(cat)) {
                            next.delete(cat);
                          } else {
                            next.add(cat);
                          }
                          return next;
                        })
                      }
                    >
                      <Text style={styles.chipContent}>
                        <Text>{emoji} </Text>
                        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                          {t(cat)}
                        </Text>
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Subcategories - zobrazí sa len keď je vybraná aspoň 1 kategória */}
            {selectedCategories.map((category) => {
              const currentSubcategories =
                CATEGORY_SUBCATEGORIES[category] || CATEGORY_SUBCATEGORIES.Gastro;
              return (
                <View style={styles.sectionSub} key={`sub-${category}`}>
                  <Text style={styles.sectionTitle}>
                    {t("subcategoriesFor", { category: t(category) })}
                  </Text>
                  <View style={styles.chipsGrid}>
                    {currentSubcategories.map((s, index) => {
                      const isActive = sub.has(s);
                      const emoji = SUBCATEGORY_EMOJIS[s] || "";
                      return (
                        <TouchableOpacity
                          key={`${category}-${s}`}
                          style={[
                            styles.chipSub,
                            isActive && styles.chipActive,
                            index % 2 === 1 && styles.chipRight,
                          ]}
                          onPress={() => toggleSubcategory(s)}
                        >
                          <Text style={styles.chipContent}>
                            <Text>{emoji} </Text>
                            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                              {t(s)}
                            </Text>
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}

            {/* Rating */}
            <View style={styles.sectionRating}>
              <Text style={styles.sectionTitle}>{t("rating")}</Text>
              <View style={styles.chipsGridRating}>
                {["4.7", "4.5", "4.0", "3.5", "3.0"].map((r, index) => {
                  const isActive = rating.has(r);
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.ratingChip,
                        isActive && styles.chipActive,
                      ]}
                      onPress={() => {
                        setRating((prev) =>
                          prev.has(r) && prev.size === 1 ? new Set() : new Set([r])
                        );
                        setAppliedRatings((prev) =>
                          prev.has(r) && prev.size === 1 ? new Set() : new Set([r])
                        );
                      }}
                    >
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                        ⭐ {r}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Discover (zatiaľ nič nerobí) */}
            <View style={styles.sectionDiscover}>
              <Text style={styles.sectionTitle}>{t("Discover")}</Text>
              <View style={styles.chipsGrid}>
                {DISCOVER_OPTIONS.map((option, index) => {
                  const isActive = discoverOptions.has(option);
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.chip,
                        isActive && styles.chipActive,
                        index % 2 === 1 && styles.chipRight,
                      ]}
                      onPress={() => toggleDiscover(option)}
                    >
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                        {t(option)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </>
  );
}

export default memo(DiscoverSideFilterPanel);

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    flexDirection: "row",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  panel: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderBottomLeftRadius: 30,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  handleWrapper: {
    position: "absolute",
    left: -22,
    top: "50%",
    marginTop: -27,
    width: 22,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10000,
  },
  orangeHandle: {
    width: 22,
    height: 54,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  orangeHandleLine: {
    width: 3,
    height: 22,
    borderRadius: 2,
  },
  pullHandleActive: {
    backgroundColor: "#EB8100",
  },
  pullHandleInactive: {
    backgroundColor: "#FFFFFF",
  },
  pullHandleLineActive: {
    backgroundColor: "#FFFFFF",
  },
  pullHandleLineInactive: {
    backgroundColor: "#AEAEAE",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 55,
    paddingHorizontal: 16,
    paddingBottom: 23,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 24,
    color: "#000000",
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F4F4F5",
    borderWidth: 1,
    borderColor: "#E4E4E7",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 0,
  },
  sectionSub: {
    paddingTop: 16,
  },
  sectionRating: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  sectionDiscover: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
    color: "#000000",
    marginBottom: 12,
  },
  chipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    width: 294,
  },
  chipsGridRating: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    width: 294,
  },
  chip: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "#E4E4E7",
    backgroundColor: "#FFFFFF",
    width: 141,
  },
  chipSub: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "#E4E4E7",
    backgroundColor: "#FFFFFF",
    width: 141,
  },
  chipRight: {
    // Pre grid alignment
  },
  chipActive: {
    backgroundColor: "#EB8100",
    borderColor: "#EB8100",
  },
  chipContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  chipText: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 18,
    color: "#000000",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  ratingChip: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "#E4E4E7",
    backgroundColor: "#FFFFFF",
    width: 90,
  },
  pullHandleContainer: {
    position: "absolute",
    right: 0,
    width: 22,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9998,
    pointerEvents: "auto",
  },
  pullHandle: {
    width: 22,
    height: 54,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  pullHandleLine: {
    width: 3,
    height: 22,
    borderRadius: 2,
  },
  edgeSwipeZone: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 24,
    backgroundColor: "transparent",
    zIndex: 9997,
  },
});

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  FlatList,
  InteractionManager,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Share,
  StyleSheet,
  useWindowDimensions,
  type ImageSourcePropType,
} from "react-native";
import { Asset } from "expo-asset";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import BottomSheet from "@gorhom/bottom-sheet";
import {
  PanGestureHandler,
  State,
  type PanGestureHandlerStateChangeEvent,
} from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";

import { HeroCarousel } from "../components/discover/HeroCarousel";
import { TabMenu } from "../components/discover/TabMenu";
import { NEWS_IMAGE_SOURCES } from "../components/discover/NewsSection";
import { BenefitsSection } from "../components/discover/BenefitsSection";
import { BenefitsBottomSheet } from "../components/discover/BenefitsBottomSheet";
import { HeroActions } from "../components/discover/HeroActions";
import { HeroInfo } from "../components/discover/HeroInfo";
import { InfoSection } from "../components/discover/InfoSection";
import { HomeSection } from "../components/discover/HomeSection";
import { ReviewsSection } from "../components/discover/ReviewsSection";
import { normalizeBranch } from "../lib/data/normalizers";
import { useAuth } from "../lib/AuthContext";
import { AUTH_GUARD_ENABLED } from "../lib/constants/auth";
import type { BranchData } from "../lib/interfaces";

type TabKey = "home" | "benefits" | "info" | "reviews";
type ContentRow = { key: "menu" | "content" };

type BusinessDetailRouteParams = {
  branch?: Partial<BranchData> & { id?: string };
};

type BusinessDetailRoute = RouteProp<
  { BusinessDetailScreen: BusinessDetailRouteParams },
  "BusinessDetailScreen"
>;

const MENU_TABS: TabKey[] = ["home", "benefits", "info", "reviews"];
const MENU_GAP = 10;
const SIDE_PADDING = 15;
const SNAP_THRESHOLD = 24;
const SCROLL_CACHE_LIMIT = 40;
const PREFETCH_NEWS_LIMIT = 6;

const CATEGORY_GALLERY: Record<string, ImageSourcePropType[]> = {
  fitness: [
    require("../assets/gallery/fitness/fitness_1.jpg"),
    require("../assets/gallery/fitness/fitness_2.jpg"),
    require("../assets/gallery/fitness/fitness_3.jpg"),
    require("../assets/gallery/fitness/fitness_4.jpg"),
  ],
  gastro: [
    require("../assets/gallery/gastro/gastro_1.jpg"),
    require("../assets/gallery/gastro/gastro_2.jpg"),
    require("../assets/gallery/gastro/gastro_3.jpg"),
    require("../assets/gallery/gastro/gastro_4.jpg"),
  ],
  relax: [
    require("../assets/gallery/relax/relax_1.jpg"),
    require("../assets/gallery/relax/relax_2.jpg"),
    require("../assets/gallery/relax/relax_3.jpg"),
    require("../assets/gallery/relax/relax_4.jpg"),
  ],
  beauty: [
    require("../assets/gallery/beauty/beauty_1.jpg"),
    require("../assets/gallery/beauty/beauty_2.jpg"),
    require("../assets/gallery/beauty/beauty_3.jpg"),
    require("../assets/gallery/beauty/beauty_4.jpg"),
  ],
};

export default function BusinessDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<BusinessDetailRoute>();
  const { user } = useAuth();
  const { t } = useTranslation();

  const branchParam = route.params?.branch;
  const branch = useMemo(() => normalizeBranch(branchParam ?? {}), [branchParam]);

  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [carouselIndex, setCarouselIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [isFavorite, setIsFavorite] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const flatListRef = useRef<FlatList<ContentRow>>(null);
  const lastScrollY = useRef(0);
  const prevScrollY = useRef(0);
  const scrollDirection = useRef<"up" | "down" | null>(null);
  const isStickyRef = useRef(false);
  const [isSticky, setIsSticky] = useState(false);
  const scrollPositionsRef = useRef(new Map<string, number>());
  const prevBranchKey = useRef<string | null>(null);
  const prevTabKey = useRef<string | null>(null);
  const benefitActionLockRef = useRef(false);

  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["15%", "35%"], []);

  const heroHeight = useMemo(() => Math.min(360, Math.max(240, Math.round(width * 0.7))), [width]);
  const menuItemWidth = useMemo(
    () => Math.min(88, Math.floor((width - SIDE_PADDING * 2 - MENU_TABS.length * 5) / MENU_TABS.length)),
    [width]
  );

  const heroContainerStyle = useMemo(() => ({ height: heroHeight }), [heroHeight]);
  const menuWrapperStyle = useMemo(
    () => [styles.menuWrapper, { paddingHorizontal: SIDE_PADDING }],
    []
  );
  const listContentStyle = useMemo(
    () => [styles.listContent, { paddingBottom: insets.bottom + 2 }],
    [insets.bottom]
  );
  const sectionWrapperStyle = useMemo(
    () => [styles.sectionWrapper, { paddingHorizontal: SIDE_PADDING }],
    []
  );

  const snapOffset = useMemo(() => heroHeight + MENU_GAP, [heroHeight]);
  const branchKey = useMemo(
    () => String(branch.id ?? branch.title ?? "unknown"),
    [branch.id, branch.title]
  );
  const positionKey = useCallback((key: string, tab: string) => `${key}:${tab}`, []);

  const images = useMemo(() => {
    const categoryKey = String(branch.category ?? "").trim().toLowerCase();
    const categoryImages = CATEGORY_GALLERY[categoryKey];
    const sourceImages =
      categoryImages && categoryImages.length > 0
        ? categoryImages
        : branch.images && branch.images.length > 0
          ? branch.images
          : [branch.image];

    return sourceImages.map((image, index) => ({
      id: String(index + 1),
      image,
    }));
  }, [branch.category, branch.images, branch.image]);

  const [userReviews, setUserReviews] = useState<
    Array<{
      id: string;
      name: string;
      rating: number;
      text: string;
      daysAgo: number;
      likes: number;
      comments: Array<{ id: string; name: string; text: string; daysAgo: number }>;
    }>
  >([]);

  const baseReviews = useMemo(
    () => [
      {
        id: "1",
        name: "Martin Kovac",
        rating: 5,
        text: t("reviewText1"),
        daysAgo: 2,
        likes: 8,
        comments: [
          { id: "c1-1", name: "365 GYM", text: t("replyThankYou"), daysAgo: 1 },
          { id: "c1-2", name: "Jozef Novak", text: t("replyAgree"), daysAgo: 1 },
        ],
      },
      {
        id: "2",
        name: "Peter Horvath",
        rating: 4,
        text: t("reviewText2"),
        daysAgo: 5,
        likes: 12,
        comments: [{ id: "c2-1", name: "365 GYM", text: t("replyPeakHours"), daysAgo: 4 }],
      },
      {
        id: "3",
        name: "Jana Novakova",
        rating: 5,
        text: t("reviewText3"),
        daysAgo: 7,
        likes: 15,
        comments: [],
      },
      {
        id: "4",
        name: "Tomas Fiala",
        rating: 5,
        text: t("reviewText4"),
        daysAgo: 12,
        likes: 6,
        comments: [],
      },
      {
        id: "5",
        name: "Eva Bielikova",
        rating: 3,
        text: t("reviewText5"),
        daysAgo: 14,
        likes: 4,
        comments: [{ id: "c5-1", name: "365 GYM", text: t("replyParking"), daysAgo: 13 }],
      },
      {
        id: "6",
        name: "Michal Stefanik",
        rating: 5,
        text: t("reviewText6"),
        daysAgo: 18,
        likes: 21,
        comments: [],
      },
      {
        id: "7",
        name: "Lucia Cerna",
        rating: 4,
        text: t("reviewText7"),
        daysAgo: 23,
        likes: 9,
        comments: [],
      },
      {
        id: "8",
        name: "Andrej Molnar",
        rating: 5,
        text: t("reviewText8"),
        daysAgo: 30,
        likes: 17,
        comments: [],
      },
    ],
    [t]
  );

  const reviews = useMemo(() => [...userReviews, ...baseReviews], [userReviews, baseReviews]);

  const hoursData = useMemo(
    () => [
      { day: "Monday", time: branch.hours },
      { day: "Tuesday", time: branch.hours },
      { day: "Wednesday", time: branch.hours, isToday: true },
      { day: "Thursday", time: branch.hours },
      { day: "Friday", time: branch.hours },
      { day: "Saturday", time: "7:00 - 20:00" },
      { day: "Sunday", time: "7:00 - 20:00" },
    ],
    [branch.hours]
  );

  const prefetchModuleIds = useMemo<number[]>(() => {
    const sources = [...images.map((item) => item.image), ...NEWS_IMAGE_SOURCES.slice(0, PREFETCH_NEWS_LIMIT)];
    const moduleSet = new Set<number>();
    sources.forEach((source) => {
      if (typeof source === "number") {
        moduleSet.add(source);
      }
    });
    return Array.from(moduleSet);
  }, [images]);

  const prefetchUris = useMemo<string[]>(() => {
    const sources = [...images.map((item) => item.image), ...NEWS_IMAGE_SOURCES.slice(0, PREFETCH_NEWS_LIMIT)];
    const uriSet = new Set<string>();
    sources.forEach((source) => {
      if (typeof source === "string") {
        uriSet.add(source);
        return;
      }

      if (typeof source === "number" || Array.isArray(source) || !source) {
        return;
      }

      if (typeof source.uri === "string") {
        uriSet.add(source.uri);
      }
    });
    return Array.from(uriSet);
  }, [images]);

  useEffect(() => {
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      const tasks: Array<Promise<unknown>> = [];
      if (prefetchModuleIds.length > 0) {
        tasks.push(Asset.loadAsync(prefetchModuleIds));
      }
      if (prefetchUris.length > 0) {
        tasks.push(Asset.loadAsync(prefetchUris));
      }

      if (tasks.length > 0) {
        Promise.allSettled(tasks).catch(() => undefined);
      }
    });

    return () => {
      interactionTask.cancel();
    };
  }, [prefetchModuleIds, prefetchUris]);

  const handleAddReview = useCallback(
    (rating: number, text: string) => {
      const newReview = {
        id: `user-${Date.now()}`,
        name: user?.email?.split("@")[0] || t("anonymousUser"),
        rating,
        text,
        daysAgo: 0,
        likes: 0,
        comments: [],
      };
      setUserReviews((prev) => [newReview, ...prev]);
    },
    [user, t]
  );

  const handleBack = useCallback(() => {
    if (typeof navigation.canGoBack === "function" && navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("Tabs", { screen: "Discover" });
  }, [navigation]);

  const handleFavoritePress = useCallback(() => {
    setIsFavorite((prev) => !prev);
  }, []);

  const handleNotificationsPress = useCallback(() => {
    setNotificationsEnabled((prev) => !prev);
  }, []);

  const handleSharePress = useCallback(async () => {
    const title = branch.title || t("business");
    const distance = branch.distance || "";
    const hours = branch.hours || "";

    try {
      await Share.share({
        message: `${title}${distance ? ` | ${distance}` : ""}${hours ? ` | ${hours}` : ""}`,
        title,
      });
    } catch {
      // Ignore cancelled share.
    }
  }, [branch.distance, branch.hours, branch.title, t]);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as TabKey);
  }, []);
  const handleShowAllBenefits = useCallback(() => {
    setActiveTab("benefits");
  }, []);

  const moveToAdjacentTab = useCallback((direction: -1 | 1) => {
    setActiveTab((prev) => {
      const currentIndex = MENU_TABS.indexOf(prev);
      if (currentIndex === -1) {
        return prev;
      }

      const nextIndex = currentIndex + direction;
      if (nextIndex < 0 || nextIndex >= MENU_TABS.length) {
        return prev;
      }

      return MENU_TABS[nextIndex];
    });
  }, []);

  const handleTabSwipeStateChange = useCallback(
    (event: PanGestureHandlerStateChangeEvent) => {
      const { state, translationX, translationY, velocityX } = event.nativeEvent;
      if (state !== State.END) {
        return;
      }

      if (Math.abs(translationX) <= Math.abs(translationY)) {
        return;
      }

      const swipeDistance = Math.abs(translationX);
      const swipeVelocity = Math.abs(velocityX);
      if (swipeDistance < 40 && swipeVelocity < 450) {
        return;
      }

      if (translationX < 0) {
        moveToAdjacentTab(1);
        return;
      }

      moveToAdjacentTab(-1);
    },
    [moveToAdjacentTab]
  );

  const handleActivateBenefit = useCallback(() => {
    if (benefitActionLockRef.current) {
      return;
    }
    benefitActionLockRef.current = true;

    if (!AUTH_GUARD_ENABLED || user) {
      navigation.navigate("Benefits");
    } else {
      sheetRef.current?.expand();
    }

    setTimeout(() => {
      benefitActionLockRef.current = false;
    }, 450);
  }, [user, navigation]);

  const handleLogin = useCallback(() => {
    navigation.navigate(AUTH_GUARD_ENABLED ? "Login" : "Benefits");
  }, [navigation]);

  const setCachedScrollPosition = useCallback((key: string, offset: number) => {
    const cache = scrollPositionsRef.current;
    if (cache.has(key)) {
      cache.delete(key);
    }
    cache.set(key, offset);

    while (cache.size > SCROLL_CACHE_LIMIT) {
      const oldestKey = cache.keys().next().value;
      if (!oldestKey) {
        break;
      }
      cache.delete(oldestKey);
    }
  }, []);

  const getCachedScrollPosition = useCallback((key: string): number | undefined => {
    const cache = scrollPositionsRef.current;
    const value = cache.get(key);
    if (typeof value !== "number") {
      return undefined;
    }

    cache.delete(key);
    cache.set(key, value);
    return value;
  }, []);

  const handleSnap = useCallback(() => {
    if (snapOffset <= 0) {
      return;
    }

    const y = lastScrollY.current;
    const direction = scrollDirection.current;

    if (y > 0 && y < snapOffset) {
      const snapTo = direction === "up" ? 0 : y >= SNAP_THRESHOLD ? snapOffset : 0;
      if (Math.abs(y - snapTo) > 1) {
        flatListRef.current?.scrollToOffset({ offset: snapTo, animated: true });
      }
    }
  }, [snapOffset]);

  const setStickyFromOffset = useCallback(
    (offset: number) => {
      const shouldStick = offset >= snapOffset - 1;
      if (shouldStick !== isStickyRef.current) {
        isStickyRef.current = shouldStick;
        setIsSticky(shouldStick);
      }
    },
    [snapOffset]
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      lastScrollY.current = y;

      if (y > prevScrollY.current) {
        scrollDirection.current = "down";
      } else if (y < prevScrollY.current) {
        scrollDirection.current = "up";
      }
      prevScrollY.current = y;

      setStickyFromOffset(y);
    },
    [setStickyFromOffset]
  );

  const restoreScroll = useCallback(
    (offset: number) => {
      lastScrollY.current = offset;
      prevScrollY.current = offset;
      scrollDirection.current = null;
      setStickyFromOffset(offset);

      requestAnimationFrame(() => {
        flatListRef.current?.scrollToOffset({ offset, animated: false });
      });
    },
    [setStickyFromOffset]
  );

  useEffect(() => {
    const previousBranch = prevBranchKey.current;
    const previousTab = prevTabKey.current;
    const sameBranch = previousBranch === branchKey;

    if (previousBranch && previousTab && (previousBranch !== branchKey || previousTab !== activeTab)) {
      setCachedScrollPosition(positionKey(previousBranch, previousTab), lastScrollY.current);
    }

    const savedOffset = getCachedScrollPosition(positionKey(branchKey, activeTab)) ?? 0;
    const keepSticky = sameBranch
      ? lastScrollY.current >= snapOffset - 1
      : savedOffset >= snapOffset - 1;
    const targetOffset = keepSticky ? Math.max(savedOffset, snapOffset) : savedOffset;

    prevBranchKey.current = branchKey;
    prevTabKey.current = activeTab;
    restoreScroll(targetOffset);
  }, [
    branchKey,
    activeTab,
    positionKey,
    restoreScroll,
    snapOffset,
    setCachedScrollPosition,
    getCachedScrollPosition,
  ]);

  const contentRows = useMemo<ContentRow[]>(() => [{ key: "menu" }, { key: "content" }], []);

  const renderSection: ListRenderItem<ContentRow> = useCallback(
    ({ item }) => {
      if (item.key === "menu") {
        return (
          <View style={menuWrapperStyle}>
            {isSticky && <View style={{ height: insets.top }} />}
            <TabMenu items={MENU_TABS} active={activeTab} onChange={handleTabChange} width={menuItemWidth} />
          </View>
        );
      }

      return (
        <PanGestureHandler
          onHandlerStateChange={handleTabSwipeStateChange}
          activeOffsetX={[-24, 24]}
          failOffsetY={[-12, 12]}
          simultaneousHandlers={flatListRef}
        >
          <View style={sectionWrapperStyle}>
            {activeTab === "home" && (
              <HomeSection
                title={branch.title}
                branchImage={branch.image}
                category={branch.category}
                onActivateBenefit={handleActivateBenefit}
                onShowAllBenefits={handleShowAllBenefits}
              />
            )}

            {activeTab === "benefits" && <BenefitsSection onActivate={handleActivateBenefit} />}

            {activeTab === "info" && (
              <InfoSection
                hours={hoursData}
                address={branch.address ?? ""}
                phone={branch.phone ?? ""}
                email={branch.email ?? ""}
                website={branch.website ?? ""}
                coordinates={branch.coordinates}
              />
            )}

            {activeTab === "reviews" && (
              <ReviewsSection
                rating={branch.rating}
                total={reviews.length}
                reviews={reviews}
                branchName={branch.title}
                onAddReview={handleAddReview}
              />
            )}
          </View>
        </PanGestureHandler>
      );
    },
    [
      branch.title,
      branch.image,
      branch.address,
      branch.phone,
      branch.email,
      branch.website,
      branch.coordinates,
      branch.category,
      branch.rating,
      handleActivateBenefit,
      handleShowAllBenefits,
      handleAddReview,
      handleTabSwipeStateChange,
      activeTab,
      handleTabChange,
      hoursData,
      insets.top,
      isSticky,
      menuItemWidth,
      menuWrapperStyle,
      reviews,
      sectionWrapperStyle,
    ]
  );

  const listHeader = useMemo(
    () => (
      <View style={[heroContainerStyle, { marginBottom: MENU_GAP }]}>
        <HeroCarousel
          data={images}
          height={heroHeight}
          width={width}
          index={carouselIndex}
          onIndexChange={setCarouselIndex}
        />

        <HeroActions
          topInset={insets.top}
          onBack={handleBack}
          onFavoritePress={handleFavoritePress}
          onNotificationsPress={handleNotificationsPress}
          onSharePress={handleSharePress}
          isFavorite={isFavorite}
          notificationsEnabled={notificationsEnabled}
        />

        <HeroInfo
          title={branch.title}
          rating={branch.rating}
          ratingCount={reviews.length}
          distance={branch.distance}
          hours={branch.hours}
        />
      </View>
    ),
    [
      heroContainerStyle,
      images,
      heroHeight,
      width,
      carouselIndex,
      insets.top,
      handleBack,
      handleFavoritePress,
      handleNotificationsPress,
      handleSharePress,
      isFavorite,
      notificationsEnabled,
      branch.title,
      branch.rating,
      branch.distance,
      branch.hours,
      reviews.length,
    ]
  );

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <FlatList
        ref={flatListRef}
        data={contentRows}
        keyExtractor={(item) => item.key}
        renderItem={renderSection}
        style={styles.list}
        contentContainerStyle={listContentStyle}
        ListHeaderComponent={listHeader}
        stickyHeaderIndices={[1]}
        extraData={`${activeTab}-${isSticky}`}
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onScrollEndDrag={handleSnap}
        onMomentumScrollEnd={handleSnap}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={5}
      />

      {AUTH_GUARD_ENABLED && activeTab === "benefits" && !user && (
        <BenefitsBottomSheet sheetRef={sheetRef} snapPoints={snapPoints} onLogin={handleLogin} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 0,
  },
  menuWrapper: {
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: "#fff",
  },
  sectionWrapper: {
    paddingTop: 12,
  },
});

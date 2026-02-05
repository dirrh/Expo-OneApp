import React, { memo, useMemo, useRef, useCallback, useEffect } from "react";
import { View, StyleSheet, ImageBackground, Text, TouchableOpacity, Platform, useWindowDimensions, FlatList, Pressable, StatusBar, Vibration, Share, Alert } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Video, ResizeMode } from "expo-av";
import BranchCard from "../components/BranchCard";
import { Asset } from "expo-asset";
import { useFocusEffect } from "@react-navigation/native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import {
    BRANCH_CARD_BASELINE_OFFSET,
    BRANCH_CARD_OVERLAY_PADDING_Y,
} from "../lib/constants/layout";

type ReelType = "image" | "video";

interface ReelItem {
    id: string;
    type: ReelType;
    background?: any;
    video?: any;
    poster?: any;
    branch: {
        title: string;
        image: any;
        rating: number;
        distance: string;
        hours: string;
        category: string;
        offerKeys: string[];
    };
}

// Offer keys for translation
const OFFER_KEYS = {
    discount20: "offer_discount20",
    freeEntryFriend: "offer_freeEntryFriend",
    discount10Monthly: "offer_discount10Monthly",
    discount15Today: "offer_discount15Today",
    twoForOne: "offer_twoForOne",
    firstMonthFree: "offer_firstMonthFree",
    personalTrainer: "offer_personalTrainer",
    discount25Weekend: "offer_discount25Weekend",
    freeTowel: "offer_freeTowel",
};

const REELS_DATA = [
    {
        id: "reel-1",
        type: "image" as ReelType,
        background: require("../assets/feed1.jpg"),
        branch: {
            title: "RED ROYAL GYM",
            image: require("../assets/365.jpg"),
            rating: 4.6,
            distance: "1.7 km",
            hours: "9:00 - 21:00",
            category: "Fitness",
            offerKeys: [OFFER_KEYS.discount20, OFFER_KEYS.freeEntryFriend],
        },
    },
    {
        id: "reel-2",
        type: "video" as ReelType,
        video: require("../assets/vertical1.mp4"),
        poster: require("../assets/feed1.jpg"),
        branch: {
            title: "GYM KLUB",
            image: require("../assets/klub.jpg"),
            rating: 4.7,
            distance: "2.1 km",
            hours: "8:00 - 22:00",
            category: "Fitness",
            offerKeys: [OFFER_KEYS.freeEntryFriend, OFFER_KEYS.discount10Monthly],
        },
    },
    {
        id: "reel-3",
        type: "image" as ReelType,
        background: require("../assets/feed2.jpg"),
        branch: {
            title: "DIAMOND GYM",
            image: require("../assets/royal.jpg"),
            rating: 4.4,
            distance: "1.3 km",
            hours: "7:00 - 20:00",
            category: "Fitness",
            offerKeys: [OFFER_KEYS.discount15Today, OFFER_KEYS.twoForOne],
        },
    },
    {
        id: "reel-4",
        type: "video" as ReelType,
        video: require("../assets/vertical2.mp4"),
        poster: require("../assets/feed2.jpg"),
        branch: {
            title: "FLEX FITNESS",
            image: require("../assets/klub.jpg"),
            rating: 4.8,
            distance: "0.9 km",
            hours: "6:00 - 23:00",
            category: "Fitness",
            offerKeys: [OFFER_KEYS.firstMonthFree, OFFER_KEYS.personalTrainer],
        },
    },
    {
        id: "reel-5",
        type: "image" as ReelType,
        background: require("../assets/feed3.jpg"),
        branch: {
            title: "POWER ZONE",
            image: require("../assets/royal.jpg"),
            rating: 4.5,
            distance: "3.2 km",
            hours: "7:00 - 22:00",
            category: "Fitness",
            offerKeys: [OFFER_KEYS.discount25Weekend, OFFER_KEYS.freeTowel],
        },
    },
];

const ReelItemComponent = memo(
    ({
        item,
        height,
        actionsBottom,
        insetsTop,
        branchCardWidth,
        branchCardOffset,
        isScrolling,
        isVisible,
    }: {
        item: ReelItem;
        height: number;
        actionsBottom: number;
        insetsTop: number;
        branchCardWidth: number;
        branchCardOffset: number;
        isScrolling: boolean;
        isVisible: boolean;
    }) => {
        const { t } = useTranslation();
        const videoRef = useRef<Video>(null);
        const lastTapRef = useRef(0);
        const [isLiked, setIsLiked] = React.useState(false);
        const posterOpacity = useSharedValue(1);
        const heartScale = useSharedValue(0);
        const heartOpacity = useSharedValue(0);
        const likeButtonScale = useSharedValue(1);
        const shareButtonScale = useSharedValue(1);

        // Translate offers
        const translatedOffers = item.branch.offerKeys.map(key => t(key));
        const shouldPlay = isVisible && !isScrolling;

        useEffect(() => {
            posterOpacity.value = 1;
        }, [item.id, posterOpacity]);

        const posterStyle = useAnimatedStyle(() => ({
            opacity: posterOpacity.value,
        }));

        const heartStyle = useAnimatedStyle(() => ({
            opacity: heartOpacity.value,
            transform: [{ scale: heartScale.value }],
        }));

        const triggerLike = useCallback(() => {
            setIsLiked(true);
            Vibration.vibrate(10);
            heartOpacity.value = 1;
            heartScale.value = 0.2;
            heartScale.value = withSequence(
                withSpring(1, { damping: 10, stiffness: 180 }),
                withTiming(1.15, { duration: 120 }),
                withTiming(0.9, { duration: 160 })
            );
            heartOpacity.value = withTiming(0, { duration: 320 });
        }, [heartOpacity, heartScale]);

        const handleDoubleTap = useCallback(() => {
            const now = Date.now();
            if (now - lastTapRef.current < 260) {
                triggerLike();
            }
            lastTapRef.current = now;
        }, [triggerLike]);
        const handleLikePress = useCallback(() => {
            setIsLiked((prev) => !prev);
            Vibration.vibrate(10);
            
            // Bounce animation
            likeButtonScale.value = withSequence(
                withSpring(1.3, { damping: 8, stiffness: 400 }),
                withSpring(1, { damping: 10, stiffness: 200 })
            );
        }, [likeButtonScale]);

        const handleSharePress = useCallback(async () => {
            Vibration.vibrate(10);
            
            // Bounce animation
            shareButtonScale.value = withSequence(
                withSpring(1.2, { damping: 8, stiffness: 400 }),
                withSpring(1, { damping: 10, stiffness: 200 })
            );

            try {
                const result = await Share.share({
                    message: `🏋️ Pozri sa na ${item.branch.title}! ⭐ ${item.branch.rating} • ${item.branch.distance}\n\nStiahni si OneApp a objav najlepšie miesta v okolí!`,
                    title: item.branch.title,
                });
                
                if (result.action === Share.sharedAction) {
                    if (result.activityType) {
                        // Shared with activity type
                    } else {
                        // Shared
                    }
                }
            } catch (error: any) {
                Alert.alert('Chyba', 'Nepodarilo sa zdieľať');
            }
        }, [item.branch.title, item.branch.rating, item.branch.distance, shareButtonScale]);

        const likeButtonAnimStyle = useAnimatedStyle(() => ({
            transform: [{ scale: likeButtonScale.value }],
        }));

        const shareButtonAnimStyle = useAnimatedStyle(() => ({
            transform: [{ scale: shareButtonScale.value }],
        }));

        const posterSource = item.poster ?? item.background ?? item.branch.image;
        // Overlay content (shared between image and video)
        const OverlayContent = (
            <>
                    {/* Top bar - posunuta pod notch */}
                    <View style={[styles.topBar, { marginTop: insetsTop }]}>
                        <View style={styles.card}>
                            <TouchableOpacity style={styles.row} activeOpacity={0.85}>
                                <Ionicons name="location-outline" size={18} color="#000" />
                                <Text style={styles.rowTextBold} numberOfLines={1}>
                                {t("yourLocation")}
                                </Text>
                                <Ionicons name="chevron-down-outline" size={16} color="#000" style={styles.caret} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Like/Share buttons */}
                    <View style={[styles.actionsColumn, { bottom: actionsBottom }]}>
                        {/* Like Button */}
                        <Animated.View style={likeButtonAnimStyle}>
                            <TouchableOpacity 
                                style={styles.actionBtn} 
                                activeOpacity={0.7} 
                                onPress={handleLikePress}
                            >
                                <View style={styles.actionIconWrap}>
                                    <Ionicons 
                                        name={isLiked ? "heart" : "heart-outline"} 
                                        size={28} 
                                        color={isLiked ? "#FF2D55" : "#fff"} 
                                        style={styles.iconShadow}
                                    />
                                </View>
                                <Text style={styles.actionLabel} numberOfLines={1}>{t("like")}</Text>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* Share Button */}
                        <Animated.View style={shareButtonAnimStyle}>
                            <TouchableOpacity 
                                style={styles.actionBtn} 
                                activeOpacity={0.7} 
                                onPress={handleSharePress}
                            >
                                <View style={styles.actionIconWrap}>
                                    <Ionicons 
                                        name="share-social-outline" 
                                        size={28} 
                                        color="#fff" 
                                        style={styles.iconShadow}
                                    />
                                </View>
                                <Text style={styles.actionLabel} numberOfLines={1}>{t("share")}</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>

                    {/* Branch card */}
                    <View
                        style={[
                            styles.branchCardWrap,
                            { width: branchCardWidth, marginBottom: branchCardOffset },
                        ]}
                    >
                        <BranchCard
                            title={item.branch.title}
                            image={item.branch.image}
                            rating={item.branch.rating}
                            distance={item.branch.distance}
                            hours={item.branch.hours}
                            category={item.branch.category}
                            offers={translatedOffers}
                            badgeVariant="more"
                            cardPaddingBottom={14}
                        />
                </View>
            </>
        );

        if (item.type === "video" && item.video) {
            return (
                <View style={[styles.reel, { height }]}>
                    <View style={styles.videoContainer}>
                        <ImageBackground source={posterSource} style={styles.video} resizeMode="cover" blurRadius={12} />
                        <Video
                            ref={videoRef}
                            source={item.video}
                            style={styles.video}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={shouldPlay}
                            isLooping
                            isMuted
                            onReadyForDisplay={() => {
                                posterOpacity.value = withTiming(0, { duration: 250 });
                            }}
                        />
                        <Animated.View style={[styles.posterOverlay, posterStyle]} pointerEvents="none">
                            <ImageBackground source={posterSource} style={styles.video} resizeMode="cover" blurRadius={16} />
                        </Animated.View>
                        <Pressable style={StyleSheet.absoluteFill} onPress={handleDoubleTap} />
                        <Animated.View style={[styles.heartBurst, heartStyle]} pointerEvents="none">
                            <Ionicons name="heart" size={86} color="#fff" />
                        </Animated.View>
                        <View style={styles.videoOverlay}>
                            {OverlayContent}
                        </View>
                    </View>
                </View>
            );
        }

        return (
            <View style={[styles.reel, { height }]}>
                <ImageBackground source={item.background} style={styles.hero} resizeMode="cover">
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleDoubleTap} />
                    <Animated.View style={[styles.heartBurst, heartStyle]} pointerEvents="none">
                        <Ionicons name="heart" size={86} color="#fff" />
                    </Animated.View>
                    {OverlayContent}
                </ImageBackground>
            </View>
        );
    }
);

export default function FeedScreen() {
    const insets = useSafeAreaInsets();
    const tabBarHeight = useBottomTabBarHeight();
    const { height: screenHeight, width: screenWidth } = useWindowDimensions();
    const [visibleIndex, setVisibleIndex] = React.useState(0);
    const [isScrolling, setIsScrolling] = React.useState(false);
    const listRef = useRef<FlatList>(null);
    const currentIndexRef = useRef(0);
    const scrollStartIndexRef = useRef(0);
    const branchCardWidth = useMemo(
        () => Math.max(280, Math.min(340, screenWidth - 48)),
        [screenWidth]
    );
    const bottomOverlayOffset = useMemo(
        () => Math.max(0, tabBarHeight - 16) -30,
        [tabBarHeight]
    );

    const branchCardOffset = useMemo(
        () => Math.max(0, tabBarHeight + BRANCH_CARD_BASELINE_OFFSET + BRANCH_CARD_OVERLAY_PADDING_Y+37),
        [tabBarHeight]
    );
    
    const actionsBottom = useMemo(
        () => Math.max(120, Math.round(screenHeight * 0.22) + bottomOverlayOffset),
        [screenHeight, bottomOverlayOffset]
    );

    const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            const nextIndex = viewableItems[0].index ?? 0;
            currentIndexRef.current = nextIndex;
            setVisibleIndex(nextIndex);
        }
    }, []);

    const viewabilityConfig = useMemo(() => ({
        itemVisiblePercentThreshold: 70,
    }), []);

    useFocusEffect(
        useCallback(() => {
            StatusBar.setBarStyle("light-content", true);
            return () => StatusBar.setBarStyle("dark-content", true);
        }, [])
    );

    useEffect(() => {
        const preload = async (index: number) => {
            const candidates = [index - 1, index + 1]
                .map((i) => REELS_DATA[i])
                .filter((item) => item && item.video)
                .map((item) => Asset.fromModule(item.video));
            for (const asset of candidates) {
                try {
                    await asset.downloadAsync();
                } catch {
                    // ignore preload errors for local dummy assets
                }
            }
        };
        preload(visibleIndex);
    }, [visibleIndex]);

    const clampIndex = useCallback(
        (index: number) => Math.max(0, Math.min(REELS_DATA.length - 1, index)),
        []
    );

    const handleMomentumStart = useCallback(() => {
        setIsScrolling(true);
        scrollStartIndexRef.current = currentIndexRef.current;
    }, []);

    const handleMomentumEnd = useCallback(
        (e: any) => {
            const offsetY = e.nativeEvent.contentOffset.y;
            const rawIndex = Math.round(offsetY / screenHeight);
            const startIndex = scrollStartIndexRef.current;
            let targetIndex = rawIndex;
            if (Math.abs(rawIndex - startIndex) > 1) {
                targetIndex = startIndex + (rawIndex > startIndex ? 1 : -1);
            }
            targetIndex = clampIndex(targetIndex);
            if (targetIndex !== rawIndex) {
                listRef.current?.scrollToIndex({ index: targetIndex, animated: true });
            }
            currentIndexRef.current = targetIndex;
            setVisibleIndex(targetIndex);
            setIsScrolling(false);
        },
        [clampIndex, screenHeight]
    );

    return (
        <View style={styles.container}>
            <FlatList
                ref={listRef}
                data={REELS_DATA}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                    <ReelItemComponent
                        item={item}
                        height={screenHeight}
                        actionsBottom={actionsBottom}
                        insetsTop={insets.top}
                        branchCardWidth={branchCardWidth}
                        branchCardOffset={branchCardOffset}
                        isScrolling={isScrolling}
                        isVisible={index === visibleIndex}
                    />
                )}
                showsVerticalScrollIndicator={false}
                pagingEnabled
                snapToInterval={screenHeight}
                snapToAlignment="start"
                decelerationRate="fast"
                disableIntervalMomentum
                initialNumToRender={2}
                maxToRenderPerBatch={3}
                windowSize={5}
                updateCellsBatchingPeriod={50}
                removeClippedSubviews={Platform.OS !== "web"}
                getItemLayout={(_, index) => ({
                    length: screenHeight,
                    offset: screenHeight * index,
                    index,
                })}
                style={{ height: screenHeight }}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                onScrollBeginDrag={() => {
                    setIsScrolling(true);
                    scrollStartIndexRef.current = currentIndexRef.current;
                }}
                onScrollEndDrag={() => setIsScrolling(false)}
                onMomentumScrollBegin={handleMomentumStart}
                onMomentumScrollEnd={handleMomentumEnd}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
    },
    reel: {
        width: "100%",
    },
    hero: {
        flex: 1,
        justifyContent: "space-between",
    },
    videoContainer: {
        flex: 1,
        backgroundColor: "#000",
    },
    video: {
        ...StyleSheet.absoluteFillObject,
    },
    posterOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    videoOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "space-between",
    },
    topBar: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        paddingHorizontal: 16,
    },
    card: {
        flex: 1,
        maxWidth: 200,
        marginRight: 24,
        backgroundColor: "white",
        borderRadius: 18,
        overflow: "hidden",
        ...(Platform.OS === "web"
            ? { boxShadow: "0 6px 12px rgba(0, 0, 0, 0.14)" }
            : {
                shadowColor: "#000",
                shadowOpacity: 0.14,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 6 },
                elevation: 10,
            }),
    },
    row: {
        height: 44,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    rowTextBold: { flex: 1, fontWeight: "700" },
    caret: { opacity: 0.7 },
    actionsColumn: {
        position: "absolute",
        right: 16,
        alignItems: "center",
        gap: 16,
    },
    actionBtn: {
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 4,
    },
    actionIconWrap: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        // Shadow for visibility on light backgrounds
        ...(Platform.OS === "web"
            ? { filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }
            : {}),
    },
    actionLabel: {
        fontSize: 14,
        fontWeight: "700",
        color: "#fff",
        lineHeight: 17,
        textAlign: "center",
        textShadowColor: "rgba(0,0,0,0.7)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    iconShadow: {
        textShadowColor: "rgba(0,0,0,0.7)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    branchCardWrap: {
        alignSelf: "center",
    },
    heartBurst: {
        position: "absolute",
        top: "42%",
        left: 0,
        right: 0,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 4,
    },
});

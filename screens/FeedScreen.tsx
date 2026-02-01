import React, { memo, useMemo, useRef, useCallback } from "react";
import { View, StyleSheet, ImageBackground, Image, Text, TouchableOpacity, Platform, useWindowDimensions, FlatList } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Video, ResizeMode } from "expo-av";
import BranchCard from "../components/BranchCard";

type ReelType = "image" | "video";

interface ReelItem {
    id: string;
    type: ReelType;
    background?: any;
    video?: any;
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
        tabBarHeight,
        insetsBottom,
        isVisible,
    }: {
        item: ReelItem;
        height: number;
        actionsBottom: number;
        insetsTop: number;
        tabBarHeight: number;
        insetsBottom: number;
        isVisible: boolean;
    }) => {
        const { t } = useTranslation();
        const videoRef = useRef<Video>(null);

        // Translate offers
        const translatedOffers = item.branch.offerKeys.map(key => t(key));

        // Overlay content (shared between image and video)
        const OverlayContent = (
            <>
                {/* Top bar - posunuta pod notch */}
                <View style={[styles.topBar, { marginTop: insetsTop + 16 }]}>
                    <View style={styles.card}>
                        <TouchableOpacity style={styles.row} activeOpacity={0.85}>
                            <Image source={require("../images/pin.png")} style={styles.rowIcon} resizeMode="contain" />
                            <Text style={styles.rowTextBold} numberOfLines={1}>
                                {t("yourLocation")}
                            </Text>
                            <Image source={require("../images/options.png")} style={styles.caret} resizeMode="contain" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Like/Share buttons */}
                <View style={[styles.actionsColumn, { bottom: actionsBottom }]}>
                    <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8}>
                        <Image source={require("../images/feed/heart.png")} style={styles.actionIcon} resizeMode="contain" />
                        <Text style={styles.actionLabel}>{t("like")}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8}>
                        <Image source={require("../images/feed/share.png")} style={styles.actionIcon} resizeMode="contain" />
                        <Text style={styles.actionLabel}>{t("share")}</Text>
                    </TouchableOpacity>
                </View>

                {/* Branch card */}
                <View
                    style={[
                        styles.branchCardWrap,
                        { marginBottom: 16 },
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
                        badgePosition="inline"
                        badgeInlineOffset={16}
                    />
                </View>
            </>
        );

        if (item.type === "video" && item.video) {
            return (
                <View style={[styles.reel, { height }]}>
                    <View style={styles.videoContainer}>
                        <Video
                            ref={videoRef}
                            source={item.video}
                            style={styles.video}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={isVisible}
                            isLooping
                            isMuted
                        />
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
                    {OverlayContent}
                </ImageBackground>
            </View>
        );
    }
);

export default function FeedScreen() {
    const insets = useSafeAreaInsets();
    const tabBarHeight = useBottomTabBarHeight();
    const { height: screenHeight } = useWindowDimensions();
    const [visibleIndex, setVisibleIndex] = React.useState(0);
    
    const actionsBottom = useMemo(
        () => Math.max(120, Math.round(screenHeight * 0.22)),
        [screenHeight]
    );

    const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setVisibleIndex(viewableItems[0].index ?? 0);
        }
    }, []);

    const viewabilityConfig = useMemo(() => ({
        itemVisiblePercentThreshold: 50,
    }), []);

    return (
        <View style={styles.container}>
            <FlatList
                data={REELS_DATA}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                    <ReelItemComponent
                        item={item}
                        height={screenHeight}
                        actionsBottom={actionsBottom}
                        insetsTop={insets.top}
                        tabBarHeight={tabBarHeight}
                        insetsBottom={insets.bottom}
                        isVisible={index === visibleIndex}
                    />
                )}
                showsVerticalScrollIndicator={false}
                pagingEnabled
                snapToInterval={screenHeight}
                snapToAlignment="start"
                decelerationRate="fast"
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
    rowIcon: { width: 18, height: 18 },
    rowTextBold: { flex: 1, fontWeight: "700" },
    caret: { width: 16, height: 16, opacity: 0.7 },
    actionsColumn: {
        position: "absolute",
        right: 16,
        alignItems: "center",
        gap: 20,
    },
    actionBtn: {
        alignItems: "center",
        gap: 4,
    },
    actionIcon: {
        width: 32,
        height: 32,
    },
    actionLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: "#fff",
        textShadowColor: "rgba(0,0,0,0.5)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    branchCardWrap: {
        paddingHorizontal: 16,
    },
});

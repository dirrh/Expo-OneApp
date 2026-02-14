import React, { memo, useMemo, useRef, useCallback, useEffect } from "react";
import {
    View,
    StyleSheet,
    ImageBackground,
    Image,
    Text,
    TouchableOpacity,
    Platform,
    useWindowDimensions,
    FlatList,
    StatusBar,
    Share,
    Alert,
    AppState,
    type AppStateStatus,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import BranchCard from "../components/BranchCard";
import { useFocusEffect, useIsFocused, useNavigation } from "@react-navigation/native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import {
    BRANCH_CARD_BASELINE_OFFSET,
    BRANCH_CARD_OVERLAY_PADDING_Y,
    BRANCH_CARD_EXTRA_OFFSET,
    TAB_BAR_BASE_HEIGHT,
    TAB_BAR_MIN_INSET,
} from "../lib/constants/layout";

type ReelType = "image" | "video";
type FeedOfferKey = (typeof OFFER_KEYS)[keyof typeof OFFER_KEYS];

interface ReelItem {
    id: string;
    type: ReelType;
    background?: any;
    video?: any;
    poster?: any;
    branch: {
        title: string;
        image: any;
        images?: any[];
        rating: number;
        distance: string;
        hours: string;
        category: string;
        offerKeys: FeedOfferKey[];
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

const OFFER_DESCRIPTION_KEYS: Record<FeedOfferKey, string> = {
    [OFFER_KEYS.discount20]: "feedOfferDescDiscount20",
    [OFFER_KEYS.freeEntryFriend]: "feedOfferDescFreeEntryFriend",
    [OFFER_KEYS.discount10Monthly]: "feedOfferDescDiscount10Monthly",
    [OFFER_KEYS.discount15Today]: "feedOfferDescDiscount15Today",
    [OFFER_KEYS.twoForOne]: "feedOfferDescTwoForOne",
    [OFFER_KEYS.firstMonthFree]: "feedOfferDescFirstMonthFree",
    [OFFER_KEYS.personalTrainer]: "feedOfferDescPersonalTrainer",
    [OFFER_KEYS.discount25Weekend]: "feedOfferDescDiscount25Weekend",
    [OFFER_KEYS.freeTowel]: "feedOfferDescFreeTowel",
};

const OFFER_DESCRIPTION_DEFAULTS: Record<FeedOfferKey, string> = {
    [OFFER_KEYS.discount20]: "Get 20% off your first entry when you activate this offer.",
    [OFFER_KEYS.freeEntryFriend]: "Bring your friend for free and train together today.",
    [OFFER_KEYS.discount10Monthly]: "Save 10% on your monthly pass this week.",
    [OFFER_KEYS.discount15Today]: "Use this offer today and get 15% off your purchase.",
    [OFFER_KEYS.twoForOne]: "Buy one entry and get the second one free.",
    [OFFER_KEYS.firstMonthFree]: "Start now and enjoy your first month free.",
    [OFFER_KEYS.personalTrainer]: "Get a guided session with a personal trainer included.",
    [OFFER_KEYS.discount25Weekend]: "Get 25% off selected services during the weekend.",
    [OFFER_KEYS.freeTowel]: "Receive a free towel service with your visit.",
};

const OVERLAY_CARD_GAP = 12;
const PINCH_SCALE_ACTIVATION_THRESHOLD = 0.06;
const TAP_MAX_DISTANCE = 12;
const DOUBLE_TAP_MAX_DELAY = 250;
const TAP_MAX_DURATION = 180;
const LONG_PRESS_MIN_DURATION = 260;
const LONG_PRESS_MAX_DISTANCE = 14;
const SPEED_BOOST_RATE = 2;
const SPEED_BOOST_LEFT_ZONE_RATIO = 0.4;
const SOURCE_ANCHOR_SWITCH_THRESHOLD = 0.58;
const LIKE_BURST_SIZE = 86;

// Gallery images pre Fitness kategóriu
const FITNESS_GALLERY = [
    require("../assets/gallery/fitness/fitness_1.jpg"),
    require("../assets/gallery/fitness/fitness_2.jpg"),
    require("../assets/gallery/fitness/fitness_3.jpg"),
    require("../assets/gallery/fitness/fitness_4.jpg"),
];

const REELS_DATA = [
    {
        id: "reel-1",
        type: "video" as ReelType,
        video: require("../assets/stock/15859732.mp4"),
        poster: require("../assets/feed1.jpg"),
        branch: {
            title: "RED ROYAL GYM",
            image: require("../assets/365.jpg"),
            images: [require("../assets/365.jpg"), ...FITNESS_GALLERY],
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
        video: require("../assets/stock/10740030.mp4"),
        poster: require("../assets/feed1.jpg"),
        branch: {
            title: "GYM KLUB",
            image: require("../assets/klub.jpg"),
            images: [require("../assets/klub.jpg"), ...FITNESS_GALLERY],
            rating: 4.7,
            distance: "2.1 km",
            hours: "8:00 - 22:00",
            category: "Fitness",
            offerKeys: [OFFER_KEYS.freeEntryFriend, OFFER_KEYS.discount10Monthly],
        },
    },
    {
        id: "reel-3",
        type: "video" as ReelType,
        video: require("../assets/vertical1.mp4"),
        poster: require("../assets/feed2.jpg"),
        branch: {
            title: "DIAMOND GYM",
            image: require("../assets/royal.jpg"),
            images: [require("../assets/royal.jpg"), ...FITNESS_GALLERY],
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
        video: require("../assets/stock/15859732.mp4"),
        poster: require("../assets/feed2.jpg"),
        branch: {
            title: "FLEX FITNESS",
            image: require("../assets/klub.jpg"),
            images: [require("../assets/klub.jpg"), ...FITNESS_GALLERY],
            rating: 4.8,
            distance: "0.9 km",
            hours: "6:00 - 23:00",
            category: "Fitness",
            offerKeys: [OFFER_KEYS.firstMonthFree, OFFER_KEYS.personalTrainer],
        },
    },
    {
        id: "reel-5",
        type: "video" as ReelType,
        video: require("../assets/stock/10740030.mp4"),
        poster: require("../assets/feed3.jpg"),
        branch: {
            title: "POWER ZONE",
            image: require("../assets/royal.jpg"),
            images: [require("../assets/royal.jpg"), ...FITNESS_GALLERY],
            rating: 4.5,
            distance: "3.2 km",
            hours: "7:00 - 22:00",
            category: "Fitness",
            offerKeys: [OFFER_KEYS.discount25Weekend, OFFER_KEYS.freeTowel],
        },
    },
];

interface ReelLoopItem {
    key: string;
    reel: ReelItem;
    sourceIndex: number;
    loopIndex: number;
}

const REEL_LOOP_REPEAT = 240;
const REEL_LOOP_EDGE_BUFFER_CYCLES = 2;
const REEL_BASE_COUNT = REELS_DATA.length;
const REEL_LOOP_TOTAL_COUNT = REEL_BASE_COUNT * REEL_LOOP_REPEAT;
const REEL_LOOP_CENTER_INDEX =
    REEL_BASE_COUNT === 0 ? 0 : Math.floor(REEL_LOOP_REPEAT / 2) * REEL_BASE_COUNT;

const positiveModulo = (value: number, divisor: number) => {
    if (divisor === 0) {
        return 0;
    }
    const remainder = value % divisor;
    return remainder < 0 ? remainder + divisor : remainder;
};

const normalizeToLoopCenterIndex = (index: number) => {
    if (REEL_BASE_COUNT === 0) {
        return 0;
    }
    return REEL_LOOP_CENTER_INDEX + positiveModulo(index, REEL_BASE_COUNT);
};

const REELS_LOOP_DATA: ReelLoopItem[] =
    REEL_BASE_COUNT === 0
        ? []
        : Array.from({ length: REEL_LOOP_TOTAL_COUNT }, (_, loopIndex) => {
              const sourceIndex = positiveModulo(loopIndex, REEL_BASE_COUNT);
              const reel = REELS_DATA[sourceIndex];
              return {
                  key: `${reel.id}-loop-${loopIndex}`,
                  reel,
                  sourceIndex,
                  loopIndex,
              };
          });

const ReelItemComponent = memo(
    ({
        item,
        height,
        actionsBottom,
        branchCardWidth,
        overlayViewportWidth,
        branchCardOffset,
        isScrolling,
        isVisible,
        isAudioVisible,
        isSourceAnchor,
        isSourceCandidate,
        isPlaybackAllowed,
        isZooming,
        onZoomStateChange,
        onPinchTouchStateChange,
        onSpeedBoostStateChange,
    }: {
        item: ReelItem;
        height: number;
        actionsBottom: number;
        branchCardWidth: number;
        overlayViewportWidth: number;
        branchCardOffset: number;
        isScrolling: boolean;
        isVisible: boolean;
        isAudioVisible: boolean;
        isSourceAnchor: boolean;
        isSourceCandidate: boolean;
        isPlaybackAllowed: boolean;
        isZooming: boolean;
        onZoomStateChange: (value: boolean) => void;
        onPinchTouchStateChange: (value: boolean) => void;
        onSpeedBoostStateChange: (value: boolean) => void;
    }) => {
        const { t } = useTranslation();
        // Keep source attached on iOS while the cell is mounted.
        // Frequent source replacement can cause visible frame drops/black flashes during fast swipes.
        const activeVideoSource =
            item.type === "video" && ((Platform.OS === "ios" && Boolean(item.video)) || isSourceCandidate)
                ? item.video ?? null
                : null;
        const videoPlayer = useVideoPlayer(activeVideoSource, (player) => {
            player.loop = true;
            player.muted = true;
            player.volume = 0;
            player.playbackRate = 1;
            player.keepScreenOnWhilePlaying = false;
            player.audioMixingMode = "doNotMix";
            try {
                player.bufferOptions =
                    Platform.OS === "android"
                        ? {
                              preferredForwardBufferDuration: 4,
                              minBufferForPlayback: 1,
                              maxBufferBytes: 2 * 1024 * 1024,
                              prioritizeTimeOverSizeThreshold: true,
                          }
                        : {
                              preferredForwardBufferDuration: 1,
                              waitsToMinimizeStalling: false,
                          };
            } catch {
                // ignore unsupported buffer tuning
            }
        });
        const [isLiked, setIsLiked] = React.useState(false);
        const [isMuted, setIsMuted] = React.useState(false);
        const [isHoldPaused, setIsHoldPaused] = React.useState(false);
        const [isSpeedBoosting, setIsSpeedBoosting] = React.useState(false);
        const [isPosterVisible, setIsPosterVisible] = React.useState(true);
        const [volumeIconName, setVolumeIconName] = React.useState<"volume-mute" | "volume-high">("volume-high");
        const suppressMuteUntilRef = useRef(0);
        const skipInitialPosterOnMountRef = useRef(Platform.OS === "ios" && isVisible);
        const posterOpacity = useSharedValue(1);
        const volumeScale = useSharedValue(0.82);
        const volumeOpacity = useSharedValue(0);
        const likeBurstX = useSharedValue(overlayViewportWidth / 2);
        const likeBurstY = useSharedValue(height / 2);
        const likeBurstScale = useSharedValue(0.75);
        const likeBurstOpacity = useSharedValue(0);
        const likeBurstTranslateY = useSharedValue(0);
        const pinchScale = useSharedValue(1);
        const pinchFocalX = useSharedValue(overlayViewportWidth / 2);
        const pinchFocalY = useSharedValue(height / 2);
        const zoomGestureActivated = useSharedValue(false);

        // Translate offers
        const translatedOffers = item.branch.offerKeys.map(key => t(key));
        const overlaySideInset = useMemo(
            () => Math.max(0, Math.floor((overlayViewportWidth - branchCardWidth) / 2)),
            [overlayViewportWidth, branchCardWidth]
        );
        const overlayCards = useMemo(
            () => [
                { id: `${item.id}-branch`, type: "branch" as const },
                ...item.branch.offerKeys.map((offerKey, index) => ({
                    id: `${item.id}-offer-${index}-${offerKey}`,
                    type: "offer" as const,
                    offerKey,
                })),
            ],
            [item.id, item.branch.offerKeys]
        );
        const shouldPlay = isPlaybackAllowed && (isVisible || (isScrolling && isSourceAnchor && !isVisible)) && !isHoldPaused;
        const isAudioFocused = isPlaybackAllowed && isAudioVisible && !isHoldPaused;
        const safelyApplyToPlayer = useCallback(
            (action: () => void) => {
                try {
                    action();
                } catch {
                    // native player can be in transient state during fast unmount/remount
                }
            },
            []
        );

        useEffect(() => {
            if (item.type !== "video" || !item.video || !activeVideoSource) {
                safelyApplyToPlayer(() => {
                    videoPlayer.pause();
                    videoPlayer.muted = true;
                    videoPlayer.volume = 0;
                    videoPlayer.playbackRate = 1;
                });
                return;
            }

            if (shouldPlay) {
                safelyApplyToPlayer(() => videoPlayer.play());
            } else {
                safelyApplyToPlayer(() => videoPlayer.pause());
            }
        }, [activeVideoSource, item.type, item.video, safelyApplyToPlayer, shouldPlay, videoPlayer]);

        useEffect(() => {
            if (item.type === "video" && item.video && activeVideoSource) {
                safelyApplyToPlayer(() => {
                    const shouldMute = isMuted || !isAudioFocused;
                    // Keep audio strictly tied to the currently focused reel.
                    videoPlayer.muted = shouldMute;
                    videoPlayer.volume = shouldMute ? 0 : 1;
                    if (!shouldMute) {
                        videoPlayer.play();
                    }
                });
            }
        }, [activeVideoSource, isAudioFocused, isMuted, item.type, item.video, safelyApplyToPlayer, videoPlayer]);

        useEffect(() => {
            if (item.type === "video" && item.video && activeVideoSource) {
                safelyApplyToPlayer(() => {
                    videoPlayer.playbackRate = isSpeedBoosting ? SPEED_BOOST_RATE : 1;
                });
            }
        }, [activeVideoSource, isSpeedBoosting, item.type, item.video, safelyApplyToPlayer, videoPlayer]);

        useEffect(
            () => () => {
                safelyApplyToPlayer(() => {
                    videoPlayer.pause();
                    videoPlayer.muted = true;
                    videoPlayer.volume = 0;
                    videoPlayer.playbackRate = 1;
                });
            },
            [safelyApplyToPlayer, videoPlayer]
        );

        useEffect(() => {
            if (skipInitialPosterOnMountRef.current) {
                skipInitialPosterOnMountRef.current = false;
                posterOpacity.value = 0;
                setIsPosterVisible(false);
                return;
            }
            posterOpacity.value = 1;
            setIsPosterVisible(true);
        }, [item.id, posterOpacity]);

        useEffect(() => {
            setIsMuted(false);
            setIsHoldPaused(false);
            setIsSpeedBoosting(false);
            setVolumeIconName("volume-high");
            safelyApplyToPlayer(() => {
                videoPlayer.playbackRate = 1;
            });
        }, [item.id, safelyApplyToPlayer, videoPlayer]);

        useEffect(() => {
            if (!isVisible && (isSpeedBoosting || isHoldPaused)) {
                if (isSpeedBoosting) {
                    onSpeedBoostStateChange(false);
                }
                setIsSpeedBoosting(false);
                setIsHoldPaused(false);
            }
        }, [isHoldPaused, isSpeedBoosting, isVisible, onSpeedBoostStateChange]);

        useEffect(() => {
            pinchScale.value = 1;
            pinchFocalX.value = overlayViewportWidth / 2;
            pinchFocalY.value = height / 2;
        }, [height, overlayViewportWidth, pinchFocalX, pinchFocalY, pinchScale]);

        const posterStyle = useAnimatedStyle(() => ({
            opacity: posterOpacity.value,
        }));
        const shouldShowPosterOverlay =
            !activeVideoSource || (isPosterVisible && (!isVisible || Platform.OS === "ios"));

        const volumeStyle = useAnimatedStyle(() => ({
            opacity: volumeOpacity.value,
            transform: [{ scale: volumeScale.value }],
        }));
        const likeBurstStyle = useAnimatedStyle(() => ({
            opacity: likeBurstOpacity.value,
            left: likeBurstX.value - LIKE_BURST_SIZE / 2,
            top: likeBurstY.value - LIKE_BURST_SIZE / 2,
            transform: [
                { translateY: likeBurstTranslateY.value },
                { scale: likeBurstScale.value },
            ],
        }));

        const playLikeBurstAt = useCallback(
            (x: number, y: number) => {
                likeBurstX.value = Math.max(LIKE_BURST_SIZE / 2, Math.min(overlayViewportWidth - LIKE_BURST_SIZE / 2, x));
                likeBurstY.value = Math.max(LIKE_BURST_SIZE / 2, Math.min(height - LIKE_BURST_SIZE / 2, y));
                likeBurstOpacity.value = 1;
                likeBurstScale.value = 0.45;
                likeBurstTranslateY.value = 12;

                likeBurstScale.value = withSequence(
                    withSpring(1.08, { damping: 12, stiffness: 230 }),
                    withTiming(0.96, { duration: 120 })
                );
                likeBurstTranslateY.value = withTiming(-22, { duration: 300 });
                likeBurstOpacity.value = withSequence(
                    withTiming(1, { duration: 90 }),
                    withTiming(0, { duration: 330 })
                );
            },
            [height, likeBurstOpacity, likeBurstScale, likeBurstTranslateY, likeBurstX, likeBurstY, overlayViewportWidth]
        );

        const handleDoubleTapLike = useCallback((x: number, y: number) => {
            const nextLiked = !isLiked;
            setIsLiked(nextLiked);
            playLikeBurstAt(x, y);
        }, [isLiked, playLikeBurstAt]);

        const suppressMuteForActionTap = useCallback((durationMs = 420) => {
            suppressMuteUntilRef.current = Date.now() + durationMs;
        }, []);

        const handleToggleMute = useCallback(() => {
            if (Date.now() < suppressMuteUntilRef.current) {
                return;
            }
            if (item.type !== "video" || !item.video || !activeVideoSource || !isAudioFocused) {
                return;
            }
            setIsMuted((prev) => {
                const nextMuted = !prev;
                safelyApplyToPlayer(() => {
                    videoPlayer.muted = nextMuted;
                    videoPlayer.volume = nextMuted ? 0 : 1;
                });
                setVolumeIconName(nextMuted ? "volume-mute" : "volume-high");
                volumeOpacity.value = 1;
                volumeScale.value = 0.82;
                volumeScale.value = withSequence(
                    withSpring(1, { damping: 12, stiffness: 230 }),
                    withTiming(0.95, { duration: 110 })
                );
                volumeOpacity.value = withTiming(0, { duration: 380 });
                return nextMuted;
            });
        }, [activeVideoSource, isAudioFocused, item.type, item.video, safelyApplyToPlayer, videoPlayer, volumeOpacity, volumeScale]);

        const handleHoldStart = useCallback((x: number) => {
            if (item.type !== "video" || !item.video || !activeVideoSource) {
                return;
            }
            const leftZoneMaxX = overlayViewportWidth * SPEED_BOOST_LEFT_ZONE_RATIO;
            if (x <= leftZoneMaxX) {
                setIsHoldPaused(false);
                setIsSpeedBoosting(true);
                onSpeedBoostStateChange(true);
                return;
            }
            setIsSpeedBoosting(false);
            onSpeedBoostStateChange(false);
            setIsHoldPaused(true);
        }, [activeVideoSource, item.type, item.video, onSpeedBoostStateChange, overlayViewportWidth]);

        const handleHoldEnd = useCallback(() => {
            if (item.type !== "video" || !item.video || !activeVideoSource) {
                return;
            }
            setIsSpeedBoosting(false);
            onSpeedBoostStateChange(false);
            setIsHoldPaused(false);
        }, [activeVideoSource, item.type, item.video, onSpeedBoostStateChange]);

        const handleLikePress = useCallback(() => {
            suppressMuteForActionTap();
            setIsLiked((prev) => !prev);
        }, [suppressMuteForActionTap]);

        const handleSharePress = useCallback(async () => {
            suppressMuteForActionTap();

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
        }, [item.branch.title, item.branch.rating, item.branch.distance, suppressMuteForActionTap]);
        const zoomStyle = useAnimatedStyle(() => {
            const focalOffsetX = pinchFocalX.value - overlayViewportWidth / 2;
            const focalOffsetY = pinchFocalY.value - height / 2;
            return {
                transform: [
                    { translateX: focalOffsetX },
                    { translateY: focalOffsetY },
                    { scale: pinchScale.value },
                    { translateX: -focalOffsetX },
                    { translateY: -focalOffsetY },
                ],
            };
        });

        const pinchGesture = useMemo(
            () =>
                Gesture.Pinch()
                    .enabled(isVisible)
                    .cancelsTouchesInView(false)
                    .onTouchesDown((event) => {
                        if (event.numberOfTouches >= 2) {
                            runOnJS(onPinchTouchStateChange)(true);
                        }
                    })
                    .onStart((event) => {
                        pinchFocalX.value = event.focalX;
                        pinchFocalY.value = event.focalY;
                        zoomGestureActivated.value = false;
                    })
                    .onUpdate((event) => {
                        const nextScale = Math.max(1, Math.min(3, event.scale));
                        pinchFocalX.value = event.focalX;
                        pinchFocalY.value = event.focalY;

                        if (!zoomGestureActivated.value) {
                            if (Math.abs(nextScale - 1) <= PINCH_SCALE_ACTIVATION_THRESHOLD) {
                                pinchScale.value = 1;
                                return;
                            }
                            zoomGestureActivated.value = true;
                            runOnJS(onZoomStateChange)(true);
                        }

                        pinchScale.value = nextScale;
                    })
                    .onTouchesUp((event) => {
                        if (event.numberOfTouches < 2) {
                            runOnJS(onPinchTouchStateChange)(false);
                        }
                    })
                    .onTouchesCancelled(() => {
                        runOnJS(onPinchTouchStateChange)(false);
                    })
                    .onFinalize(() => {
                        pinchScale.value = withTiming(1, { duration: 180 });
                        if (zoomGestureActivated.value) {
                            runOnJS(onZoomStateChange)(false);
                        }
                        zoomGestureActivated.value = false;
                        runOnJS(onPinchTouchStateChange)(false);
                    }),
            [
                isVisible,
                onPinchTouchStateChange,
                onZoomStateChange,
                pinchFocalX,
                pinchFocalY,
                pinchScale,
                zoomGestureActivated,
            ]
        );

        const doubleTapGesture = useMemo(
            () =>
                Gesture.Tap()
                    .enabled(isVisible && !isZooming)
                    .cancelsTouchesInView(false)
                    .minPointers(1)
                    .numberOfTaps(2)
                    .maxDuration(TAP_MAX_DURATION)
                    .maxDelay(DOUBLE_TAP_MAX_DELAY)
                    .maxDistance(TAP_MAX_DISTANCE)
                    .onEnd((event, success) => {
                        if (success) {
                            runOnJS(handleDoubleTapLike)(event.x, event.y);
                        }
                    }),
            [handleDoubleTapLike, isVisible, isZooming]
        );

        const singleTapGesture = useMemo(
            () =>
                Gesture.Tap()
                    .enabled(isVisible && !isZooming && !isHoldPaused && !isSpeedBoosting && item.type === "video" && Boolean(item.video))
                    .cancelsTouchesInView(false)
                    .minPointers(1)
                    .numberOfTaps(1)
                    .maxDuration(TAP_MAX_DURATION)
                    .maxDistance(TAP_MAX_DISTANCE)
                    .onEnd((_event, success) => {
                        if (success) {
                            runOnJS(handleToggleMute)();
                        }
                    }),
            [handleToggleMute, isHoldPaused, isSpeedBoosting, isVisible, isZooming, item.type, item.video]
        );

        const longPressGesture = useMemo(
            () =>
                Gesture.LongPress()
                    .enabled(isVisible && !isZooming && item.type === "video" && Boolean(item.video))
                    .cancelsTouchesInView(false)
                    .numberOfPointers(1)
                    .minDuration(LONG_PRESS_MIN_DURATION)
                    .maxDistance(LONG_PRESS_MAX_DISTANCE)
                    .onStart((event) => {
                        runOnJS(handleHoldStart)(event.x);
                    })
                    .onFinalize(() => {
                        runOnJS(handleHoldEnd)();
                    }),
            [handleHoldEnd, handleHoldStart, isVisible, isZooming, item.type, item.video]
        );

        const mediaGesture = useMemo(
            () =>
                Gesture.Simultaneous(
                    pinchGesture,
                    Gesture.Exclusive(doubleTapGesture, singleTapGesture, longPressGesture)
                ),
            [doubleTapGesture, longPressGesture, pinchGesture, singleTapGesture]
        );

        const posterSource = item.poster ?? item.background ?? item.branch.image;
        const renderOverlayCard = useCallback(
            ({ item: cardItem }: { item: { id: string; type: "branch" } | { id: string; type: "offer"; offerKey: FeedOfferKey } }) => {
                if (cardItem.type === "branch") {
                    return (
                        <View style={[styles.overlayCardSlot, { width: branchCardWidth }]}>
                            <BranchCard
                                title={item.branch.title}
                                image={item.branch.image}
                                images={item.branch.images}
                                rating={item.branch.rating}
                                distance={item.branch.distance}
                                hours={item.branch.hours}
                                category={item.branch.category}
                                offers={translatedOffers}
                                badgeVariant="more"
                                cardPaddingBottom={14}
                            />
                        </View>
                    );
                }

                const offerTitle = t(cardItem.offerKey);
                const descriptionKey = OFFER_DESCRIPTION_KEYS[cardItem.offerKey];
                const fallbackDescription = OFFER_DESCRIPTION_DEFAULTS[cardItem.offerKey];
                const offerDescription = t(descriptionKey, { defaultValue: fallbackDescription });
                const offerImage = item.branch.images?.[0] ?? item.branch.image;

                return (
                    <View style={[styles.overlayCardSlot, { width: branchCardWidth }]}>
                        <View style={styles.offerCard}>
                            <Image source={offerImage} style={styles.offerImage} resizeMode="cover" />
                            <View style={styles.offerTextContent}>
                                <Text style={styles.offerTitle} numberOfLines={1}>
                                    {offerTitle}
                                </Text>
                                <Text style={styles.offerDescription} numberOfLines={3}>
                                    {offerDescription}
                                </Text>
                            </View>
                        </View>
                    </View>
                );
            },
            [branchCardWidth, item.branch.category, item.branch.distance, item.branch.hours, item.branch.image, item.branch.images, item.branch.rating, item.branch.title, t, translatedOffers]
        );

        // Overlay content (shared between image and video)
        const OverlayContent = (
            <>
                    {/* Like/Share buttons */}
                    <View style={[styles.actionsColumn, { bottom: actionsBottom }]}>
                        {/* Like Button */}
                        <TouchableOpacity 
                            style={styles.actionBtn} 
                            activeOpacity={0.7} 
                            onPressIn={() => suppressMuteForActionTap()}
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

                        {/* Share Button */}
                        <TouchableOpacity 
                            style={styles.actionBtn} 
                            activeOpacity={0.7} 
                            onPressIn={() => suppressMuteForActionTap()}
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
                    </View>

                    {/* Branch card (overlay) */}
                    <View
                        style={[
                            styles.branchCardOverlay,
                            {
                                bottom: Math.max(
                                    0,
                                    branchCardOffset - BRANCH_CARD_OVERLAY_PADDING_Y
                                ),
                            },
                        ]}
                    >
                        <View
                            style={styles.branchCardOverlayContent}
                        >
                            <FlatList
                                horizontal
                                data={overlayCards}
                                keyExtractor={(overlayCard) => overlayCard.id}
                                renderItem={renderOverlayCard}
                                showsHorizontalScrollIndicator={false}
                                directionalLockEnabled
                                bounces={false}
                                nestedScrollEnabled
                                style={{ width: overlayViewportWidth }}
                                contentContainerStyle={[
                                    styles.overlayCardsContent,
                                    { paddingHorizontal: overlaySideInset },
                                ]}
                                ItemSeparatorComponent={() => <View style={{ width: OVERLAY_CARD_GAP }} />}
                                snapToInterval={branchCardWidth + OVERLAY_CARD_GAP}
                                snapToAlignment="start"
                                decelerationRate="fast"
                                disableIntervalMomentum
                                getItemLayout={(_, index) => ({
                                    length: branchCardWidth + OVERLAY_CARD_GAP,
                                    offset: (branchCardWidth + OVERLAY_CARD_GAP) * index,
                                    index,
                                })}
                            />
                        </View>
                    </View>
            </>
        );

        if (item.type === "video" && item.video) {
            return (
                <View style={[styles.reel, { height }]}>
                    <GestureDetector gesture={mediaGesture}>
                        <Animated.View style={[styles.videoContainer, zoomStyle]}>
                            {activeVideoSource ? (
                                <VideoView
                                    key={`${item.id}-active`}
                                    player={videoPlayer}
                                    style={styles.video}
                                    nativeControls={false}
                                    contentFit="cover"
                                    useExoShutter={false}
                                    surfaceType={Platform.OS === "android" ? "textureView" : undefined}
                                    onFirstFrameRender={() => {
                                        posterOpacity.value = 0;
                                        setIsPosterVisible(false);
                                    }}
                                />
                            ) : null}
                            {shouldShowPosterOverlay ? (
                                <Animated.View
                                    style={[styles.posterOverlay, posterStyle]}
                                    pointerEvents="none"
                                >
                                    <Image source={posterSource} style={styles.video} resizeMode="cover" />
                                </Animated.View>
                            ) : null}
                            <Animated.View style={[styles.likeBurst, likeBurstStyle]} pointerEvents="none">
                                <Ionicons name="heart" size={LIKE_BURST_SIZE} color="#FF2D55" style={styles.likeBurstIcon} />
                            </Animated.View>
                            <Animated.View style={[styles.volumeBurst, volumeStyle]} pointerEvents="none">
                                <View style={styles.volumeBadge}>
                                    <Ionicons name={volumeIconName} size={36} color="#fff" />
                                </View>
                            </Animated.View>
                            {!isZooming && !isSpeedBoosting ? (
                                <View style={styles.videoOverlay}>
                                    {OverlayContent}
                                </View>
                            ) : null}
                        </Animated.View>
                    </GestureDetector>
                </View>
            );
        }

        return (
            <View style={[styles.reel, { height }]}>
                <GestureDetector gesture={mediaGesture}>
                    <Animated.View style={[styles.hero, zoomStyle]}>
                        <ImageBackground source={item.background} style={styles.hero} resizeMode="cover">
                            <Animated.View style={[styles.likeBurst, likeBurstStyle]} pointerEvents="none">
                                <Ionicons name="heart" size={LIKE_BURST_SIZE} color="#FF2D55" style={styles.likeBurstIcon} />
                            </Animated.View>
                            {!isZooming && !isSpeedBoosting ? OverlayContent : null}
                        </ImageBackground>
                    </Animated.View>
                </GestureDetector>
            </View>
        );
    }
);

export default function FeedScreen() {
    const { t } = useTranslation();
    const navigation = useNavigation<any>();
    const isFeedFocused = useIsFocused();
    const [isAppActive, setIsAppActive] = React.useState(true);
    const insets = useSafeAreaInsets();
    const { height: screenHeight, width: screenWidth } = useWindowDimensions();
    const [feedViewportHeight, setFeedViewportHeight] = React.useState(() => Math.max(1, screenHeight));
    const reelHeight = useMemo(() => Math.max(1, feedViewportHeight || screenHeight), [feedViewportHeight, screenHeight]);
    const initialLoopIndex = useMemo(() => normalizeToLoopCenterIndex(0), []);
    const [visibleIndex, setVisibleIndex] = React.useState(initialLoopIndex);
    const [audioVisibleIndex, setAudioVisibleIndex] = React.useState(initialLoopIndex);
    const [sourceAnchorIndex, setSourceAnchorIndex] = React.useState(initialLoopIndex);
    const [isScrolling, setIsScrolling] = React.useState(false);
    const [isZooming, setIsZooming] = React.useState(false);
    const [isPinchTouchActive, setIsPinchTouchActive] = React.useState(false);
    const [isSpeedBoosting, setIsSpeedBoosting] = React.useState(false);
    const listRef = useRef<FlatList<ReelLoopItem>>(null);
    const isScrollingRef = useRef(false);
    const momentumInProgressRef = useRef(false);
    const scrollReleaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const currentIndexRef = useRef(initialLoopIndex);
    const sourceAnchorIndexRef = useRef(initialLoopIndex);
    const lastScrollOffsetYRef = useRef(initialLoopIndex * reelHeight);
    const setScrollingState = useCallback((value: boolean) => {
        isScrollingRef.current = value;
        setIsScrolling((prev) => (prev === value ? prev : value));
    }, []);
    const clearScrollReleaseTimeout = useCallback(() => {
        if (scrollReleaseTimeoutRef.current) {
            clearTimeout(scrollReleaseTimeoutRef.current);
            scrollReleaseTimeoutRef.current = null;
        }
    }, []);
    const handleFeedLayout = useCallback((e: any) => {
        const nextHeight = Math.max(1, e.nativeEvent.layout.height);
        setFeedViewportHeight((prev) => (Math.abs(prev - nextHeight) < 0.5 ? prev : nextHeight));
    }, []);
    const branchCardWidth = useMemo(
        () => Math.max(280, Math.min(340, screenWidth - 48)),
        [screenWidth]
    );
    const baseBottom = useMemo(() => {
        const tabBarInset = Math.max(insets.bottom, TAB_BAR_MIN_INSET);
        return TAB_BAR_BASE_HEIGHT + tabBarInset;
    }, [insets.bottom]);
    const bottomOverlayOffset = useMemo(
        () => Math.max(0, baseBottom - 16) - 30,
        [baseBottom]
    );
    const speedBadgeBottomOffset = useMemo(
        () => Math.max(insets.bottom, TAB_BAR_MIN_INSET) + 16,
        [insets.bottom]
    );
    const isPlaybackAllowed = isFeedFocused && isAppActive;

    // Position card just above the tab bar
    const branchCardOffset = useMemo(
        () =>
            Math.max(
                0,
                baseBottom +
                    BRANCH_CARD_BASELINE_OFFSET +
                    BRANCH_CARD_OVERLAY_PADDING_Y +
                    BRANCH_CARD_EXTRA_OFFSET +
                    10
            ),
        [baseBottom]
    );
    
    const actionsBottom = useMemo(
        () => Math.max(120, Math.round(screenHeight * 0.22) + bottomOverlayOffset),
        [screenHeight, bottomOverlayOffset]
    );
    const feedDecelerationRate = useMemo(() => {
        if (Platform.OS === "ios") {
            return 0.99;
        }
        if (Platform.OS === "android") {
            return "fast" as const;
        }
        return 0.998;
    }, []);
    const useAndroidNativePaging = Platform.OS === "android";
    const sourceCandidateCenterIndex = useMemo(
        () => (isScrolling ? sourceAnchorIndex : visibleIndex),
        [isScrolling, sourceAnchorIndex, visibleIndex]
    );
    const feedMaxToRenderPerBatch = useMemo(() => (Platform.OS === "ios" ? 2 : 3), []);
    const feedWindowSize = useMemo(() => (Platform.OS === "ios" ? 3 : 4), []);

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
        const handleAppStateChange = (nextState: AppStateStatus) => {
            setIsAppActive(nextState === "active");
        };

        const subscription = AppState.addEventListener("change", handleAppStateChange);
        return () => {
            subscription.remove();
        };
    }, []);

    useEffect(() => {
        navigation.setOptions({
            tabBarStyle: isZooming || isSpeedBoosting ? { display: "none" } : undefined,
        });
    }, [isSpeedBoosting, isZooming, navigation]);

    useEffect(
        () => () => {
            navigation.setOptions({ tabBarStyle: undefined });
        },
        [navigation]
    );
    useEffect(
        () => () => {
            clearScrollReleaseTimeout();
        },
        [clearScrollReleaseTimeout]
    );
    const clampIndex = useCallback(
        (index: number) => Math.max(0, Math.min(REELS_LOOP_DATA.length - 1, index)),
        []
    );
    const updateAudioVisibleIndex = useCallback(
        (nextIndex: number) => {
            const clampedIndex = clampIndex(nextIndex);
            setAudioVisibleIndex((prev) => (prev === clampedIndex ? prev : clampedIndex));
        },
        [clampIndex]
    );
    const updateSourceAnchorIndex = useCallback(
        (nextIndex: number) => {
            const clampedIndex = clampIndex(nextIndex);
            sourceAnchorIndexRef.current = clampedIndex;
            setSourceAnchorIndex((prev) => (prev === clampedIndex ? prev : clampedIndex));
        },
        [clampIndex]
    );
    useEffect(() => {
        if (!isPlaybackAllowed) {
            return;
        }
        const stableIndex = currentIndexRef.current;
        updateAudioVisibleIndex(stableIndex);
        updateSourceAnchorIndex(stableIndex);
    }, [isPlaybackAllowed, updateAudioVisibleIndex, updateSourceAnchorIndex]);
    const safeScrollToIndex = useCallback(
        (index: number, animated = true) => {
            const clampedIndex = clampIndex(index);
            const targetOffset = Math.max(0, clampedIndex * reelHeight);
            try {
                listRef.current?.scrollToIndex({ index: clampedIndex, animated });
            } catch {
                listRef.current?.scrollToOffset({ offset: targetOffset, animated: false });
            }
        },
        [clampIndex, reelHeight]
    );
    useEffect(() => {
        if (reelHeight <= 0) {
            return;
        }
        const stableIndex = clampIndex(currentIndexRef.current);
        requestAnimationFrame(() => {
            safeScrollToIndex(stableIndex, false);
        });
    }, [clampIndex, reelHeight, safeScrollToIndex]);
    const recenterAroundLoopMiddle = useCallback(
        (index: number) => {
            const clampedIndex = clampIndex(index);
            if (REEL_BASE_COUNT === 0 || REELS_LOOP_DATA.length === 0) {
                return clampedIndex;
            }

            const edgeBuffer = REEL_BASE_COUNT * REEL_LOOP_EDGE_BUFFER_CYCLES;
            const upperBound = REELS_LOOP_DATA.length - edgeBuffer - 1;
            if (clampedIndex > edgeBuffer && clampedIndex < upperBound) {
                return clampedIndex;
            }

            const normalizedIndex = clampIndex(normalizeToLoopCenterIndex(clampedIndex));
            if (normalizedIndex !== clampedIndex) {
                safeScrollToIndex(normalizedIndex, false);
            }
            return normalizedIndex;
        },
        [clampIndex, safeScrollToIndex]
    );
    const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
        // Ignore mid-drag/momentum viewability changes to avoid flicker while swiping.
        if (isScrollingRef.current) {
            return;
        }
        if (!viewableItems?.length) {
            return;
        }
        const rawNextIndex = viewableItems[0].index ?? currentIndexRef.current;
        const nextIndex = Math.max(0, Math.min(REELS_LOOP_DATA.length - 1, rawNextIndex));
        const stableIndex = recenterAroundLoopMiddle(nextIndex);
        currentIndexRef.current = stableIndex;
        setVisibleIndex(stableIndex);
        updateAudioVisibleIndex(stableIndex);
        updateSourceAnchorIndex(stableIndex);
    }, [recenterAroundLoopMiddle, updateAudioVisibleIndex, updateSourceAnchorIndex]);

    const handleMomentumStart = useCallback(() => {
        momentumInProgressRef.current = true;
        clearScrollReleaseTimeout();
        setScrollingState(true);
        updateAudioVisibleIndex(sourceAnchorIndexRef.current);
    }, [clearScrollReleaseTimeout, setScrollingState, updateAudioVisibleIndex]);

    const handleMomentumEnd = useCallback(
        (e: any) => {
            momentumInProgressRef.current = false;
            clearScrollReleaseTimeout();
            const offsetY = e.nativeEvent.contentOffset.y;
            lastScrollOffsetYRef.current = offsetY;
            if (!Number.isFinite(offsetY) || reelHeight <= 0) {
                setScrollingState(false);
                return;
            }
            const rawIndex = Math.round(offsetY / reelHeight);
            const targetIndex = clampIndex(rawIndex);
            const stableIndex = recenterAroundLoopMiddle(targetIndex);
            currentIndexRef.current = stableIndex;
            setVisibleIndex(stableIndex);
            updateAudioVisibleIndex(stableIndex);
            updateSourceAnchorIndex(stableIndex);
            const targetOffset = stableIndex * reelHeight;
            if (useAndroidNativePaging && Math.abs(offsetY - targetOffset) > 2) {
                requestAnimationFrame(() => {
                    safeScrollToIndex(stableIndex, false);
                });
            }
            setScrollingState(false);
        },
        [
            clampIndex,
            clearScrollReleaseTimeout,
            reelHeight,
            recenterAroundLoopMiddle,
            safeScrollToIndex,
            setScrollingState,
            updateAudioVisibleIndex,
            updateSourceAnchorIndex,
            useAndroidNativePaging,
        ]
    );

    const handleZoomStateChange = useCallback((value: boolean) => {
        setIsZooming((prev) => (prev === value ? prev : value));
    }, []);

    const handlePinchTouchStateChange = useCallback((value: boolean) => {
        setIsPinchTouchActive((prev) => (prev === value ? prev : value));
    }, []);

    const handleSpeedBoostStateChange = useCallback((value: boolean) => {
        setIsSpeedBoosting((prev) => (prev === value ? prev : value));
    }, []);

    if (REELS_LOOP_DATA.length === 0) {
        return <View style={styles.container} />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.feedListContainer} onLayout={handleFeedLayout}>
                <FlatList<ReelLoopItem>
                    ref={listRef}
                    data={REELS_LOOP_DATA}
                    keyExtractor={(item) => item.key}
                    renderItem={({ item, index }) => (
                        <ReelItemComponent
                            item={item.reel}
                            height={reelHeight}
                            actionsBottom={actionsBottom}
                            branchCardWidth={branchCardWidth}
                            overlayViewportWidth={screenWidth}
                            branchCardOffset={branchCardOffset}
                            isScrolling={isScrolling}
                            isVisible={index === visibleIndex}
                            isAudioVisible={index === audioVisibleIndex}
                            isSourceAnchor={index === sourceAnchorIndex}
                            isSourceCandidate={Math.abs(index - sourceCandidateCenterIndex) <= 1}
                            isPlaybackAllowed={isPlaybackAllowed}
                            isZooming={isZooming}
                            onZoomStateChange={handleZoomStateChange}
                            onPinchTouchStateChange={handlePinchTouchStateChange}
                            onSpeedBoostStateChange={handleSpeedBoostStateChange}
                        />
                    )}
                    showsVerticalScrollIndicator={false}
                    pagingEnabled
                    snapToInterval={useAndroidNativePaging ? undefined : reelHeight}
                    snapToAlignment={useAndroidNativePaging ? undefined : "start"}
                    decelerationRate={feedDecelerationRate}
                    disableIntervalMomentum={false}
                    scrollEventThrottle={16}
                    initialNumToRender={2}
                    maxToRenderPerBatch={feedMaxToRenderPerBatch}
                    windowSize={feedWindowSize}
                    updateCellsBatchingPeriod={8}
                    removeClippedSubviews={false}
                    initialScrollIndex={initialLoopIndex}
                    getItemLayout={(_, index) => ({
                        length: reelHeight,
                        offset: reelHeight * index,
                        index,
                    })}
                    style={styles.feedList}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    onScrollBeginDrag={() => {
                        momentumInProgressRef.current = false;
                        clearScrollReleaseTimeout();
                        setScrollingState(true);
                        updateAudioVisibleIndex(currentIndexRef.current);
                        updateSourceAnchorIndex(currentIndexRef.current);
                    }}
                    onScroll={(e) => {
                        if (!isScrollingRef.current || reelHeight <= 0) {
                            return;
                        }
                        const offsetY = e.nativeEvent.contentOffset.y;
                        lastScrollOffsetYRef.current = offsetY;
                        if (!Number.isFinite(offsetY)) {
                            return;
                        }
                        const pageOffset = offsetY / reelHeight;
                        const anchorIndex = sourceAnchorIndexRef.current;
                        let nextSourceIndex = anchorIndex;

                        if (pageOffset >= anchorIndex + SOURCE_ANCHOR_SWITCH_THRESHOLD) {
                            nextSourceIndex = clampIndex(anchorIndex + 1);
                        } else if (pageOffset <= anchorIndex - SOURCE_ANCHOR_SWITCH_THRESHOLD) {
                            nextSourceIndex = clampIndex(anchorIndex - 1);
                        }

                        if (nextSourceIndex !== anchorIndex) {
                            updateSourceAnchorIndex(nextSourceIndex);
                            updateAudioVisibleIndex(nextSourceIndex);
                        }
                    }}
                    onScrollEndDrag={() => {
                        clearScrollReleaseTimeout();
                        scrollReleaseTimeoutRef.current = setTimeout(() => {
                            if (!momentumInProgressRef.current) {
                                const fallbackOffsetY = lastScrollOffsetYRef.current;
                                if (!Number.isFinite(fallbackOffsetY) || reelHeight <= 0) {
                                    setScrollingState(false);
                                    return;
                                }
                                const fallbackRawIndex = Math.round(fallbackOffsetY / reelHeight);
                                const fallbackIndex = recenterAroundLoopMiddle(clampIndex(fallbackRawIndex));
                                currentIndexRef.current = fallbackIndex;
                                setVisibleIndex(fallbackIndex);
                                updateAudioVisibleIndex(fallbackIndex);
                                updateSourceAnchorIndex(fallbackIndex);
                                const fallbackTargetOffset = fallbackIndex * reelHeight;
                                if (useAndroidNativePaging && Math.abs(fallbackOffsetY - fallbackTargetOffset) > 2) {
                                    safeScrollToIndex(fallbackIndex, false);
                                }
                                setScrollingState(false);
                            }
                        }, 120);
                    }}
                    onScrollToIndexFailed={(info) => {
                        const fallbackOffset = Math.max(0, info.index * reelHeight);
                        listRef.current?.scrollToOffset({ offset: fallbackOffset, animated: false });
                        requestAnimationFrame(() => {
                            safeScrollToIndex(info.index, false);
                        });
                    }}
                    onMomentumScrollBegin={handleMomentumStart}
                    onMomentumScrollEnd={handleMomentumEnd}
                    scrollEnabled={!isZooming && !isPinchTouchActive && !isSpeedBoosting}
                />
            </View>

            {!isZooming && !isSpeedBoosting ? (
                <View
                    pointerEvents="box-none"
                    style={[styles.staticTopBarContainer, { top: insets.top + 16 }]}
                >
                    <View style={styles.topBar}>
                        <View style={styles.card}>
                            <TouchableOpacity style={styles.row} activeOpacity={0.85}>
                                <Ionicons name="location-outline" size={18} color="#000" />
                                <Text style={styles.rowTextBold} numberOfLines={1}>
                                    {t("yourLocation")}
                                </Text>
                                <Ionicons
                                    name="chevron-down-outline"
                                    size={16}
                                    color="#000"
                                    style={styles.caret}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            ) : null}
            {!isZooming && isSpeedBoosting ? (
                <View
                    pointerEvents="none"
                    style={[styles.speedBottomContainer, { bottom: speedBadgeBottomOffset }]}
                >
                    <View style={styles.speedBottomBadge}>
                        <Ionicons name="play-forward" size={20} color="#fff" />
                        <Text style={styles.speedBottomBadgeText}>2x</Text>
                    </View>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
    },
    feedListContainer: {
        flex: 1,
    },
    feedList: {
        flex: 1,
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
    staticTopBarContainer: {
        position: "absolute",
        left: 0,
        right: 0,
        zIndex: 10,
    },
    topBar: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        paddingHorizontal: 16,
    },
    speedBottomContainer: {
        position: "absolute",
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 12,
    },
    speedBottomBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 9,
        backgroundColor: "rgba(0, 0, 0, 0.62)",
    },
    speedBottomBadgeText: {
        color: "#fff",
        fontSize: 16,
        lineHeight: 19,
        fontWeight: "700",
    },
    card: {
        width: 184,
        height: 44,
        backgroundColor: "white",
        borderRadius: 24,
        ...(Platform.OS === "web"
            ? { boxShadow: "0 6px 12px rgba(0, 0, 0, 0.14)" }
            : {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
                elevation: 3,
            }),
    },
    row: {
        height: "100%",
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 4,
    },
    rowTextBold: {
        flex: 1,
        minWidth: 0,
        marginHorizontal: 4,
        textAlign: "center",
        fontSize: 14,
        fontWeight: "600",
        color: "#111",
    },
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
    branchCardOverlay: {
        position: "absolute",
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 3,
    },
    branchCardOverlayContent: {
        width: "100%",
        alignItems: "center",
    },
    overlayCardsContent: {
        paddingVertical: BRANCH_CARD_OVERLAY_PADDING_Y,
        alignItems: "center",
    },
    overlayCardSlot: {
        justifyContent: "flex-end",
    },
    offerCard: {
        height: 111,
        borderRadius: 14,
        borderWidth: 0.5,
        borderColor: "#E4E4E7",
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 10,
        paddingVertical: 10,
        marginBottom: 16,
        flexDirection: "row",
        alignItems: "center",
        ...(Platform.OS === "web"
            ? { boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.1)" }
            : {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
                elevation: 4,
            }),
    },
    offerImage: {
        width: 86,
        height: 86,
        borderRadius: 10,
        marginRight: 12,
    },
    offerTextContent: {
        flex: 1,
        justifyContent: "center",
    },
    offerTitle: {
        fontSize: 15,
        lineHeight: 18,
        fontWeight: "700",
        color: "#000000",
        marginBottom: 8,
    },
    offerDescription: {
        fontSize: 10,
        lineHeight: 14,
        fontWeight: "500",
        color: "rgba(0, 0, 0, 0.5)",
    },
    volumeBurst: {
        position: "absolute",
        top: "42%",
        left: 0,
        right: 0,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 4,
    },
    volumeBadge: {
        width: 78,
        height: 78,
        borderRadius: 39,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        alignItems: "center",
        justifyContent: "center",
    },
    likeBurst: {
        position: "absolute",
        zIndex: 4,
    },
    likeBurstIcon: {
        textShadowColor: "rgba(0,0,0,0.55)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
    },
});

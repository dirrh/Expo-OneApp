import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, ScrollView, StyleSheet, useWindowDimensions, TouchableOpacity, Image } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import BottomSheet from "@gorhom/bottom-sheet";

import { HeroCarousel } from "../components/discover/HeroCarousel";
import { TabMenu } from "../components/discover/TabMenu";
import { NewsSection } from "../components/discover/NewsSection";
import { BenefitsSection } from "../components/discover/BenefitsSection";
import { BenefitsBottomSheet } from "../components/discover/BenefitsBottomSheet";
import { HeroActions } from "../components/discover/HeroActions";
import { HeroInfo } from "../components/discover/HeroInfo";
import { InfoSection } from "../components/discover/InfoSection";
import { ReviewsSection } from "../components/discover/ReviewsSection";
import { normalizeBranch } from "../lib/data/normalizers";
import { useAuth } from "../lib/AuthContext";
import { useTranslation } from "react-i18next";

export default function BusinessDetailScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { user } = useAuth();
    const { t } = useTranslation();
    const branchParam = route.params?.branch;
    const branch = normalizeBranch(branchParam ?? {});

    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    const [carouselIndex, setCarouselIndex] = useState(0);
    const [activeTab, setActiveTab] =
        useState<"News" | "Benefits" | "Info" | "Reviews">("News");

    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ["15%", "35%"], []);

    // Memoizované hodnoty - prepočítajú sa len keď sa zmení width
    const heroHeight = useMemo(
        () => Math.min(360, Math.max(240, Math.round(width * 0.7))),
        [width]
    );
    const sidePadding = 15;
    const menuTop = useMemo(() => heroHeight + 10, [heroHeight]);
    const sectionTop = useMemo(() => menuTop + 70, [menuTop]);

    const menu = useMemo(() => ["News", "Benefits", "Info", "Reviews"], []);

    const menuItemWidth = useMemo(
        () => Math.min(88, Math.floor((width - sidePadding * 2 - menu.length * 5) / menu.length)),
        [width, menu.length]
    );

    // Memoizované štýly - nevytvárajú sa nanovo pri každom rendereri
    const heroContainerStyle = useMemo(
        () => ({ height: heroHeight }),
        [heroHeight]
    );

    const menuWrapperStyle = useMemo(
        () => [styles.menuWrapper, { top: menuTop, left: sidePadding, right: sidePadding }],
        [menuTop]
    );

    const scrollViewStyle = useMemo(
        () => ({
            position: "absolute" as const,
            top: sectionTop,
            left: sidePadding,
            right: sidePadding,
            bottom: 0,
        }),
        [sectionTop]
    );

    const qrButtonStyle = useMemo(
        () => [styles.qrButton, { bottom: insets.bottom + 20 }],
        [insets.bottom]
    );

    const safeBranch = branch ?? {
        title: "",
        rating: 0,
        distance: "",
        hours: "",
        category: "",
        image: require("../assets/365.jpg"),
        address: "",
        phone: "",
        email: "",
        website: "",
    };

    const images = [
        { id: "1", image: safeBranch.image },
    ];

    const reviews = useMemo(() => [
        {
            id: "1",
            name: "Martin Kováč",
            rating: 5,
            text:
                "Excellent facilities and very professional staff. The personal trainers are knowledgeable and motivating.",
            daysAgo: 2,
        },
        {
            id: "2",
            name: "Peter Horváth",
            rating: 4,
            text:
                "Great gym overall. Equipment is top-notch and staff is friendly. Only downside is it can get crowded during peak hours.",
            daysAgo: 5,
        },
    ], []);

    // Memoizované handlery - nevytvárajú sa nanovo pri každom rendereri
    const handleBack = useCallback(() => navigation.goBack(), [navigation]);
    
    const handleTabChange = useCallback(
        (val: string) => setActiveTab(val as any),
        []
    );

    const handleActivateBenefit = useCallback(() => {
        if (user) {
            navigation.navigate("Tabs", { screen: t("Benefits") });
        } else {
            sheetRef.current?.expand();
        }
    }, [user, navigation, t]);

    const handleQrPress = useCallback(() => {
        if (user) {
            navigation.navigate("Tabs", { screen: t("Benefits") });
        } else {
            navigation.navigate("Login");
        }
    }, [user, navigation, t]);

    const handleLogin = useCallback(
        () => navigation.navigate("Login"),
        [navigation]
    );

    // Memoizované dáta pre InfoSection
    const hoursData = useMemo(() => [
        { day: "Monday", time: safeBranch.hours },
        { day: "Tuesday", time: safeBranch.hours },
        { day: "Wednesday", time: safeBranch.hours, isToday: true },
        { day: "Thursday", time: safeBranch.hours },
        { day: "Friday", time: safeBranch.hours },
        { day: "Saturday", time: "7:00 - 20:00" },
        { day: "Sunday", time: "7:00 - 20:00" },
    ], [safeBranch.hours]);

    return (
        <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
            {/* HERO */}
            <View style={heroContainerStyle}>
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
                />

                <HeroInfo
                    title={safeBranch.title}
                    rating={safeBranch.rating}
                    ratingCount={reviews.length}
                    distance={safeBranch.distance}
                    hours={safeBranch.hours}
                    category={safeBranch.category}
                />
            </View>

            {/* TAB MENU */}
            <View style={menuWrapperStyle}>
                <TabMenu
                    items={menu}
                    active={activeTab}
                    onChange={handleTabChange}
                    width={menuItemWidth}
                />
            </View>

            {/* CONTENT */}
            <ScrollView
                style={scrollViewStyle}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {activeTab === "News" && (
                    <NewsSection title={safeBranch.title} />
                )}

                {activeTab === "Benefits" && (
                    <BenefitsSection onActivate={handleActivateBenefit} />
                )}

                {activeTab === "Info" && (
                    <InfoSection
                        hours={hoursData}
                        address={safeBranch.address ?? ""}
                        phone={safeBranch.phone ?? ""}
                        email={safeBranch.email ?? ""}
                        website={safeBranch.website ?? ""}
                    />
                )}

                {activeTab === "Reviews" && (
                    <ReviewsSection
                        rating={safeBranch.rating}
                        total={reviews.length}
                        reviews={reviews}
                    />
                )}

            </ScrollView>

            {/* BOTTOM SHEET - len pre neprihlásených */}
            {activeTab === "Benefits" && !user && (
                <BenefitsBottomSheet
                    sheetRef={sheetRef}
                    snapPoints={snapPoints}
                    onLogin={handleLogin}
                />
            )}

            {/* Floating QR tlačidlo */}
            <TouchableOpacity
                style={qrButtonStyle}
                onPress={handleQrPress}
                activeOpacity={0.85}
            >
                <Image source={require("../images/qr.png")} style={styles.qrIcon} />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    menuWrapper: {
        position: "absolute",
    },
    scrollContent: {
        paddingBottom: 140,
    },
    qrButton: {
        position: "absolute",
        right: 16,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    qrIcon: {
        width: 48,
        height: 48,
    },
});

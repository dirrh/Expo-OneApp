import React, { useMemo, useRef, useState } from "react";
import { View, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
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

export default function BusinessDetailScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const branch = route.params?.branch;

    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    const [carouselIndex, setCarouselIndex] = useState(0);
    const [activeTab, setActiveTab] =
        useState<"News" | "Benefits" | "Info" | "Reviews">("News");

    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ["15%", "35%"], []);

    const heroHeight = Math.min(360, Math.max(240, Math.round(width * 0.7)));
    const sidePadding = 15;
    const menuTop = heroHeight + 10;
    const sectionTop = menuTop + 70;

    const menu = ["News", "Benefits", "Info", "Reviews"];

    const menuItemWidth = Math.min(
        88,
        Math.floor((width - sidePadding * 2 - menu.length * 5) / menu.length)
    );

    const safeBranch = branch ?? {
        title: "",
        rating: 0,
        distance: "",
        hours: "",
        address: "",
        phone: "",
        email: "",
        website: "",
    };

    const images = [
        { id: "1", image: safeBranch.image },
    ];

    const reviews = [
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
    ];

    return (
        <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
            {/* HERO */}
            <View style={{ height: heroHeight }}>
                <HeroCarousel
                    data={images}
                    height={heroHeight}
                    width={width}
                    index={carouselIndex}
                    onIndexChange={setCarouselIndex}
                />

                <HeroActions
                    topInset={insets.top}
                    onBack={() => navigation.goBack()}
                />

                <HeroInfo
                    title={safeBranch.title}
                    rating={safeBranch.rating}
                    distance={safeBranch.distance}
                    hours={safeBranch.hours}
                />
            </View>

            {/* TAB MENU */}
            <View
                style={[
                    styles.menuWrapper,
                    { top: menuTop, left: sidePadding, right: sidePadding },
                ]}
            >
                <TabMenu
                    items={menu}
                    active={activeTab}
                    onChange={(val) => setActiveTab(val as any)}
                    width={menuItemWidth}
                />
            </View>

            {/* CONTENT */}
            <ScrollView
                style={{
                    position: "absolute",
                    top: sectionTop,
                    left: sidePadding,
                    right: sidePadding,
                    bottom: 0,
                }}
                contentContainerStyle={{ paddingBottom: 140 }}
                showsVerticalScrollIndicator={false}
            >
                {activeTab === "News" && (
                    <NewsSection title={safeBranch.title} />
                )}

                {activeTab === "Benefits" && (
                    <BenefitsSection onActivate={() => sheetRef.current?.expand()} />
                )}

                {activeTab === "Info" && (
                    <InfoSection
                        hours={[
                            { day: "Monday", time: safeBranch.hours },
                            { day: "Tuesday", time: safeBranch.hours },
                            { day: "Wednesday", time: safeBranch.hours, isToday: true },
                            { day: "Thursday", time: safeBranch.hours },
                            { day: "Friday", time: safeBranch.hours },
                            { day: "Saturday", time: "7:00 - 20:00" },
                            { day: "Sunday", time: "7:00 - 20:00" },
                        ]}
                        address={safeBranch.address}
                        phone={safeBranch.phone}
                        email={safeBranch.email}
                        website={safeBranch.website}
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

            {/* BOTTOM SHEET */}
            {activeTab === "Benefits" && (
                <BenefitsBottomSheet
                    sheetRef={sheetRef}
                    snapPoints={snapPoints}
                    onLogin={() => navigation.navigate("Login")}
                />
            )}
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
});

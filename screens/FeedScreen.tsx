import React from "react";
import { View, StyleSheet, ImageBackground, Image, Text, TouchableOpacity, Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BranchCard from "../components/BranchCard";

export default function FeedScreen() {
    const insets = useSafeAreaInsets();
    const { height: screenHeight } = useWindowDimensions();
    const actionsBottom = Math.max(insets.bottom + 120, Math.round(screenHeight * 0.22));

    return (
        <View style={styles.container}>
            <ImageBackground
                source={require("../images/feed_img.png")}
                style={styles.hero}
                resizeMode="cover"
            >
                {/* Top bar - posunuta pod notch */}
                <View style={[styles.topBar, { marginTop: insets.top + 16 }]}>
                    <View style={styles.card}>
                        <TouchableOpacity style={styles.row} activeOpacity={0.85}>
                            <Image source={require("../images/pin.png")} style={styles.rowIcon} resizeMode="contain" />
                            <Text style={styles.rowTextBold} numberOfLines={1}>Your Location</Text>
                            <Image source={require("../images/options.png")} style={styles.caret} resizeMode="contain" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.actionsRow}>
                        <TouchableOpacity style={styles.roundBtn} activeOpacity={0.85}>
                            <Image source={require("../images/filter.png")} style={styles.actionBtnIcon} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Like/Share buttons - individualne ikonky */}
                <View style={[styles.actionsColumn, { bottom: actionsBottom }]}>
                    <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8}>
                        <Image
                            source={require("../images/feed/heart.png")}
                            style={styles.actionIcon}
                            resizeMode="contain"
                        />
                        <Text style={styles.actionLabel}>Like</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8}>
                        <Image
                            source={require("../images/feed/share.png")}
                            style={styles.actionIcon}
                            resizeMode="contain"
                        />
                        <Text style={styles.actionLabel}>Share</Text>
                    </TouchableOpacity>
                </View>

                {/* Branch card - rovnaka ako na mape */}
                <View style={[styles.branchCardWrap, { marginBottom: insets.bottom + 1 }]}>
                    <BranchCard
                        title="RED ROYAL GYM"
                        image={require("../assets/365.jpg")}
                        rating={4.6}
                        distance="1.7 km"
                        hours="9:00 - 21:00"
                        category="Fitness"
                        discount="20% discount on first entry"
                    />
                </View>
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
    },
    hero: {
        flex: 1,
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
    actionsRow: {
        flexDirection: "row",
        gap: 12,
    },
    roundBtn: {
        width: 44,
        height: 44,
        borderRadius: 15,
        backgroundColor: "white",
        alignItems: "center",
        justifyContent: "center",
        ...(Platform.OS === "web"
            ? { boxShadow: "0 5px 10px rgba(0, 0, 0, 0.12)" }
            : {
                shadowColor: "#000",
                shadowOpacity: 0.12,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 5 },
                elevation: 8,
            }),
    },
    actionBtnIcon: {
        width: 20,
        height: 20,
        resizeMode: "contain",
    },
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

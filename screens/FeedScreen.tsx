import React from "react";
import { View, StyleSheet, ImageBackground, Image, Text, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BranchCard from "../components/BranchCard";

export default function FeedScreen() {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            <ImageBackground
                source={require("../images/feed_img.png")}
                style={styles.hero}
                resizeMode="cover"
            >
                {/* Top bar - posunuta pod notch */}
                <View style={[styles.topBar, { marginTop: insets.top + 8 }]}>
                    <TouchableOpacity style={styles.locationBtn} activeOpacity={0.85}>
                        <Ionicons name="location-outline" size={16} color="#000" />
                        <Text style={styles.locationText}>Your Location</Text>
                        <Ionicons name="chevron-down" size={16} color="#000" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.filterBtn} activeOpacity={0.85}>
                        <Ionicons name="options-outline" size={18} color="#000" />
                    </TouchableOpacity>
                </View>

                {/* Like/Share buttons - individualne ikonky */}
                <View style={styles.actionsColumn}>
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
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
    },
    locationBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#fff",
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 10,
        ...Platform.select({
            web: { boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)" },
            default: {
                shadowColor: "#000",
                shadowOpacity: 0.15,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 4,
            },
        }),
    },
    locationText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#000",
    },
    filterBtn: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        ...Platform.select({
            web: { boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)" },
            default: {
                shadowColor: "#000",
                shadowOpacity: 0.15,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 4,
            },
        }),
    },
    actionsColumn: {
        position: "absolute",
        right: 16,
        bottom: 185,
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

import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, ViewStyle, DimensionValue } from "react-native";

type Props = {
    width: DimensionValue;
    height: number;
    borderRadius?: number;
    style?: ViewStyle;
};

// Animovaný placeholder - zobrazí sa kým sa načítavajú dáta
export function Skeleton({ width, height, borderRadius = 4, style }: Props) {
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Pulzujúca animácia
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );

        animation.start();
        return () => animation.stop();
    }, [shimmerAnim]);

    const opacity = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                styles.skeleton,
                { width, height, borderRadius, opacity },
                style,
            ]}
        />
    );
}

// Skeleton pre kartu (benefit, info...)
export function SkeletonCard() {
    return (
        <View style={styles.card}>
            <Skeleton width="60%" height={18} borderRadius={4} />
            <View style={styles.cardSpacer} />
            <Skeleton width="100%" height={14} borderRadius={4} />
            <Skeleton width="80%" height={14} borderRadius={4} style={styles.marginTop} />
            <View style={styles.cardSpacerLarge} />
            <Skeleton width="100%" height={40} borderRadius={16} />
        </View>
    );
}

// Skeleton pre text
export function SkeletonText({ width = "100%" }: { width?: DimensionValue }) {
    return <Skeleton width={width} height={14} borderRadius={4} />;
}

// Skeleton pre avatar/profilovku
export function SkeletonAvatar({ size = 40 }: { size?: number }) {
    return <Skeleton width={size} height={size} borderRadius={size / 2} />;
}

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: "#E4E4E7",
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 16,
        borderWidth: 0.5,
        borderColor: "#E4E4E7",
    },
    cardSpacer: {
        height: 12,
    },
    cardSpacerLarge: {
        height: 20,
    },
    marginTop: {
        marginTop: 6,
    },
});

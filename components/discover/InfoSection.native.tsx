import React, { memo, useCallback, useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, Linking, Platform, InteractionManager, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native-gesture-handler";
import MapView, { Marker } from "react-native-maps";
import { useTranslation } from "react-i18next";
import { STATIC_MAP_ZOOM } from "../../lib/constants/discover";
import { zoomToRegion } from "../../lib/maps/camera";

type Props = {
    hours: {
        day: string;
        time: string;
        isToday?: boolean;
    }[];
    address: string;
    phone: string;
    email: string;
    website?: string;
    coordinates?: [number, number]; // [lng, lat]
};

// Helper funkcia mimo komponentu - nepotrebuje byť v rendereri
function isToday(day: string) {
    const todayIndex = new Date().getDay();
    const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
    ];

    return days[todayIndex] === day;
}

// memo() zabraňuje zbytočným renderom ak sa props nezmenia
export const InfoSection = memo(function InfoSection({
    hours,
    address,
    phone,
    email,
    website,
    coordinates,
}: Props) {
    const { t } = useTranslation();
    
    // Odložené renderovanie mapy - počká kým skončia animácie/interakcie
    const [mapReady, setMapReady] = useState(false);

    useEffect(() => {
        // InteractionManager počká kým skončia všetky animácie
        const handle = InteractionManager.runAfterInteractions(() => {
            setMapReady(true);
        });

        return () => handle.cancel();
    }, []);

    // useMemo() - hodnota sa prepočíta len keď sa zmení coordinates
    const mapCoords = useMemo<[number, number]>(
        () => coordinates ?? [18.0936, 48.3061],
        [coordinates]
    );

    // useCallback() - funkcia sa nevytvára nanovo pri každom rendereri
    const handleNavigate = useCallback(() => {
        if (!address) return;

        const encodedAddress = encodeURIComponent(address);
        const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

        Linking.openURL(url);
    }, [address]);

    return (
        <View style={styles.container}>
            {/* OPENING HOURS */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>{t("openingHours")}</Text>

                {hours.map((item) => {
                    const today = isToday(item.day);

                    return (
                        <View key={item.day} style={styles.row}>
                            <Text style={[styles.day, today && styles.today]}>
                                {t(item.day)}
                            </Text>
                            <Text style={[styles.time, today && styles.todayTime]}>
                                {item.time}
                            </Text>
                        </View>
                    );
                })}

                <Text style={styles.note}>
                    {t("holidayNote")}
                </Text>
            </View>

            {/* CONTACT */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>{t("contact")}</Text>

                <View style={styles.contactRow}>
                    <Ionicons name="home-outline" size={20} color="#9B9B9B" />
                    <Text style={styles.contactText}>{address}</Text>
                </View>

                {website && (
                    <TouchableOpacity
                        style={styles.contactRow}
                        onPress={() => Linking.openURL(website)}
                    >
                        <Ionicons name="globe-outline" size={20} color="#9B9B9B" />
                        <Text style={[styles.contactText, styles.linkText]}>{website}</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={styles.contactRow}
                    onPress={() => Linking.openURL(`tel:${phone}`)}
                >
                    <Ionicons name="call-outline" size={20} color="#9B9B9B" />
                    <Text style={styles.contactText}>{phone}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.contactRow}
                    onPress={() => Linking.openURL(`mailto:${email}`)}
                >
                    <Ionicons name="mail-outline" size={20} color="#9B9B9B" />
                    <Text style={styles.contactText}>{email}</Text>
                </TouchableOpacity>
            </View>

            {/* MAP - odložené renderovanie pre plynulejšie prechody */}
            <View style={styles.mapContainer}>
                {!mapReady ? (
                    // Placeholder kým sa mapa načítava
                    <View style={[styles.map, styles.mapLoading]}>
                        <ActivityIndicator size="small" color="#EB8100" />
                    </View>
                ) : Platform.OS === "web" ? (
                    <View style={[styles.map, styles.mapPlaceholder]}>
                        <Text style={styles.mapPlaceholderText}>{t("mapNotAvailable")}</Text>
                    </View>
                ) : (
                    <MapView
                        style={styles.map}
                        region={zoomToRegion(mapCoords, STATIC_MAP_ZOOM)}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        rotateEnabled={false}
                        pitchEnabled={false}
                        toolbarEnabled={false}
                        zoomControlEnabled={false}
                        showsCompass={false}
                        showsPointsOfInterest={Platform.OS === "ios" ? false : undefined}
                    >
                        <Marker
                            identifier="business-location"
                            coordinate={{ latitude: mapCoords[1], longitude: mapCoords[0] }}
                            tracksViewChanges={false}
                        />
                    </MapView>
                )}

                {/* Navigate button overlay */}
                <TouchableOpacity style={styles.navigateBtn} onPress={handleNavigate}>
                    <Ionicons name="navigate" size={14} color="#FAFAFA" />
                    <Text style={styles.navigateText}>{t("navigate")}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        paddingBottom: 20,
    },

    card: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 0.5,
        borderColor: "#E4E4E7",
    },

    cardTitle: {
        fontFamily: "Inter_700Bold",
        fontSize: 17,
        lineHeight: 20,
        color: "#000",
        marginBottom: 16,
    },

    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },

    day: {
        fontFamily: "Inter_500Medium",
        fontSize: 14,
        lineHeight: 20,
        color: "rgba(0, 0, 0, 0.5)",
    },

    today: {
        fontFamily: "Inter_600SemiBold",
        color: "#000",
    },

    time: {
        fontFamily: "Inter_500Medium",
        fontSize: 14,
        lineHeight: 20,
        color: "rgba(0, 0, 0, 0.5)",
        textAlign: "right",
    },

    todayTime: {
        fontFamily: "Inter_600SemiBold",
        color: "#000",
    },

    note: {
        fontFamily: "Inter_500Medium",
        fontSize: 11,
        lineHeight: 15,
        color: "rgba(0, 0, 0, 0.5)",
        marginTop: 14,
    },

    contactRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },

    contactText: {
        fontFamily: "Inter_500Medium",
        fontSize: 14,
        lineHeight: 20,
        color: "rgba(0, 0, 0, 0.5)",
        textAlign: "right",
        flex: 1,
        marginLeft: 16,
    },

    linkText: {
        textDecorationLine: "underline",
    },

    mapContainer: {
        position: "relative",
        marginHorizontal: -15,
        marginTop: 16,
        height: 220,
    },

    map: {
        flex: 1,
    },

    mapPlaceholder: {
        backgroundColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
    },

    mapLoading: {
        backgroundColor: "#F5F5F5",
        justifyContent: "center",
        alignItems: "center",
    },

    mapPlaceholderText: {
        color: "#71717A",
        fontFamily: "Inter_500Medium",
    },

    markerContainer: {
        alignItems: "center",
        justifyContent: "center",
    },

    navigateBtn: {
        position: "absolute",
        left: 26,
        top: -210,
        zIndex: 10,
        elevation: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#EB8100",
        width: 106,
        height: 32,
        borderRadius: 16,
        gap: 8,
    },

    navigateIcon: {
        width: 14,
        height: 14,
    },

    navigateText: {
        color: "#FAFAFA",
        fontFamily: "Inter_600SemiBold",
        fontSize: 12,
        lineHeight: 14,
    },
});

import React from "react";
import { View, Text, StyleSheet, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native-gesture-handler";

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
};

export function InfoSection({
    hours,
    address,
    phone,
    email,
    website,
}: Props) {
    const handleNavigate = () => {
        if (!address) return;

        const encodedAddress = encodeURIComponent(address);
        const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

        Linking.openURL(url);
    };

    return (

        <View style={styles.container}>
            {/* OPENING HOURS */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Opening hours</Text>

                {hours.map((item) => (
                    <View key={item.day} style={styles.row}>
                        <Text style={[styles.day, item.isToday && styles.today]}>
                            {item.day}
                        </Text>
                        <Text style={styles.time}>{item.time}</Text>
                    </View>
                ))}

                <Text style={styles.note}>
                    * During holidays, opening hours may vary. For more information,
                    please contact the venue.
                </Text>
            </View>

            {/* CONTACT */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Contact</Text>

                <View style={styles.contactRow}>
                    <Ionicons name="home-outline" size={18} />
                    <Text style={styles.contactText}>{address}</Text>
                </View>

                <TouchableOpacity
                    style={styles.contactRow}
                    onPress={() => Linking.openURL(`tel:${phone}`)}
                >
                    <Ionicons name="call-outline" size={18} />
                    <Text style={styles.contactText}>{phone}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.contactRow}
                    onPress={() => Linking.openURL(`mailto:${email}`)}
                >
                    <Ionicons name="mail-outline" size={18} />
                    <Text style={styles.contactText}>{email}</Text>
                </TouchableOpacity>

                {website && (
                    <TouchableOpacity
                        style={styles.contactRow}
                        onPress={() => Linking.openURL(website)}
                    >
                        <Ionicons name="globe-outline" size={18} />
                        <Text style={styles.contactText}>{website}</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* MAP / NAVIGATION */}
            <TouchableOpacity style={styles.navigateBtn} onPress={handleNavigate}>
                <Ionicons name="navigate" size={18} color="#fff" />
                <Text style={styles.navigateText}>Navigate</Text>
            </TouchableOpacity>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: 20,
    },

    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#E4E4E7",
    },

    cardTitle: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 12,
    },

    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
    },

    day: {
        fontSize: 14,
    },

    today: {
        fontWeight: "700",
    },

    time: {
        fontSize: 14,
        color: "#71717A",
    },

    note: {
        fontSize: 11,
        color: "#71717A",
        marginTop: 10,
    },

    contactRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },

    contactText: {
        marginLeft: 10,
        fontSize: 14,
        flex: 1,
        color: "#111"
    },

    navigateBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F97316",
        paddingVertical: 14,
        borderRadius: 14,
    },

    navigateText: {
        color: "#fff",
        fontWeight: "600",
        marginLeft: 8,
    },
});

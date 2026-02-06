import React, { memo, useCallback } from "react";
import { View, Text, StyleSheet, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";

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
  coordinates?: [number, number];
};

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

export const InfoSection = memo(function InfoSection({
  hours,
  address,
  phone,
  email,
  website,
}: Props) {
  const { t } = useTranslation();

  const handleNavigate = useCallback(() => {
    if (!address) return;
    const encodedAddress = encodeURIComponent(address);
    const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    Linking.openURL(url);
  }, [address]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("openingHours")}</Text>
        {hours.map((item) => {
          const today = isToday(item.day);
          return (
            <View key={item.day} style={styles.row}>
              <Text style={[styles.day, today && styles.today]}>{t(item.day)}</Text>
              <Text style={[styles.time, today && styles.todayTime]}>{item.time}</Text>
            </View>
          );
        })}
        <Text style={styles.note}>{t("holidayNote")}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("contact")}</Text>

        <View style={styles.contactRow}>
          <Ionicons name="home-outline" size={20} color="#9B9B9B" />
          <Text style={styles.contactText}>{address}</Text>
        </View>

        {website && (
          <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(website)}>
            <Ionicons name="globe-outline" size={20} color="#9B9B9B" />
            <Text style={[styles.contactText, styles.linkText]}>{website}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`tel:${phone}`)}>
          <Ionicons name="call-outline" size={20} color="#9B9B9B" />
          <Text style={styles.contactText}>{phone}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`mailto:${email}`)}>
          <Ionicons name="mail-outline" size={20} color="#9B9B9B" />
          <Text style={styles.contactText}>{email}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <View style={[styles.map, styles.mapPlaceholder]}>
          <Text style={styles.mapPlaceholderText}>{t("mapNotAvailable")}</Text>
        </View>

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
  mapPlaceholderText: {
    color: "#71717A",
    fontFamily: "Inter_500Medium",
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
  navigateText: {
    color: "#FAFAFA",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    lineHeight: 14,
  },
});

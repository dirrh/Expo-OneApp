import BranchCard from "../components/BranchCard";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

export default function FavoriteBranchesScreen() {
    const navigation = useNavigation<any>();
    const { t } = useTranslation();


    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} />
                </TouchableOpacity>
                <Text style={styles.title}>{t("favoriteBranches")}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.container}>
                <BranchCard
                    title="365 GYM Nitra"
                    image={require("../assets/365.jpg")}
                    rating={4.6}
                    distance="1.7 km"
                    hours="9:00 - 21:00"
                    discount="20% discount on first entry"
                    moreCount={2}

                    address="Chrenovská 16, Nitra"
                    phone="+421 903 776 925"
                    email="info@365gym.sk"
                    website="https://365gym.sk"
                    onPress={(branch) =>
                        navigation.navigate("BusinessDetailScreen", { branch })
                    }
                />

                <BranchCard
                    title="RED ROYAL GYM"
                    image={require("../assets/royal.jpg")}
                    rating={4.6}
                    distance="1.7 km"
                    hours="9:00 - 21:00"
                    discount="20% discount on first entry"
                    moreCount={3}
                    address="Trieda Andreja Hlinku 3, Nitra"
                    phone="+421 911 222 333"
                    email="info@redroyal.sk"
                    website="https://redroyal.sk"
                    onPress={(branch) =>
                        navigation.navigate("BusinessDetailScreen", { branch })
                    }
                />

                <BranchCard
                    title="GYM KLUB"
                    image={require("../assets/klub.jpg")}
                    rating={4.6}
                    distance="1.7 km"
                    hours="9:00 - 21:00"
                    discount="20% discount on first entry"
                    moreCount={5}
                    address="Mostná 42, Nitra"
                    phone="+421 904 555 666"
                    email="kontakt@gymklub.sk"
                    website="https://gymklub.sk"
                    onPress={(branch) => {
                        navigation.navigate("BusinessDetailScreen", { branch });
                    }}
                />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        paddingVertical: 10,
        flex: 1,
        padding: 20,
        backgroundColor: "#fff",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginTop: 40,
        marginBottom: 24,
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
    },
    container: {
        paddingBottom: 20,
    },
});

import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState("");

    const navigation = useNavigation<any>();

    const { t } = useTranslation();

    return (
        <View style={styles.container}>

            {/* Header */}
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} />
            </TouchableOpacity>
            <Text style={styles.title}>{t("forgotPassword")}</Text>
            <Text style={styles.subtitle}>
                {t("forgotSubtitle")}
            </Text>

            {/* Email input */}
            <View style={styles.inputWrapper}>
                <Ionicons
                    name="mail-outline"
                    size={20}
                    style={styles.inputIcon}
                />

                <TextInput
                    placeholder={t("email")}
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                />
            </View>

            {/* Continue button */}
            <TouchableOpacity style={styles.button}>
                <Text style={styles.buttonText}>{t("continue")}</Text>
            </TouchableOpacity>
        </View>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        padding: 24,
        paddingTop: 30,
    },
    title: {
        fontSize: 26,
        fontWeight: "700",
        marginBottom: 8,
        marginTop: 20,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 14,
        color: "#888",
        marginBottom: 24,
        textAlign: "center",
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#eee",
        borderRadius: 14,
        paddingHorizontal: 14,
        backgroundColor: "#fafafa",
        marginBottom: 16,
    },
    inputIcon: {
        marginRight: 10,
        color: "#999",
    },
    eyeIcon: {
        marginLeft: 10,
        color: "#999",
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 15,
        color: "#000",
        backgroundColor: "transparent",
    },
    button: {
        backgroundColor: "#f57c00",
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: "center",
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
});

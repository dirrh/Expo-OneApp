import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ViewBase } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);


    const navigation = useNavigation<any>();

    const { t } = useTranslation();

    return (
        <View style={styles.container}>

            {/* HEADER */}
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} />
            </TouchableOpacity>
            <Text style={styles.title}>{t("loginTitle")}</Text>
            <Text style={styles.subtitle}>
                {t("loginSubtitle")}
            </Text>

            {/* EMAIL */}
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

            {/* Password */}
            <View style={styles.inputWrapper}>
                <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    style={styles.inputIcon}
                />

                <TextInput
                    placeholder={t("password")}
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                />

                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                        name={showPassword ? "eye-outline" : "eye-off-outline"}
                        size={20}
                        style={styles.eyeIcon}
                    />
                </TouchableOpacity>
            </View>

            {/* REMEMBER / FORGOT */}
            <View style={styles.row}>
                <View style={styles.remember}>
                    <View style={styles.checkbox} />
                    <Text style={styles.rememberText}>{t("rememberMe")}</Text>
                </View>

                <TouchableOpacity onPress={() => navigation.navigate("ForgottenPassword")}>
                    <Text style={styles.forgot}>{t("forgotPassword")}</Text>
                </TouchableOpacity>
            </View>

            {/* LOGIN BUTTON */}
            <TouchableOpacity style={styles.button}>
                <Text style={styles.buttonText}>{t("login")}</Text>
            </TouchableOpacity>

            {/* SIGN UP */}
            <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
                <Text style={styles.signup}>
                    {t("dont")} <Text style={styles.signupLink}>{t("signup")}</Text>
                </Text>
            </TouchableOpacity>

            {/* DIVIDER */}
            <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.or}>{t("or")}</Text>
                <View style={styles.divider} />
            </View>

            {/* SOCIALNY LOGIN */}
            <View style={styles.socialRow}>
                <View style={styles.socialButton}>
                    <Image
                        source={{ uri: "https://cdn-icons-png.flaticon.com/512/2991/2991148.png" }}
                        style={styles.socialIcon}
                    />
                </View>

                <View style={styles.socialButton}>
                    <Image
                        source={{ uri: "https://cdn-icons-png.flaticon.com/512/0/747.png" }}
                        style={styles.socialIcon}
                    />
                </View>

                <View style={styles.socialButton}>
                    <Image
                        source={{ uri: "https://cdn-icons-png.flaticon.com/512/5968/5968764.png" }}
                        style={styles.socialIcon}
                    />
                </View>
            </View>

        </View>
    )
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
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    remember: {
        flexDirection: "row",
        alignItems: "center",
    },
    checkbox: {
        width: 18,
        height: 18,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 4,
        marginRight: 8,
    },
    rememberText: {
        fontSize: 14,
        color: "#444",
    },
    forgot: {
        color: "#f57c00",
        fontWeight: "600",
    },
    button: {
        backgroundColor: "#f57c00",
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: "center",
        marginBottom: 20,
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    signup: {
        textAlign: "center",
        marginBottom: 20,
        color: "#666",
    },
    signupLink: {
        color: "#f57c00",
        fontWeight: "700",
    },
    dividerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: "#eee",
    },
    or: {
        marginHorizontal: 10,
        color: "#999",
    },
    socialRow: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 20,
    },
    socialButton: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#eee",
        justifyContent: "center",
        alignItems: "center",
        elevation: 2,
    },
    socialIcon: {
        width: 26,
        height: 26,
        resizeMode: "contain",
    },
});

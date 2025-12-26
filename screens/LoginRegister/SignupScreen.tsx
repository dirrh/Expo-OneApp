import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from "react-native";

export default function SignupScreen() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const navigation = useNavigation<any>();
    const { t } = useTranslation();

    return (
        <View style={styles.container}>

            {/* Header */}
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} />
            </TouchableOpacity>
            <Text style={styles.title}>{t("createAccount")}</Text>
            <Text style={styles.subtitle}>
                {t("createSubtitle")}
            </Text>

            {/* Full Name */}
            <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} style={styles.inputIcon} />
                <TextInput
                    placeholder={t("fullName")}
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                />
            </View>

            {/* Email */}
            <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} style={styles.inputIcon} />
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
                <Ionicons name="lock-closed-outline" size={20} style={styles.inputIcon} />

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

            {/* Confirm Password */}
            <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} style={styles.inputIcon} />

                <TextInput
                    placeholder={t("confirmPassword")}
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                />

                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons
                        name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                        size={20}
                        style={styles.eyeIcon}
                    />
                </TouchableOpacity>
            </View>

            {/* Create Account Button */}
            <TouchableOpacity style={styles.button}>
                <Text style={styles.buttonText}>{t("createAccount")}</Text>
            </TouchableOpacity>

            {/* Sign in link */}
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.signin}>
                    {t("already")}
                    <Text style={styles.signinLink}>{t("sign")}</Text>
                </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.or}>{t("or")}</Text>
                <View style={styles.divider} />
            </View>

            {/* Social login */}
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
        textAlign: "center",
    },
    subtitle: {
        fontSize: 14,
        color: "#888",
        marginBottom: 24,
        textAlign: "center",
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 15,
        color: "#000",
    },
    button: {
        backgroundColor: "#f57c00",
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: "center",
        marginTop: 10,
        marginBottom: 20,
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    signin: {
        textAlign: "center",
        marginBottom: 20,
        color: "#666",
    },
    signinLink: {
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
});

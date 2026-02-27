/**
 * LoginScreen: Prihlasovacia obrazovka rieši login cez formulár a sociálne identity.
 *
 * Prečo: Všetky vstupy na prihlásenie sú zjednotené na jednom mieste pre rýchlejší vstup do aplikácie.
 */

import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const passwordInputRef = useRef<TextInput>(null);

    const navigation = useNavigation<any>();
    const { t } = useTranslation();
    const { user } = useAuth();

    // Presmerovanie ak je používateľ už prihlásený
    useEffect(() => {
        const checkOnboarding = async () => {
            if (user) {
                const onboardingCompleted = await AsyncStorage.getItem("onboarding_completed");
                if (onboardingCompleted === "true") {
                    navigation.replace('Tabs')
                } else {
                    navigation.replace('Onboarding');
                }
            }
        };
        checkOnboarding();
    }, [user]);

    const handleLogin = async () => {
        // Validácia
        if (!email || !password) {
            Alert.alert(t("error") || "Error", t("fillAllFields") || "Please fill all fields");
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password,
            });

            if (error) {
                console.error("Login error:", error);
                throw error;
            }

            if (data.user) {
                // Kontrola onboarding statusu a presmerovanie
                const onboardingCompleted = await AsyncStorage.getItem("onboarding_completed");
                if (onboardingCompleted === "false") { // VYMENIT NA "true" PRE ZOBRAZENIE PRI PRVOM LOGINE
                    navigation.reset({
                        index: 0,
                        routes: [{ name: "Tabs" }],
                    });
                } else {
                    navigation.reset({
                        index: 0,
                        routes: [{ name: "Onboarding" }],
                    });
                }
            }
        } catch (error: any) {
            console.error("Login catch error:", error);
            const errorMessage = error?.message || error?.error_description || t("invalidCredentials") || "Invalid email or password";
            Alert.alert(
                t("loginFailed") || "Login Failed",
                errorMessage
            );
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
            });
            if (error) throw error;
        } catch (error: any) {
            Alert.alert(t("error") || "Error", error.message);
        }
    };

    const handleAppleLogin = async () => {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'apple',
            });
            if (error) throw error;
        } catch (error: any) {
            Alert.alert(t("error") || "Error", error.message);
        }
    };

    const handleFacebookLogin = async () => {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'facebook',
            });
            if (error) throw error;
        } catch (error: any) {
            Alert.alert(t("error") || "Error", error.message);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.form}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.navigate("Tabs", { screen: "Discover" })}
                        >
                            <Ionicons name="arrow-back" size={22} color="#000" />
                        </TouchableOpacity>
                        <Text style={styles.title}>{t("loginTitle")}</Text>
                        <Text style={styles.subtitle}>{t("loginSubtitle")}</Text>

                        {/* Email */}
                        <View style={styles.inputWrapper}>
                            <Ionicons name="mail-outline" size={20} style={styles.inputIcon} />
                        <TextInput
                            placeholder={t("email")}
                            placeholderTextColor="#71717A"
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            returnKeyType="next"
                            blurOnSubmit={false}
                            onSubmitEditing={() => passwordInputRef.current?.focus()}
                            editable={!loading}
                        />
                    </View>

                        {/* Password */}
                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed-outline" size={20} style={styles.inputIcon} />
                        <TextInput
                            placeholder={t("password")}
                            placeholderTextColor="#71717A"
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            ref={passwordInputRef}
                            returnKeyType="done"
                            onSubmitEditing={handleLogin}
                            editable={!loading}
                        />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons
                                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                                    size={20}
                                    style={styles.eyeIcon}
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.helperRow}>
                            <TouchableOpacity
                                style={styles.rememberRow}
                                onPress={() => setRememberMe(!rememberMe)}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                                    {rememberMe ? <Ionicons name="checkmark" size={12} color="#000" /> : null}
                                </View>
                                <Text style={styles.rememberText}>{t("rememberMe", "Remember me")}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => navigation.navigate("ForgottenPassword")}
                                style={styles.forgotPassword}
                                disabled={loading}
                            >
                                <Text style={styles.forgotPasswordText}>{t("forgotPassword")}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Login Button */}
                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>{t("login")}</Text>
                            )}
                        </TouchableOpacity>

                        {/* Sign up link */}
                    <TouchableOpacity onPress={() => navigation.navigate("Signup")} disabled={loading}>
                        <Text style={styles.signin}>
                            {t("dont")}{" "}
                            <Text style={styles.signinLink}>{t("signup")}</Text>
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
                            <TouchableOpacity style={styles.socialButton} onPress={handleGoogleLogin} disabled={loading}>
                                <Image
                                    source={{ uri: "https://cdn-icons-png.flaticon.com/512/2991/2991148.png" }}
                                    style={styles.socialIcon}
                                />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.socialButton} onPress={handleAppleLogin} disabled={loading}>
                                <Image
                                    source={{ uri: "https://cdn-icons-png.flaticon.com/512/0/747.png" }}
                                    style={styles.socialIcon}
                                />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.socialButton} onPress={handleFacebookLogin} disabled={loading}>
                                <Image
                                    source={{ uri: "https://cdn-icons-png.flaticon.com/512/5968/5968764.png" }}
                                    style={styles.socialIcon}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    flex: {
        flex: 1,
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 32,
    },
    form: {
        width: "100%",
        maxWidth: 420,
        alignSelf: "center",
    },
    backButton: {
        width: 32,
        height: 32,
        alignSelf: "flex-start",
        alignItems: "flex-start",
        justifyContent: "center",
        marginBottom: 12,
    },
    title: {
        fontSize: 27,
        fontWeight: "700",
        marginBottom: 8,
        textAlign: "center",
        color: "#000",
    },
    subtitle: {
        fontSize: 15,
        lineHeight: 18,
        color: "rgba(0, 0, 0, 0.5)",
        marginBottom: 28,
        textAlign: "center",
    },
    input: {
        flex: 1,
        paddingVertical: 0,
        fontSize: 14,
        color: "#000",
    },
    button: {
        width: "100%",
        backgroundColor: "#EB8100",
        height: 48,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 3,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: "#FAFAFA",
        fontSize: 18,
        fontWeight: "600",
    },
    signin: {
        textAlign: "center",
        marginBottom: 18,
        color: "rgba(0, 0, 0, 0.5)",
        fontSize: 14,
    },
    signinLink: {
        color: "#000",
        fontWeight: "600",
        textDecorationLine: "underline",
    },
    dividerRow: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 18,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: "#E4E4E7",
    },
    or: {
        marginHorizontal: 10,
        fontSize: 13,
        color: "rgba(0, 0, 0, 0.5)",
    },
    socialRow: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "center",
        gap: 24,
    },
    socialButton: {
        width: 55,
        height: 55,
        borderRadius: 100,
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 3,
    },
    socialIcon: {
        width: 30,
        height: 30,
        resizeMode: "contain",
    },
    inputWrapper: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        height: 50,
        borderWidth: 1,
        borderColor: "#E4E4E7",
        borderRadius: 999,
        paddingHorizontal: 12,
        backgroundColor: "#FFFFFF",
        marginBottom: 14,
        gap: 10,
    },
    inputIcon: {
        color: "#71717A",
    },
    eyeIcon: {
        color: "#A6A6A6",
    },
    forgotPassword: {
        justifyContent: "center",
    },
    forgotPasswordText: {
        color: "#09090B",
        fontSize: 12,
        fontWeight: "500",
    },
    helperRow: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 2,
        marginBottom: 10,
    },
    rememberRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    checkbox: {
        width: 16,
        height: 16,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: "#999999",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
    },
    checkboxChecked: {
        backgroundColor: "#FFFFFF",
    },
    rememberText: {
        fontSize: 12,
        fontWeight: "500",
        color: "#09090B",
    },
});

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
    const [loading, setLoading] = useState(false);

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
                    <TouchableOpacity onPress={() => navigation.navigate("Tabs", { screen: t("Discover") })}>
                        <Ionicons name="arrow-back" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.title}>{t("loginTitle")}</Text>
                    <Text style={styles.subtitle}>{t("loginSubtitle")}</Text>

                    {/* Email */}
                    <View style={styles.inputWrapper}>
                        <Ionicons name="mail-outline" size={20} style={styles.inputIcon} />
                        <TextInput
                            placeholder={t("email")}
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            editable={!loading}
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

                    {/* Forgot Password */}
                    <TouchableOpacity 
                        onPress={() => navigation.navigate("ForgottenPassword")} 
                        style={styles.forgotPassword}
                        disabled={loading}
                    >
                        <Text style={styles.forgotPasswordText}>{t("forgotPassword")}</Text>
                    </TouchableOpacity>

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
                            {t("dont")}
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
        padding: 24,
        paddingTop: 16,
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
    buttonDisabled: {
        opacity: 0.6,
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
    forgotPassword: {
        alignSelf: "flex-end",
        marginBottom: 20,
    },
    forgotPasswordText: {
        color: "#f57c00",
        fontSize: 14,
        fontWeight: "600",
    },
});

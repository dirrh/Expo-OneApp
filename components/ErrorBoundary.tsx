import React, { Component, ReactNode } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
    children: ReactNode;
    fallback?: ReactNode;
};

type State = {
    hasError: boolean;
    error: Error | null;
};

// Zachytáva chyby v komponentoch a zobrazí fallback namiesto crashu
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary:", error);
        console.error("Stack:", errorInfo.componentStack);
        // Tu pridať Sentry alebo iný error tracking
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <View style={styles.container}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
                    </View>
                    
                    <Text style={styles.title}>Ups! Niečo sa pokazilo</Text>
                    
                    <Text style={styles.message}>
                        Nastala neočakávaná chyba. Skúste to znova.
                    </Text>

                    {__DEV__ && this.state.error && (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>
                                {this.state.error.message}
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
                        <Ionicons name="refresh" size={18} color="#fff" />
                        <Text style={styles.buttonText}>Skúsiť znova</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

// HOC wrapper - obalí komponent error boundariou
export function withErrorBoundary<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    fallback?: ReactNode
) {
    return function WithErrorBoundary(props: P) {
        return (
            <ErrorBoundary fallback={fallback}>
                <WrappedComponent {...props} />
            </ErrorBoundary>
        );
    };
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        backgroundColor: "#fff",
    },
    iconContainer: {
        marginBottom: 16,
    },
    title: {
        fontFamily: "Inter_700Bold",
        fontSize: 20,
        color: "#111",
        marginBottom: 8,
        textAlign: "center",
    },
    message: {
        fontFamily: "Inter_500Medium",
        fontSize: 14,
        color: "#71717A",
        textAlign: "center",
        marginBottom: 24,
    },
    errorBox: {
        backgroundColor: "#FEF2F2",
        padding: 12,
        borderRadius: 8,
        marginBottom: 24,
        maxWidth: "100%",
    },
    errorText: {
        fontFamily: "Inter_500Medium",
        fontSize: 12,
        color: "#DC2626",
    },
    button: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#EB8100",
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 8,
    },
    buttonText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 14,
        color: "#fff",
    },
});

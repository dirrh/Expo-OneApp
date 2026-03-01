import React, { Component, type ReactNode } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
  resetKey: number;
};

/**
 * MapErrorBoundary: Zachytí crash v MapView / marker renderingu a ponúkne retry
 * bez zhodenia celého DiscoverScreen.
 *
 * Retry resetuje MapView cez React key increment (úplný unmount + remount).
 */
export class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, resetKey: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (__DEV__) {
      console.error("[MapErrorBoundary]", error);
      console.error("[MapErrorBoundary] stack:", errorInfo.componentStack);
    }
  }

  handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      resetKey: prev.resetKey + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={mapBoundaryStyles.container}>
          <Ionicons name="map-outline" size={48} color="#9CA3AF" />
          <Text style={mapBoundaryStyles.title}>Mapa nie je dostupná</Text>
          <Text style={mapBoundaryStyles.message}>
            Nastala chyba pri zobrazení mapy. Skúste to znova.
          </Text>
          {__DEV__ && this.state.error && (
            <View style={mapBoundaryStyles.errorBox}>
              <Text style={mapBoundaryStyles.errorText}>
                {this.state.error.message}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={mapBoundaryStyles.button}
            onPress={this.handleRetry}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={mapBoundaryStyles.buttonText}>Skúsiť znova</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <React.Fragment key={this.state.resetKey}>
        {this.props.children}
      </React.Fragment>
    );
  }
}

const mapBoundaryStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#F9FAFB",
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#111",
    marginTop: 12,
    marginBottom: 6,
    textAlign: "center",
  },
  message: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "#71717A",
    textAlign: "center",
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: "#FEF2F2",
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    maxWidth: "100%",
  },
  errorText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
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

import React from "react";
import { Text, View } from "react-native";
import type { DiscoverMapProps } from "../../lib/interfaces";
import { styles } from "./discoverStyles";

function DiscoverMap(_props: DiscoverMapProps) {
  return (
    <View style={styles.map}>
      <Text style={{ textAlign: "center", marginTop: 50, color: "#666" }}>
        Map view is not available on web. Please use the mobile app.
      </Text>
    </View>
  );
}

export default DiscoverMap;

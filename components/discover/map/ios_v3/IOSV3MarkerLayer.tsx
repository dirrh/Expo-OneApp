import React, { useMemo } from "react";
import { Marker } from "react-native-maps";
import type { IOSV3RenderItem } from "./types";

type IOSV3MarkerLayerProps = {
  markers: IOSV3RenderItem[];
  onPressMarker: (marker: IOSV3RenderItem) => void;
};

export function IOSV3MarkerLayer({ markers, onPressMarker }: IOSV3MarkerLayerProps) {
  const elements = useMemo(
    () =>
      markers.map((marker) => (
        <Marker
          key={marker.key}
          coordinate={marker.coordinate}
          image={marker.image}
          zIndex={marker.zIndex}
          tracksViewChanges={false}
          opacity={marker.isPoolPlaceholder ? 0 : 1}
          onPress={marker.isPoolPlaceholder ? undefined : () => onPressMarker(marker)}
          {...(marker.anchor ? { anchor: marker.anchor } : {})}
        />
      )),
    [markers, onPressMarker]
  );

  return <>{elements}</>;
}


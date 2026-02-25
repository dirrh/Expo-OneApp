import React, { useMemo } from "react";
import { Marker } from "react-native-maps";
import type { IOSRenderItem } from "../types";

type IOSMarkerLayerProps = {
  markers: IOSRenderItem[];
  onPressMarker: (marker: IOSRenderItem) => void;
};

export function IOSMarkerLayer({ markers, onPressMarker }: IOSMarkerLayerProps) {
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

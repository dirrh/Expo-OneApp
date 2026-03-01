import React, { memo, useMemo } from "react";
import { Marker } from "react-native-maps";
import type { IOSV3RenderItem } from "./types";

const IOS_V3_MARKER_IMAGE_FALLBACK = require("../../../../images/icons/ios-scaled/compact-pins/multi.png");

const isValidCoordinate = (c: { latitude: number; longitude: number }) =>
  Number.isFinite(c?.latitude) &&
  Number.isFinite(c?.longitude) &&
  Math.abs(c.latitude) <= 90 &&
  Math.abs(c.longitude) <= 180;

const PLACEHOLDER_COORD = { latitude: -80, longitude: -170 };

type IOSV3MarkerLayerProps = {
  markers: IOSV3RenderItem[];
  onPressMarker: (marker: IOSV3RenderItem) => void;
};

export const IOSV3MarkerLayer = memo(function IOSV3MarkerLayer({
  markers,
  onPressMarker,
}: IOSV3MarkerLayerProps) {
  const elements = useMemo(
    () =>
      markers.map((marker) => {
        const shouldUseNativePin = Boolean(marker.markerData?.useNativePin);
        const image = shouldUseNativePin
          ? undefined
          : marker.image != null
            ? marker.image
            : IOS_V3_MARKER_IMAGE_FALLBACK;
        const coordinate = isValidCoordinate(marker.coordinate)
          ? marker.coordinate
          : PLACEHOLDER_COORD;
        return (
          <Marker
            key={marker.key}
            identifier={marker.key}
            coordinate={coordinate}
            zIndex={marker.zIndex}
            tracksViewChanges={false}
            opacity={marker.isPoolPlaceholder ? 0 : 1}
            onPress={marker.isPoolPlaceholder ? undefined : () => onPressMarker(marker)}
            {...(image ? { image } : {})}
            {...(image && marker.anchor ? { anchor: marker.anchor } : {})}
          />
        );
      }),
    [markers, onPressMarker]
  );

  return <>{elements}</>;
});

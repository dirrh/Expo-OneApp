import { Platform } from "react-native";
import type { MapViewRef } from "../interfaces";

type MapCameraOptions = {
  center: [number, number];
  zoom: number;
  durationMs?: number;
};

export const setMapCamera = (ref: MapViewRef, options: MapCameraOptions) => {
  const view = ref.current;
  if (!view) return;

  const { center, zoom, durationMs } = options;

  const result =
    Platform.OS === "ios"
      ? view.setCameraPosition({
          coordinates: { latitude: center[1], longitude: center[0] },
          zoom,
        })
      : Platform.OS === "android"
      ? view.setCameraPosition({
          coordinates: { latitude: center[1], longitude: center[0] },
          zoom,
          durationMs,
        })
      : undefined;

  if (result && typeof (result as Promise<void>).catch === "function") {
    (result as Promise<void>).catch(() => {
      // Ignore animation cancellations from rapid camera updates.
    });
  }
};

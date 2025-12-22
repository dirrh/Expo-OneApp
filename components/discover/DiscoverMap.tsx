import React from "react";
import { Image } from "react-native";
import Mapbox, { Camera, MarkerView, MapView, LocationPuck, UserLocation } from "@rnmapbox/maps";
import type { DiscoverMapProps } from "../../lib/interfaces";
import { styles } from "./discoverStyles";

export default function DiscoverMap({
  cameraRef,
  filteredMarkers,
  onUserLocationUpdate,
}: DiscoverMapProps) {
  return (
    <MapView style={styles.map} styleURL={Mapbox.StyleURL.Street} scaleBarEnabled={false}>
      <Camera ref={cameraRef} centerCoordinate={[18.091, 48.3069]} zoomLevel={14} />

      <UserLocation
        visible
        onUpdate={(location) => {
          onUserLocationUpdate([location.coords.longitude, location.coords.latitude]);
        }}
      />

      <LocationPuck
        topImage={Image.resolveAssetSource(require("../../images/navigation.png")).uri}
        visible={true}
        scale={["interpolate", ["linear"], ["zoom"], 10, 1.0, 20, 4.0]}
        pulsing={{
          isEnabled: true,
          color: "teal",
          radius: 50.0,
        }}
      />

      {filteredMarkers.map((marker) => (
        <MarkerView
          key={marker.id}
          coordinate={[marker.coord.lng, marker.coord.lat]}
          anchor={{ x: 0.5, y: 1 }}
        >
          <Image source={marker.icon} style={styles.icon} />
        </MarkerView>
      ))}
    </MapView>
  );
}

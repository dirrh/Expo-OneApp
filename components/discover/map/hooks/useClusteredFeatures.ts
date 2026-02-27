import { useMemo } from "react";
import Supercluster from "supercluster";
import type { DiscoverMapMarker } from "../../../../lib/interfaces";
import { zoomToRegion } from "../../../../lib/maps/camera";
import {
  buildClusterPointFeatures,
  buildClusteredFeaturesFromRaw,
} from "../pipelines/clusterPipeline";
import type { ClusterViewportBounds, RenderFeature } from "../types";
import { VIEWPORT_PADDING_RATIO } from "../constants";

type UseClusteredFeaturesParams = {
  showClusterLayer: boolean;
  filteredMarkers: DiscoverMapMarker[];
  cameraCenter: [number, number];
  zoom: number;
  shouldCullClustersByViewport: boolean;
  mapMarkerPipelineOptV1: boolean;
  clusterRadiusPx: number;
  forceClusterZoom: number;
  stableClusterZoom: number;
  isIOS: boolean;
};

export const useClusteredFeatures = ({
  showClusterLayer,
  filteredMarkers,
  cameraCenter,
  zoom,
  shouldCullClustersByViewport,
  mapMarkerPipelineOptV1,
  clusterRadiusPx,
  forceClusterZoom,
  stableClusterZoom,
  isIOS,
}: UseClusteredFeaturesParams): RenderFeature[] => {
  const clusterPointFeatures = useMemo(() => {
    if (!showClusterLayer || !mapMarkerPipelineOptV1) {
      return [];
    }
    return buildClusterPointFeatures(filteredMarkers);
  }, [filteredMarkers, mapMarkerPipelineOptV1, showClusterLayer]);

  const clusterIndex = useMemo(() => {
    if (!showClusterLayer || !mapMarkerPipelineOptV1 || clusterPointFeatures.length === 0) {
      return null;
    }
    const index = new Supercluster({
      radius: clusterRadiusPx,
      minPoints: 2,
      minZoom: 0,
      maxZoom: forceClusterZoom,
      map: (properties) => ({
        weight:
          typeof properties.weight === "number" && Number.isFinite(properties.weight)
            ? properties.weight
            : 1,
      }),
      reduce: (accumulated, properties) => {
        accumulated.weight +=
          typeof properties.weight === "number" && Number.isFinite(properties.weight)
            ? properties.weight
            : 1;
      },
    });
    index.load(clusterPointFeatures);
    return index;
  }, [
    clusterPointFeatures,
    clusterRadiusPx,
    forceClusterZoom,
    mapMarkerPipelineOptV1,
    showClusterLayer,
  ]);

  const paddedViewport = useMemo<ClusterViewportBounds | null>(
    () =>
      shouldCullClustersByViewport
        ? (() => {
            const viewportRegion = zoomToRegion(cameraCenter, zoom);
            const halfLng = Math.min(
              179.999,
              Math.max(0.0001, Math.abs(viewportRegion.longitudeDelta) / 2)
            );
            const halfLat = Math.min(
              85,
              Math.max(0.0001, Math.abs(viewportRegion.latitudeDelta) / 2)
            );
            const paddedHalfLng = Math.min(
              179.999,
              Math.max(0.0001, halfLng * (1 + VIEWPORT_PADDING_RATIO))
            );
            const paddedHalfLat = Math.min(
              85,
              Math.max(0.0001, halfLat * (1 + VIEWPORT_PADDING_RATIO))
            );
            return {
              minLng: Math.max(-180, viewportRegion.longitude - paddedHalfLng),
              maxLng: Math.min(180, viewportRegion.longitude + paddedHalfLng),
              minLat: Math.max(-85, viewportRegion.latitude - paddedHalfLat),
              maxLat: Math.min(85, viewportRegion.latitude + paddedHalfLat),
            };
          })()
        : null,
    [cameraCenter, shouldCullClustersByViewport, zoom]
  );

  return useMemo(() => {
    if (!showClusterLayer || filteredMarkers.length === 0) {
      return [];
    }

    const worldBbox: [number, number, number, number] = [-180, -85, 180, 85];
    const worldSize = 256 * Math.pow(2, stableClusterZoom);

    if (mapMarkerPipelineOptV1) {
      if (!clusterIndex) {
        return [];
      }
      const rawClusters = clusterIndex.getClusters(worldBbox, stableClusterZoom);
      const culledFeatures = buildClusteredFeaturesFromRaw({
        rawClusters,
        worldSize,
        clusterRadiusPx,
        isIOS,
        shouldCullClustersByViewport,
        paddedViewport,
      });
      if (
        shouldCullClustersByViewport &&
        culledFeatures.length === 0 &&
        rawClusters.length > 0
      ) {
        return buildClusteredFeaturesFromRaw({
          rawClusters,
          worldSize,
          clusterRadiusPx,
          isIOS,
          shouldCullClustersByViewport: false,
          paddedViewport: null,
        });
      }
      return culledFeatures;
    }

    const pointFeatures = buildClusterPointFeatures(filteredMarkers);
    if (pointFeatures.length === 0) {
      return [];
    }

    const legacyIndex = new Supercluster({
      radius: clusterRadiusPx,
      minPoints: 2,
      minZoom: 0,
      maxZoom: forceClusterZoom,
      map: (properties) => ({
        weight:
          typeof properties.weight === "number" && Number.isFinite(properties.weight)
            ? properties.weight
            : 1,
      }),
      reduce: (accumulated, properties) => {
        accumulated.weight +=
          typeof properties.weight === "number" && Number.isFinite(properties.weight)
            ? properties.weight
            : 1;
      },
    });
    legacyIndex.load(pointFeatures);

    const rawClusters = legacyIndex.getClusters(worldBbox, stableClusterZoom);
    const culledFeatures = buildClusteredFeaturesFromRaw({
      rawClusters,
      worldSize,
      clusterRadiusPx,
      isIOS,
      shouldCullClustersByViewport,
      paddedViewport,
    });
    if (
      shouldCullClustersByViewport &&
      culledFeatures.length === 0 &&
      rawClusters.length > 0
    ) {
      return buildClusteredFeaturesFromRaw({
        rawClusters,
        worldSize,
        clusterRadiusPx,
        isIOS,
        shouldCullClustersByViewport: false,
        paddedViewport: null,
      });
    }
    return culledFeatures;
  }, [
    clusterIndex,
    clusterRadiusPx,
    filteredMarkers,
    forceClusterZoom,
    isIOS,
    mapMarkerPipelineOptV1,
    paddedViewport,
    shouldCullClustersByViewport,
    showClusterLayer,
    stableClusterZoom,
  ]);
};

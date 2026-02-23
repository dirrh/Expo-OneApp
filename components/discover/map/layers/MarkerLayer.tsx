import React, { useMemo } from "react";
import { Image, Platform, View } from "react-native";
import type { ImageURISource } from "react-native";
import { Marker } from "react-native-maps";
import {
  clampNumber,
  getDefaultPinColor,
  getIOSScaledMarkerSize,
  isValidMapCoordinate,
  isValidMarkerImage,
} from "../../../../lib/maps/discoverMapUtils";
import {
  hasLocalFullMarkerSprite,
  resolveMarkerImage,
} from "../../../../lib/maps/markerImageProvider";
import { FULL_SPRITE_FADE_EPSILON } from "../constants";
import { localStyles } from "../styles";
import type { RenderMarker, ResolvedMarkerVisual } from "../types";

type MarkerLayerProps = {
  renderMarkers: RenderMarker[];
  inlineLabelIdSet: Set<string>;
  effectiveFullSpriteOpacityById: Record<string, number>;
  clusterTracksViewChangesEnabled: boolean;
  hasActiveFilter: boolean;
  handleMarkerPress: (marker: RenderMarker) => void;
  mapMarkerPipelineOptV1: boolean;
  resolvedMarkerVisualById: Map<string, ResolvedMarkerVisual>;
  isIOSStableMarkersMode: boolean;
  fullSpriteTextLayersEnabled: boolean;
  failedRemoteSpriteKeySet: Set<string>;
  useOverlayFullSprites: boolean;
};

const sanitizeAnchor = (anchor?: { x: number; y: number }) => {
  if (!anchor) {
    return undefined;
  }
  const x = anchor.x;
  const y = anchor.y;
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return undefined;
  }
  return {
    x: clampNumber(x, 0, 1),
    y: clampNumber(y, 0, 1),
  };
};

const canUseMarkerImagePropOnPlatform = (
  source: number | ImageURISource | undefined
) => {
  if (!isValidMarkerImage(source)) {
    return false;
  }
  // iOS MapKit marker image prop is safest with static assets (number require sources).
  if (Platform.OS === "ios" && typeof source !== "number") {
    return false;
  }
  return true;
};

export function MarkerLayer({
  renderMarkers,
  inlineLabelIdSet,
  effectiveFullSpriteOpacityById,
  clusterTracksViewChangesEnabled,
  hasActiveFilter,
  handleMarkerPress,
  mapMarkerPipelineOptV1,
  resolvedMarkerVisualById,
  isIOSStableMarkersMode,
  fullSpriteTextLayersEnabled,
  failedRemoteSpriteKeySet,
  useOverlayFullSprites,
}: MarkerLayerProps) {
  const markerElements = useMemo(() => {
    const elements: React.ReactNode[] = [];

    for (let index = 0; index < renderMarkers.length; index += 1) {
      const marker = renderMarkers[index];
      if (!isValidMapCoordinate(marker.coordinate.latitude, marker.coordinate.longitude)) {
        continue;
      }

      const inlineLabelSelected = inlineLabelIdSet.has(marker.id);
      let markerImage: number | ImageURISource | undefined = marker.image;
      let markerAnchor: { x: number; y: number } | undefined = marker.anchor;
      let iosStableCompactImage: number | undefined;
      let iosStableCompactAnchor: { x: number; y: number } | undefined;
      let iosStableFullImage: number | undefined;
      let iosStableFullAnchor: { x: number; y: number } | undefined;

      if (!marker.isCluster && !marker.isStacked && marker.markerData) {
        if (mapMarkerPipelineOptV1) {
          const markerVisual = resolvedMarkerVisualById.get(marker.id);
          if (markerVisual) {
            markerImage = markerVisual.compactImage;
            markerAnchor = markerVisual.compactAnchor;
            iosStableCompactImage = markerVisual.iosStableCompactImage;
            iosStableCompactAnchor = markerVisual.iosStableCompactAnchor;
            iosStableFullImage = markerVisual.iosStableFullImage;
            iosStableFullAnchor = markerVisual.iosStableFullAnchor;
          }
        } else {
          const hasLocalInlineFullSprite = hasLocalFullMarkerSprite(marker.markerData);
          const canUseIOSStableInlineSprite =
            isIOSStableMarkersMode &&
            fullSpriteTextLayersEnabled &&
            hasLocalInlineFullSprite;

          if (canUseIOSStableInlineSprite) {
            const compactResolved = resolveMarkerImage(marker.markerData, {
              preferFullSprite: false,
              remoteSpriteFailureKeys: failedRemoteSpriteKeySet,
            });
            markerImage = compactResolved.image;
            markerAnchor = compactResolved.anchor;
            if (typeof compactResolved.image === "number") {
              iosStableCompactImage = compactResolved.image;
              iosStableCompactAnchor = compactResolved.anchor;
            }

            const fullResolved = resolveMarkerImage(marker.markerData, {
              preferFullSprite: true,
              preferLocalFullSprite: true,
              remoteSpriteFailureKeys: failedRemoteSpriteKeySet,
            });
            if (
              fullResolved.variant !== "compact" &&
              typeof fullResolved.image === "number"
            ) {
              iosStableFullImage = fullResolved.image;
              iosStableFullAnchor = fullResolved.anchor;
            }
          } else {
            const compactResolved = resolveMarkerImage(marker.markerData, {
              preferFullSprite: false,
              remoteSpriteFailureKeys: failedRemoteSpriteKeySet,
            });
            markerImage = compactResolved.image;
            markerAnchor = compactResolved.anchor;
          }
        }
      }

      const canUseCustomImage = canUseMarkerImagePropOnPlatform(markerImage);
      const imageProp = canUseCustomImage ? markerImage : undefined;
      const anchorProp = canUseCustomImage ? sanitizeAnchor(markerAnchor) : undefined;
      const markerPinColor = canUseCustomImage
        ? undefined
        : getDefaultPinColor(marker, hasActiveFilter);
      const fullOpacityForMarker =
        !marker.isCluster && !marker.isStacked
          ? clampNumber(effectiveFullSpriteOpacityById[marker.id] ?? 0, 0, 1)
          : 0;
      const compactMarkerOpacity =
        useOverlayFullSprites && fullOpacityForMarker >= 1 - FULL_SPRITE_FADE_EPSILON
          ? 0
          : 1;
      const markerTracksViewChanges = marker.isCluster
        ? clusterTracksViewChangesEnabled
        : false;
      const numericImageProp = typeof imageProp === "number" ? imageProp : undefined;
      const iosCompactImageSource =
        typeof iosStableCompactImage === "number"
          ? iosStableCompactImage
          : numericImageProp;
      const shouldRenderIOSScaledStaticImage =
        isIOSStableMarkersMode && typeof iosCompactImageSource === "number";
      const iosFullImageSource =
        typeof iosStableFullImage === "number" ? iosStableFullImage : undefined;
      const iosScaledMarkerSize = shouldRenderIOSScaledStaticImage
        ? getIOSScaledMarkerSize(iosCompactImageSource!)
        : undefined;
      const iosScaledFullSpriteSize =
        shouldRenderIOSScaledStaticImage && typeof iosFullImageSource === "number"
          ? getIOSScaledMarkerSize(iosFullImageSource!)
          : undefined;
      const iosScaledMarkerWrapperSize =
        shouldRenderIOSScaledStaticImage && iosScaledMarkerSize
          ? {
              width: Math.max(
                iosScaledMarkerSize.width,
                iosScaledFullSpriteSize?.width ?? iosScaledMarkerSize.width
              ),
              height: Math.max(
                iosScaledMarkerSize.height,
                iosScaledFullSpriteSize?.height ?? iosScaledMarkerSize.height
              ),
            }
          : undefined;
      const sanitizedIosStableCompactAnchor = sanitizeAnchor(iosStableCompactAnchor);
      const sanitizedIosStableFullAnchor = sanitizeAnchor(iosStableFullAnchor);
      const iosScaledActiveAnchor =
        sanitizedIosStableCompactAnchor ?? anchorProp ?? { x: 0.5, y: 1 };
      const iosScaledWrapperAnchor =
        shouldRenderIOSScaledStaticImage && sanitizedIosStableFullAnchor
          ? sanitizedIosStableFullAnchor
          : iosScaledActiveAnchor;
      const iosScaledCompactOffset =
        shouldRenderIOSScaledStaticImage &&
        iosScaledMarkerSize &&
        iosScaledMarkerWrapperSize
          ? {
              left:
                iosScaledWrapperAnchor.x * iosScaledMarkerWrapperSize.width -
                iosScaledActiveAnchor.x * iosScaledMarkerSize.width,
              top:
                iosScaledWrapperAnchor.y * iosScaledMarkerWrapperSize.height -
                iosScaledActiveAnchor.y * iosScaledMarkerSize.height,
            }
          : undefined;
      const iosScaledFullOffset =
        shouldRenderIOSScaledStaticImage &&
        iosScaledFullSpriteSize &&
        iosScaledMarkerWrapperSize
          ? {
              left:
                iosScaledWrapperAnchor.x * iosScaledMarkerWrapperSize.width -
                (sanitizedIosStableFullAnchor?.x ?? iosScaledWrapperAnchor.x) *
                  iosScaledFullSpriteSize.width,
              top:
                iosScaledWrapperAnchor.y * iosScaledMarkerWrapperSize.height -
                (sanitizedIosStableFullAnchor?.y ?? iosScaledWrapperAnchor.y) *
                  iosScaledFullSpriteSize.height,
            }
          : undefined;
      const iosUseDualLayer =
        shouldRenderIOSScaledStaticImage &&
        typeof iosFullImageSource === "number" &&
        iosScaledFullSpriteSize &&
        iosScaledFullOffset;
      const resolvedAnchorProp =
        shouldRenderIOSScaledStaticImage && iosScaledWrapperAnchor
          ? iosScaledWrapperAnchor
          : anchorProp;

      elements.push(
        <Marker
          key={marker.key}
          coordinate={marker.coordinate}
          zIndex={marker.zIndex}
          opacity={compactMarkerOpacity}
          onPress={() => handleMarkerPress(marker)}
          {...(!shouldRenderIOSScaledStaticImage && imageProp
            ? { image: imageProp, tracksViewChanges: markerTracksViewChanges }
            : shouldRenderIOSScaledStaticImage
              ? { tracksViewChanges: markerTracksViewChanges }
              : {})}
          {...(resolvedAnchorProp ? { anchor: resolvedAnchorProp } : {})}
          {...(markerPinColor ? { pinColor: markerPinColor } : {})}
        >
          {shouldRenderIOSScaledStaticImage &&
          iosScaledMarkerSize &&
          iosScaledMarkerWrapperSize &&
          iosScaledCompactOffset ? (
            <View
              style={[
                localStyles.iosMarkerImageWrap,
                {
                  width: iosScaledMarkerWrapperSize.width,
                  height: iosScaledMarkerWrapperSize.height,
                },
              ]}
            >
              <Image
                source={iosCompactImageSource!}
                style={[
                  localStyles.iosMarkerImage,
                  iosScaledMarkerSize,
                  iosScaledCompactOffset,
                  iosUseDualLayer && inlineLabelSelected
                    ? localStyles.iosMarkerLayerHidden
                    : localStyles.iosMarkerLayerVisible,
                ]}
                resizeMode="contain"
                fadeDuration={0}
              />
              {iosUseDualLayer && iosScaledFullOffset ? (
                <Image
                  source={iosFullImageSource!}
                  style={[
                    localStyles.iosMarkerImage,
                    iosScaledFullSpriteSize,
                    iosScaledFullOffset,
                    inlineLabelSelected
                      ? localStyles.iosMarkerLayerVisible
                      : localStyles.iosMarkerLayerHidden,
                  ]}
                  resizeMode="contain"
                  fadeDuration={0}
                />
              ) : null}
            </View>
          ) : null}
        </Marker>
      );
    }

    return elements;
  }, [
    effectiveFullSpriteOpacityById,
    failedRemoteSpriteKeySet,
    clusterTracksViewChangesEnabled,
    fullSpriteTextLayersEnabled,
    hasActiveFilter,
    handleMarkerPress,
    inlineLabelIdSet,
    isIOSStableMarkersMode,
    mapMarkerPipelineOptV1,
    renderMarkers,
    resolvedMarkerVisualById,
    useOverlayFullSprites,
  ]);

  return <>{markerElements}</>;
}

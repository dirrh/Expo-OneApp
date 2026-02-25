import { Image } from "react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DiscoverMapMarker } from "../../../../lib/interfaces";
import {
  getMarkerRemoteSpriteUrl,
  getMarkerSpriteKey,
  hasLocalFullMarkerSprite,
} from "../../../../lib/maps/markerImageProvider";
import { appendUniqueValue } from "../../../../lib/maps/discoverMapUtils";
import {
  MAP_FULL_SPRITES_LOGS_ENABLED,
} from "../../../../lib/constants/discover";
import {
  CLUSTER_TO_SINGLE_FADE_WINDOW_MS,
  FULL_SPRITE_FADE_EPSILON,
  FULL_SPRITE_FADE_IN_DURATION_MS,
  FULL_SPRITE_FADE_OUT_DURATION_MS,
} from "../constants";
import { areOpacityMapsEqual } from "../pipelines/markerVisualPipeline";

type UseFullSpriteOverlayParams = {
  inlineLabelIds: string[];
  localFullSpriteIdSet: Set<string>;
  singleMarkerById: Map<string, DiscoverMapMarker>;
  fullSpriteTextLayersEnabled: boolean;
  showSingleLayer: boolean;
  isIOSStableMarkersMode: boolean;
  useOverlayFullSprites: boolean;
  allowRemoteFullSpriteOverlay: boolean;
  fullSpriteFadeEnabled: boolean;
  filteredMarkersLength: number;
};

type UseFullSpriteOverlayResult = {
  readyFullSpriteIds: string[];
  readyFullSpriteIdSet: Set<string>;
  fullSpriteTargetIdSet: Set<string>;
  effectiveFullSpriteOpacityById: Record<string, number>;
  inlineTextRenderedByMarkerIdSet: Set<string>;
  failedRemoteSpriteKeys: string[];
  failedRemoteSpriteKeySet: Set<string>;
};

export const useFullSpriteOverlay = ({
  inlineLabelIds,
  localFullSpriteIdSet,
  singleMarkerById,
  fullSpriteTextLayersEnabled,
  showSingleLayer,
  isIOSStableMarkersMode,
  useOverlayFullSprites,
  allowRemoteFullSpriteOverlay,
  fullSpriteFadeEnabled,
  filteredMarkersLength,
}: UseFullSpriteOverlayParams): UseFullSpriteOverlayResult => {
  const [readyFullSpriteIds, setReadyFullSpriteIds] = useState<string[]>([]);
  const [fullSpriteOpacityById, setFullSpriteOpacityById] = useState<
    Record<string, number>
  >({});
  const [failedRemoteSpriteKeys, setFailedRemoteSpriteKeys] = useState<string[]>([]);

  const mountedRef = useRef(true);
  const prefetchGenerationRef = useRef(0);
  const pendingRemoteSpritePrefetchRef = useRef(new Set<string>());
  const fullSpriteOpacityByIdRef = useRef<Record<string, number>>({});
  const fullSpriteTargetIdsRef = useRef<Set<string>>(new Set());
  const fullSpriteFadeRafRef = useRef<number | null>(null);
  const fullSpriteFadePrevTsRef = useRef<number | null>(null);
  const clusterToSingleFadeUntilRef = useRef(0);
  const previousShowSingleLayerRef = useRef(showSingleLayer);
  const showSingleLayerRef = useRef(showSingleLayer);

  useEffect(() => {
    showSingleLayerRef.current = showSingleLayer;
  }, [showSingleLayer]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const readyFullSpriteIdSet = useMemo(
    () => new Set(readyFullSpriteIds),
    [readyFullSpriteIds]
  );

  const fullSpriteTargetIdSet = useMemo(() => {
    if (!useOverlayFullSprites || !showSingleLayer) {
      return new Set<string>();
    }
    const next = new Set<string>();
    inlineLabelIds.forEach((id) => {
      if (localFullSpriteIdSet.has(id) || readyFullSpriteIdSet.has(id)) {
        next.add(id);
      }
    });
    return next;
  }, [
    useOverlayFullSprites,
    inlineLabelIds,
    localFullSpriteIdSet,
    readyFullSpriteIdSet,
    showSingleLayer,
  ]);

  const fullSpriteTargetHash = useMemo(() => {
    if (fullSpriteTargetIdSet.size === 0) {
      return "";
    }
    return Array.from(fullSpriteTargetIdSet).sort().join("|");
  }, [fullSpriteTargetIdSet]);

  const effectiveFullSpriteOpacityById = useMemo(() => {
    if (fullSpriteFadeEnabled) {
      return fullSpriteOpacityById;
    }
    const immediateMap: Record<string, number> = {};
    fullSpriteTargetIdSet.forEach((id) => {
      immediateMap[id] = 1;
    });
    return immediateMap;
  }, [fullSpriteFadeEnabled, fullSpriteOpacityById, fullSpriteTargetIdSet]);

  const inlineTextRenderedByMarkerIdSet = useMemo(() => {
    if (!fullSpriteTextLayersEnabled || !showSingleLayer) {
      return new Set<string>();
    }
    if (useOverlayFullSprites) {
      return fullSpriteTargetIdSet;
    }
    if (isIOSStableMarkersMode) {
      const next = new Set<string>();
      inlineLabelIds.forEach((id) => {
        if (localFullSpriteIdSet.has(id)) {
          next.add(id);
        }
      });
      return next;
    }
    return new Set<string>();
  }, [
    fullSpriteTargetIdSet,
    fullSpriteTextLayersEnabled,
    inlineLabelIds,
    isIOSStableMarkersMode,
    localFullSpriteIdSet,
    showSingleLayer,
    useOverlayFullSprites,
  ]);

  const failedRemoteSpriteKeySet = useMemo(
    () => new Set(failedRemoteSpriteKeys),
    [failedRemoteSpriteKeys]
  );

  useEffect(() => {
    fullSpriteOpacityByIdRef.current = fullSpriteOpacityById;
  }, [fullSpriteOpacityById]);

  const stopFullSpriteFade = useCallback(() => {
    if (fullSpriteFadeRafRef.current !== null) {
      cancelAnimationFrame(fullSpriteFadeRafRef.current);
      fullSpriteFadeRafRef.current = null;
    }
    fullSpriteFadePrevTsRef.current = null;
  }, []);

  const isClusterToSingleFadeActive = useCallback(
    () =>
      showSingleLayerRef.current &&
      Date.now() < clusterToSingleFadeUntilRef.current,
    []
  );

  const runFullSpriteFadeFrame = useCallback(
    (timestamp: number) => {
      const previous = fullSpriteOpacityByIdRef.current;
      const previousTimestamp = fullSpriteFadePrevTsRef.current ?? timestamp;
      const deltaMs = Math.min(64, Math.max(1, timestamp - previousTimestamp));
      fullSpriteFadePrevTsRef.current = timestamp;

      const next: Record<string, number> = {};
      const candidateIds = new Set<string>([
        ...Object.keys(previous),
        ...Array.from(fullSpriteTargetIdsRef.current),
      ]);
      let shouldContinue = false;

      candidateIds.forEach((id) => {
        const currentOpacity = previous[id] ?? 0;
        const targetOpacity = fullSpriteTargetIdsRef.current.has(id) ? 1 : 0;
        const durationMs =
          targetOpacity > currentOpacity
            ? FULL_SPRITE_FADE_IN_DURATION_MS
            : FULL_SPRITE_FADE_OUT_DURATION_MS;
        const step = durationMs > 0 ? deltaMs / durationMs : 1;
        const nextOpacity =
          targetOpacity > currentOpacity
            ? Math.min(1, currentOpacity + step)
            : Math.max(0, currentOpacity - step);

        if (nextOpacity > FULL_SPRITE_FADE_EPSILON || targetOpacity > 0) {
          next[id] = nextOpacity;
        }
        if (Math.abs(nextOpacity - targetOpacity) > 0.0001) {
          shouldContinue = true;
        }
      });

      fullSpriteOpacityByIdRef.current = next;
      if (!areOpacityMapsEqual(previous, next)) {
        setFullSpriteOpacityById(next);
      }

      if (shouldContinue) {
        fullSpriteFadeRafRef.current = requestAnimationFrame(runFullSpriteFadeFrame);
        return;
      }

      stopFullSpriteFade();
    },
    [stopFullSpriteFade]
  );

  useEffect(() => {
    const previous = previousShowSingleLayerRef.current;
    if (!previous && showSingleLayer) {
      clusterToSingleFadeUntilRef.current = fullSpriteFadeEnabled
        ? Date.now() + CLUSTER_TO_SINGLE_FADE_WINDOW_MS
        : 0;
    } else if (previous && !showSingleLayer) {
      clusterToSingleFadeUntilRef.current = 0;
      stopFullSpriteFade();
      if (Object.keys(fullSpriteOpacityByIdRef.current).length > 0) {
        fullSpriteOpacityByIdRef.current = {};
        setFullSpriteOpacityById({});
      }
    }
    previousShowSingleLayerRef.current = showSingleLayer;
  }, [fullSpriteFadeEnabled, showSingleLayer, stopFullSpriteFade]);

  useEffect(() => {
    fullSpriteTargetIdsRef.current = new Set(fullSpriteTargetIdSet);

    if (!fullSpriteFadeEnabled || !isClusterToSingleFadeActive()) {
      stopFullSpriteFade();
      const immediateMap: Record<string, number> = {};
      fullSpriteTargetIdSet.forEach((id) => {
        immediateMap[id] = 1;
      });
      fullSpriteOpacityByIdRef.current = immediateMap;
      setFullSpriteOpacityById((previous) =>
        areOpacityMapsEqual(previous, immediateMap) ? previous : immediateMap
      );
      return;
    }

    if (fullSpriteFadeRafRef.current === null) {
      fullSpriteFadeRafRef.current = requestAnimationFrame(runFullSpriteFadeFrame);
    }
  }, [
    fullSpriteFadeEnabled,
    fullSpriteTargetHash,
    fullSpriteTargetIdSet,
    isClusterToSingleFadeActive,
    runFullSpriteFadeFrame,
    stopFullSpriteFade,
  ]);

  useEffect(() => {
    return () => {
      stopFullSpriteFade();
    };
  }, [stopFullSpriteFade]);

  useEffect(() => {
    const generation = prefetchGenerationRef.current + 1;
    prefetchGenerationRef.current = generation;

    if (!fullSpriteTextLayersEnabled || !showSingleLayer) {
      setReadyFullSpriteIds((previous) => (previous.length > 0 ? [] : previous));
      return;
    }
    if (isIOSStableMarkersMode) {
      setReadyFullSpriteIds((previous) => (previous.length > 0 ? [] : previous));
      return;
    }

    const targetIdSet = new Set(inlineLabelIds);
    setReadyFullSpriteIds((previous) => {
      const next = previous.filter((id) => targetIdSet.has(id));
      return next.length === previous.length ? previous : next;
    });

    const immediateReadyMarkerIds: string[] = [];

    inlineLabelIds.forEach((markerId) => {
      const marker = singleMarkerById.get(markerId);
      if (!marker || marker.category === "Multi") {
        return;
      }

      const spriteKey = getMarkerSpriteKey(marker);
      const remoteSpriteUrl = getMarkerRemoteSpriteUrl(marker);
      const hasLocalSprite = hasLocalFullMarkerSprite(marker);

      if (hasLocalSprite && !readyFullSpriteIdSet.has(markerId)) {
        immediateReadyMarkerIds.push(markerId);
      }

      if (!allowRemoteFullSpriteOverlay) {
        return;
      }

      if (!remoteSpriteUrl || failedRemoteSpriteKeySet.has(spriteKey)) {
        return;
      }

      if (pendingRemoteSpritePrefetchRef.current.has(spriteKey)) {
        return;
      }

      pendingRemoteSpritePrefetchRef.current.add(spriteKey);
      void Image.prefetch(remoteSpriteUrl)
        .then((prefetchOk) => {
          if (
            !mountedRef.current ||
            prefetchGenerationRef.current !== generation
          ) {
            return;
          }
          if (prefetchOk) {
            setReadyFullSpriteIds((previous) => appendUniqueValue(previous, markerId));
            return;
          }
          setFailedRemoteSpriteKeys((previous) => appendUniqueValue(previous, spriteKey));
          if (hasLocalSprite) {
            requestAnimationFrame(() => {
              if (
                !mountedRef.current ||
                prefetchGenerationRef.current !== generation
              ) {
                return;
              }
              setReadyFullSpriteIds((previous) => appendUniqueValue(previous, markerId));
            });
          }
        })
        .catch(() => {
          if (
            !mountedRef.current ||
            prefetchGenerationRef.current !== generation
          ) {
            return;
          }
          setFailedRemoteSpriteKeys((previous) => appendUniqueValue(previous, spriteKey));
          if (hasLocalSprite) {
            requestAnimationFrame(() => {
              if (
                !mountedRef.current ||
                prefetchGenerationRef.current !== generation
              ) {
                return;
              }
              setReadyFullSpriteIds((previous) => appendUniqueValue(previous, markerId));
            });
          }
        })
        .finally(() => {
          pendingRemoteSpritePrefetchRef.current.delete(spriteKey);
        });
    });

    if (immediateReadyMarkerIds.length > 0) {
      setReadyFullSpriteIds((previous) => {
        let changed = false;
        const nextSet = new Set(previous);
        immediateReadyMarkerIds.forEach((markerId) => {
          if (!nextSet.has(markerId)) {
            nextSet.add(markerId);
            changed = true;
          }
        });
        return changed ? Array.from(nextSet) : previous;
      });
    }
  }, [
    failedRemoteSpriteKeySet,
    fullSpriteTextLayersEnabled,
    inlineLabelIds,
    isIOSStableMarkersMode,
    allowRemoteFullSpriteOverlay,
    readyFullSpriteIdSet,
    showSingleLayer,
    singleMarkerById,
  ]);

  useEffect(() => {
    if (!MAP_FULL_SPRITES_LOGS_ENABLED || !fullSpriteTextLayersEnabled) {
      return;
    }
    console.debug(
      `[map_full_sprites_v1] markers=${filteredMarkersLength} selected=${inlineLabelIds.length} ready=${readyFullSpriteIds.length} remoteFailures=${failedRemoteSpriteKeys.length}`
    );
  }, [
    filteredMarkersLength,
    fullSpriteTextLayersEnabled,
    failedRemoteSpriteKeys.length,
    inlineLabelIds.length,
    readyFullSpriteIds.length,
  ]);

  return {
    readyFullSpriteIds,
    readyFullSpriteIdSet,
    fullSpriteTargetIdSet,
    effectiveFullSpriteOpacityById,
    inlineTextRenderedByMarkerIdSet,
    failedRemoteSpriteKeys,
    failedRemoteSpriteKeySet,
  };
};

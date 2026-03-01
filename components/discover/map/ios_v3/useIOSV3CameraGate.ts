import { useCallback, useEffect, useRef, useState } from "react";
import type { Region } from "react-native-maps";
import { normalizeCenter, regionToZoom } from "../../../../lib/maps/camera";
import { isFiniteCoordinate, isValidRegion } from "../../../../lib/maps/discoverMapUtils";
import { hasIOSV3MeaningfulCameraMotion } from "./cameraMotion";
import type { IOSV3GesturePhase } from "./useIOSV3ZoneMode";

type UseIOSV3CameraGateParams = {
  initialCenter: [number, number];
  initialZoom: number;
  onCameraChanged: (
    center: [number, number],
    zoom: number,
    isUserGesture?: boolean
  ) => void;
  debounceMs?: number;
  gestureReleaseDelayMs?: number;
};

const CENTER_EPSILON = 0.000001;
const ZOOM_EPSILON = 0.0001;
const MIN_ZOOM = 0;
const MAX_ZOOM = 20;

const clampZoom = (zoom: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));

export const useIOSV3CameraGate = ({
  initialCenter,
  initialZoom,
  onCameraChanged,
  debounceMs = 220,
  gestureReleaseDelayMs = 160,
}: UseIOSV3CameraGateParams) => {
  const normalizedInitialCenter = normalizeCenter(initialCenter);
  const [renderCamera, setRenderCamera] = useState<{
    center: [number, number];
    zoom: number;
  }>({
    center: normalizedInitialCenter,
    zoom: clampZoom(initialZoom),
  });
  const [modeSourceZoom, setModeSourceZoom] = useState(clampZoom(initialZoom));
  // completedZoom is updated only from settled camera events.
  // Mid-gesture region changes must not mutate it.
  const [completedZoom, setCompletedZoom] = useState(clampZoom(initialZoom));
  const [gesturePhase, setGesturePhase] = useState<IOSV3GesturePhase>("idle");
  const [isInteractionBlocked, setIsInteractionBlocked] = useState(false);

  const gestureActiveRef = useRef(false);
  const liveCameraRef = useRef<{ center: [number, number]; zoom: number }>({
    center: normalizedInitialCenter,
    zoom: clampZoom(initialZoom),
  });
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureReleaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const settleInteractionBlock = useCallback(() => {
    if (!gestureActiveRef.current && debounceTimeoutRef.current === null) {
      setIsInteractionBlocked(false);
    }
  }, []);

  const applyRenderCamera = useCallback((center: [number, number], zoom: number) => {
    const normalizedCenter = normalizeCenter(center);
    const safeZoom = clampZoom(zoom);
    setRenderCamera((previous) => {
      const delta = Math.hypot(
        normalizedCenter[0] - previous.center[0],
        normalizedCenter[1] - previous.center[1]
      );
      if (delta < CENTER_EPSILON && Math.abs(safeZoom - previous.zoom) < ZOOM_EPSILON) {
        return previous;
      }
      return { center: normalizedCenter, zoom: safeZoom };
    });
  }, []);

  const scheduleDebouncedCommit = useCallback(
    (center: [number, number], zoom: number) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      setIsInteractionBlocked(true);
      debounceTimeoutRef.current = setTimeout(() => {
        debounceTimeoutRef.current = null;
        applyRenderCamera(center, zoom);
        settleInteractionBlock();
      }, debounceMs);
    },
    [applyRenderCamera, debounceMs, settleInteractionBlock]
  );

  const markGestureStart = useCallback(() => {
    gestureActiveRef.current = true;
    setGesturePhase("active");
    setIsInteractionBlocked(true);
    if (gestureReleaseTimeoutRef.current) {
      clearTimeout(gestureReleaseTimeoutRef.current);
      gestureReleaseTimeoutRef.current = null;
    }
    // Cancel any pending debounce so its settleInteractionBlock() call cannot
    // race with this gesture's setIsInteractionBlocked(true) and produce a
    // spurious isMapFullyIdle=true window during the new MapKit animation.
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
  }, []);

  const scheduleGestureReleaseTimer = useCallback(() => {
    if (gestureReleaseTimeoutRef.current) {
      clearTimeout(gestureReleaseTimeoutRef.current);
    }
    setGesturePhase("releasing");
    gestureReleaseTimeoutRef.current = setTimeout(() => {
      gestureReleaseTimeoutRef.current = null;
      gestureActiveRef.current = false;
      setGesturePhase("idle");
      settleInteractionBlock();
    }, gestureReleaseDelayMs);
  }, [gestureReleaseDelayMs, settleInteractionBlock]);

  const markGestureEnd = useCallback(() => {
    scheduleGestureReleaseTimer();
  }, [scheduleGestureReleaseTimer]);

  const refreshGestureEndTimer = useCallback(() => {
    if (!gestureReleaseTimeoutRef.current) {
      return;
    }
    scheduleGestureReleaseTimer();
  }, [scheduleGestureReleaseTimer]);

  const handleRegionChange = useCallback(
    (region: Region) => {
      if (!isValidRegion(region)) {
        return;
      }
      const nextCenter = normalizeCenter([region.longitude, region.latitude]);
      const nextZoom = regionToZoom(region);
      if (!isFiniteCoordinate(nextCenter[1], nextCenter[0]) || !Number.isFinite(nextZoom)) {
        return;
      }

      const safeZoom = clampZoom(nextZoom);
      const previousLiveCamera = liveCameraRef.current;
      const hasCameraMotion = hasIOSV3MeaningfulCameraMotion({
        previousCenter: previousLiveCamera.center,
        previousZoom: previousLiveCamera.zoom,
        nextCenter,
        nextZoom: safeZoom,
      });

      liveCameraRef.current = { center: nextCenter, zoom: safeZoom };

      if (gestureReleaseTimeoutRef.current && hasCameraMotion) {
        scheduleGestureReleaseTimer();
      }

      if (gestureActiveRef.current) {
        setModeSourceZoom(safeZoom);
        onCameraChanged(nextCenter, safeZoom, true);
      }
    },
    [onCameraChanged, scheduleGestureReleaseTimer]
  );

  const handleRegionChangeComplete = useCallback(
    (region: Region, details?: { isGesture?: boolean }) => {
      // Intentionally do not call markGestureEnd() here.
      // onRegionChangeComplete may fire during deceleration from a previous gesture.
      // Gesture shutdown is owned only by onTouchEnd / onTouchCancel.
      if (!isValidRegion(region)) {
        return;
      }

      const nextCenter = normalizeCenter([region.longitude, region.latitude]);
      const nextZoom = regionToZoom(region);
      if (!isFiniteCoordinate(nextCenter[1], nextCenter[0]) || !Number.isFinite(nextZoom)) {
        return;
      }

      const safeZoom = clampZoom(nextZoom);
      const isUserGesture = Boolean(details?.isGesture ?? gestureActiveRef.current);
      onCameraChanged(nextCenter, safeZoom, isUserGesture);
      setModeSourceZoom(safeZoom);
      setCompletedZoom(safeZoom);
      liveCameraRef.current = { center: nextCenter, zoom: safeZoom };
      scheduleDebouncedCommit(nextCenter, safeZoom);
    },
    [onCameraChanged, scheduleDebouncedCommit]
  );

  const commitCameraNow = useCallback(
    (center: [number, number], zoom: number, isUserGesture?: boolean) => {
      if (!Number.isFinite(center[0]) || !Number.isFinite(center[1]) || !Number.isFinite(zoom)) {
        return;
      }

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }

      const safeZoom = clampZoom(zoom);
      applyRenderCamera(center, safeZoom);
      setModeSourceZoom(safeZoom);
      setCompletedZoom(safeZoom);
      liveCameraRef.current = {
        center: normalizeCenter(center),
        zoom: safeZoom,
      };
      onCameraChanged(normalizeCenter(center), safeZoom, isUserGesture);
      settleInteractionBlock();
    },
    [applyRenderCamera, onCameraChanged, settleInteractionBlock]
  );

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (gestureReleaseTimeoutRef.current) {
        clearTimeout(gestureReleaseTimeoutRef.current);
      }
    };
  }, []);

  return {
    renderCamera,
    modeSourceZoom,
    completedZoom,
    gesturePhase,
    gestureActiveRef,
    isInteractionBlocked,
    markGestureStart,
    markGestureEnd,
    refreshGestureEndTimer,
    handleRegionChange,
    handleRegionChangeComplete,
    commitCameraNow,
  };
};

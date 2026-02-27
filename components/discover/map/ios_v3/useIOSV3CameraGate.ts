import { useCallback, useEffect, useRef, useState } from "react";
import type { Region } from "react-native-maps";
import { normalizeCenter, regionToZoom } from "../../../../lib/maps/camera";
import { isFiniteCoordinate, isValidRegion } from "../../../../lib/maps/discoverMapUtils";

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
    zoom: initialZoom,
  });
  const [modeSourceZoom, setModeSourceZoom] = useState(initialZoom);
  const [isGestureActive, setIsGestureActive] = useState(false);

  const [isInteractionBlocked, setIsInteractionBlocked] = useState(false);
  const gestureActiveRef = useRef(false);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureReleaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const settleInteractionBlock = useCallback(() => {
    if (!gestureActiveRef.current && debounceTimeoutRef.current === null) {
      setIsInteractionBlocked(false);
    }
  }, []);

  const applyRenderCamera = useCallback((center: [number, number], zoom: number) => {
    const normalizedCenter = normalizeCenter(center);
    setRenderCamera((previous) => {
      const delta = Math.hypot(
        normalizedCenter[0] - previous.center[0],
        normalizedCenter[1] - previous.center[1]
      );
      if (delta < CENTER_EPSILON && Math.abs(zoom - previous.zoom) < ZOOM_EPSILON) {
        return previous;
      }
      return { center: normalizedCenter, zoom };
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
    setIsGestureActive(true);
    setIsInteractionBlocked(true);
    if (gestureReleaseTimeoutRef.current) {
      clearTimeout(gestureReleaseTimeoutRef.current);
      gestureReleaseTimeoutRef.current = null;
    }
  }, []);

  const markGestureEnd = useCallback(() => {
    if (gestureReleaseTimeoutRef.current) {
      clearTimeout(gestureReleaseTimeoutRef.current);
    }
    gestureReleaseTimeoutRef.current = setTimeout(() => {
      gestureReleaseTimeoutRef.current = null;
      gestureActiveRef.current = false;
      setIsGestureActive(false);
      settleInteractionBlock();
    }, gestureReleaseDelayMs);
  }, [gestureReleaseDelayMs, settleInteractionBlock]);

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
      if (gestureActiveRef.current) {
        setModeSourceZoom(safeZoom);
        onCameraChanged(nextCenter, safeZoom, true);
      }
    },
    [onCameraChanged]
  );

  const handleRegionChangeComplete = useCallback(
    (region: Region, details?: { isGesture?: boolean }) => {
      if (!isValidRegion(region)) {
        markGestureEnd();
        return;
      }
      const nextCenter = normalizeCenter([region.longitude, region.latitude]);
      const nextZoom = regionToZoom(region);
      if (!isFiniteCoordinate(nextCenter[1], nextCenter[0]) || !Number.isFinite(nextZoom)) {
        markGestureEnd();
        return;
      }
      const safeZoom = clampZoom(nextZoom);
      const isUserGesture = Boolean(details?.isGesture ?? gestureActiveRef.current);
      onCameraChanged(nextCenter, safeZoom, isUserGesture);
      setModeSourceZoom(safeZoom);
      scheduleDebouncedCommit(nextCenter, safeZoom);
      markGestureEnd();
    },
    [markGestureEnd, onCameraChanged, scheduleDebouncedCommit]
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
    isGestureActive,
    isInteractionBlocked,
    markGestureStart,
    markGestureEnd,
    handleRegionChange,
    handleRegionChangeComplete,
    commitCameraNow,
  };
};

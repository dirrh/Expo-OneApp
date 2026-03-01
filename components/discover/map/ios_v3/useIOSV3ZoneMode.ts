import { useMemo, useRef } from "react";
import type { IOSV3Mode } from "./types";

export type IOSV3VisibleMode = IOSV3Mode;
export type IOSV3GesturePhase = "idle" | "active" | "releasing";

export const IOS_V3_SINGLE_ENTER_ZOOM = 17.0;
export const IOS_V3_SINGLE_EXIT_ZOOM = 16.5;

type ResolveInitialIOSV3VisibleModeParams = {
  initialZoom: number;
  singleEnterZoom?: number;
};

export const resolveInitialIOSV3VisibleMode = (
  initialZoomOrParams: number | ResolveInitialIOSV3VisibleModeParams
): IOSV3VisibleMode => {
  const params =
    typeof initialZoomOrParams === "number"
      ? { initialZoom: initialZoomOrParams }
      : initialZoomOrParams;
  const safeZoom = Number.isFinite(params.initialZoom) ? params.initialZoom : 0;
  const singleEnterZoom = params.singleEnterZoom ?? IOS_V3_SINGLE_ENTER_ZOOM;
  return safeZoom >= singleEnterZoom ? "single" : "cluster";
};

type ResolveIOSV3ZoneModeStepParams = {
  currentVisibleMode: IOSV3VisibleMode;
  liveEffectiveZoom: number;
  settledEffectiveZoom: number;
  gesturePhase: IOSV3GesturePhase;
  singleEnterZoom?: number;
  singleExitZoom?: number;
};

export type IOSV3ZoneModeStepResolution = {
  nextVisibleMode: IOSV3VisibleMode;
  nextSettledBelowExitCount: number;
};

export const resolveIOSV3ZoneModeStep = ({
  currentVisibleMode,
  liveEffectiveZoom,
  settledEffectiveZoom,
  gesturePhase,
  singleEnterZoom = IOS_V3_SINGLE_ENTER_ZOOM,
  singleExitZoom = IOS_V3_SINGLE_EXIT_ZOOM,
}: ResolveIOSV3ZoneModeStepParams): IOSV3ZoneModeStepResolution => {
  const safeLiveZoom = Number.isFinite(liveEffectiveZoom) ? liveEffectiveZoom : 0;
  const safeSettledZoom = Number.isFinite(settledEffectiveZoom) ? settledEffectiveZoom : 0;

  // Once we are already in single, keep it locked through the gesture.
  if (currentVisibleMode === "single" && gesturePhase !== "idle") {
    return { nextVisibleMode: "single", nextSettledBelowExitCount: 0 };
  }

  // Enter single only after the camera settles. This avoids switching the
  // renderer exactly at the most expensive point of the pinch gesture.
  if (safeLiveZoom >= singleEnterZoom && gesturePhase === "idle") {
    return { nextVisibleMode: "single", nextSettledBelowExitCount: 0 };
  }

  // While in cluster mode, stay there until the settled post-gesture check above.
  if (currentVisibleMode === "cluster") {
    return { nextVisibleMode: "cluster", nextSettledBelowExitCount: 0 };
  }

  // Exit single only when both zoom values are at/below the exit threshold.
  if (Math.max(safeLiveZoom, safeSettledZoom) > singleExitZoom) {
    return { nextVisibleMode: "single", nextSettledBelowExitCount: 0 };
  }

  return { nextVisibleMode: "cluster", nextSettledBelowExitCount: 0 };
};

type UseIOSV3ZoneModeParams = {
  initialZoom: number;
  liveEffectiveZoom: number;
  settledEffectiveZoom: number;
  gesturePhase: IOSV3GesturePhase;
};

type UseIOSV3ZoneModeResult = {
  visibleMode: IOSV3VisibleMode;
};

export const useIOSV3ZoneMode = ({
  initialZoom,
  liveEffectiveZoom,
  settledEffectiveZoom,
  gesturePhase,
}: UseIOSV3ZoneModeParams): UseIOSV3ZoneModeResult => {
  const initialVisibleMode = resolveInitialIOSV3VisibleMode(initialZoom);
  const visibleModeRef = useRef<IOSV3VisibleMode>(initialVisibleMode);

  const visibleMode = useMemo(() => {
    const next = resolveIOSV3ZoneModeStep({
      currentVisibleMode: visibleModeRef.current,
      liveEffectiveZoom,
      settledEffectiveZoom,
      gesturePhase,
    });
    visibleModeRef.current = next.nextVisibleMode;
    return next.nextVisibleMode;
  }, [gesturePhase, liveEffectiveZoom, settledEffectiveZoom]);

  return { visibleMode };
};

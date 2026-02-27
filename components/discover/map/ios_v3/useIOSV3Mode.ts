import { useCallback, useRef, useState } from "react";
import type { IOSV3Mode } from "./types";

export const IOS_V3_SINGLE_ENTER_ZOOM = 15.4;
export const IOS_V3_SINGLE_EXIT_ZOOM = 15.0;
export const IOS_V3_MODE_SWITCH_COOLDOWN_MS = 240;

type ResolveIOSV3RequestedModeParams = {
  zoom: number;
  currentMode: IOSV3Mode;
  singleEnterZoom: number;
  singleExitZoom: number;
};

export const resolveIOSV3RequestedMode = ({
  zoom,
  currentMode,
  singleEnterZoom,
  singleExitZoom,
}: ResolveIOSV3RequestedModeParams): IOSV3Mode => {
  const safeZoom = Number.isFinite(zoom) ? zoom : 0;
  if (currentMode === "cluster") {
    return safeZoom >= singleEnterZoom ? "single" : "cluster";
  }
  return safeZoom <= singleExitZoom ? "cluster" : "single";
};

type ShouldCommitIOSV3ModeSwitchParams = {
  nowMs: number;
  lastSwitchAtMs: number | null;
  currentMode: IOSV3Mode;
  requestedMode: IOSV3Mode;
  cooldownMs: number;
};

export type IOSV3ModeSwitchDecision = {
  commit: boolean;
  reason: "same-mode" | "cooldown" | "switch";
  elapsedMs: number;
};

export const shouldCommitIOSV3ModeSwitch = ({
  nowMs,
  lastSwitchAtMs,
  currentMode,
  requestedMode,
  cooldownMs,
}: ShouldCommitIOSV3ModeSwitchParams): IOSV3ModeSwitchDecision => {
  if (requestedMode === currentMode) {
    return { commit: false, reason: "same-mode", elapsedMs: 0 };
  }

  const elapsedMs =
    lastSwitchAtMs === null || !Number.isFinite(lastSwitchAtMs)
      ? Number.POSITIVE_INFINITY
      : Math.max(0, nowMs - lastSwitchAtMs);

  if (elapsedMs < Math.max(0, cooldownMs)) {
    return { commit: false, reason: "cooldown", elapsedMs };
  }

  return { commit: true, reason: "switch", elapsedMs };
};

type UseIOSV3ModeParams = {
  initialMode: IOSV3Mode;
  singleEnterZoom?: number;
  singleExitZoom?: number;
  cooldownMs?: number;
};

export const useIOSV3Mode = ({
  initialMode,
  singleEnterZoom = IOS_V3_SINGLE_ENTER_ZOOM,
  singleExitZoom = IOS_V3_SINGLE_EXIT_ZOOM,
  cooldownMs = IOS_V3_MODE_SWITCH_COOLDOWN_MS,
}: UseIOSV3ModeParams) => {
  const [mode, setMode] = useState<IOSV3Mode>(initialMode);
  const modeRef = useRef<IOSV3Mode>(initialMode);
  const lastSwitchAtMsRef = useRef<number | null>(null);

  const resolveRequestedMode = useCallback(
    (zoom: number, currentMode: IOSV3Mode) =>
      resolveIOSV3RequestedMode({
        zoom,
        currentMode,
        singleEnterZoom,
        singleExitZoom,
      }),
    [singleEnterZoom, singleExitZoom]
  );

  const commitModeForZoom = useCallback(
    (zoom: number) => {
      const currentMode = modeRef.current;
      const requestedMode = resolveRequestedMode(zoom, currentMode);
      const nowMs = Date.now();
      const decision = shouldCommitIOSV3ModeSwitch({
        nowMs,
        lastSwitchAtMs: lastSwitchAtMsRef.current,
        currentMode,
        requestedMode,
        cooldownMs,
      });
      if (!decision.commit) {
        return currentMode;
      }
      modeRef.current = requestedMode;
      lastSwitchAtMsRef.current = nowMs;
      setMode(requestedMode);
      return requestedMode;
    },
    [cooldownMs, resolveRequestedMode]
  );

  return {
    mode,
    modeRef,
    commitModeForZoom,
    resolveRequestedMode,
  };
};


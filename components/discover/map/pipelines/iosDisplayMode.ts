export type IOSDisplayMode = "cluster" | "single";

type ResolveIOSDisplayModeRequestParams = {
  zoom: number;
  singleLayerEnterZoom: number;
  currentMode: IOSDisplayMode;
  entryHysteresisZoom: number;
  exitHysteresisZoom: number;
};

const clampNonNegative = (value: number) => Math.max(0, value);

export const resolveIOSDisplayModeRequest = ({
  zoom,
  singleLayerEnterZoom,
  currentMode,
  entryHysteresisZoom,
  exitHysteresisZoom,
}: ResolveIOSDisplayModeRequestParams): IOSDisplayMode => {
  const sanitizedZoom = Number.isFinite(zoom) ? zoom : 0;
  const entryThreshold =
    clampNonNegative(singleLayerEnterZoom) + clampNonNegative(entryHysteresisZoom);
  const exitThreshold =
    clampNonNegative(singleLayerEnterZoom) - clampNonNegative(exitHysteresisZoom);

  if (currentMode === "cluster") {
    return sanitizedZoom >= entryThreshold ? "single" : "cluster";
  }

  return sanitizedZoom <= exitThreshold ? "cluster" : "single";
};

type ShouldCommitIOSDisplayModeSwitchParams = {
  nowMs: number;
  lastSwitchAtMs: number | null;
  currentMode: IOSDisplayMode;
  requestedMode: IOSDisplayMode;
  cooldownMs: number;
};

export type IOSDisplayModeSwitchDecision = {
  commit: boolean;
  reason: "same-mode" | "cooldown" | "switch";
  elapsedMs: number;
};

export const shouldCommitIOSDisplayModeSwitch = ({
  nowMs,
  lastSwitchAtMs,
  currentMode,
  requestedMode,
  cooldownMs,
}: ShouldCommitIOSDisplayModeSwitchParams): IOSDisplayModeSwitchDecision => {
  if (requestedMode === currentMode) {
    return { commit: false, reason: "same-mode", elapsedMs: 0 };
  }

  if (!Number.isFinite(nowMs)) {
    return { commit: true, reason: "switch", elapsedMs: Number.POSITIVE_INFINITY };
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

import { useCallback, useMemo, useRef, useState } from "react";
import type { IOSDisplayMode } from "../types";

export type IOSModeCommitTrigger =
  | "map-ready"
  | "native-sync"
  | "region-complete"
  | "cluster-press";

type ResolveIOSRequestedModeParams = {
  zoom: number;
  singleLayerEnterZoom: number;
  currentMode: IOSDisplayMode;
  entryHysteresisZoom: number;
  exitHysteresisZoom: number;
  emergencyClusterOnly: boolean;
};

const clampNonNegative = (value: number) => Math.max(0, value);

export const resolveIOSRequestedMode = ({
  zoom,
  singleLayerEnterZoom,
  currentMode,
  entryHysteresisZoom,
  exitHysteresisZoom,
  emergencyClusterOnly,
}: ResolveIOSRequestedModeParams): IOSDisplayMode => {
  if (emergencyClusterOnly) {
    return "cluster";
  }
  const safeZoom = Number.isFinite(zoom) ? zoom : 0;
  const entryThreshold =
    clampNonNegative(singleLayerEnterZoom) + clampNonNegative(entryHysteresisZoom);
  const exitThreshold =
    clampNonNegative(singleLayerEnterZoom) - clampNonNegative(exitHysteresisZoom);
  if (currentMode === "cluster") {
    return safeZoom >= entryThreshold ? "single" : "cluster";
  }
  return safeZoom <= exitThreshold ? "cluster" : "single";
};

type ShouldCommitIOSModeSwitchParams = {
  nowMs: number;
  lastSwitchAtMs: number | null;
  currentMode: IOSDisplayMode;
  requestedMode: IOSDisplayMode;
  cooldownMs: number;
};

export type IOSModeSwitchDecision = {
  commit: boolean;
  reason: "same-mode" | "cooldown" | "switch";
  elapsedMs: number;
};

export const shouldCommitIOSModeSwitch = ({
  nowMs,
  lastSwitchAtMs,
  currentMode,
  requestedMode,
  cooldownMs,
}: ShouldCommitIOSModeSwitchParams): IOSModeSwitchDecision => {
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

type UseIOSMapModeControllerParams = {
  initialMode: IOSDisplayMode;
  singleLayerEnterZoom: number;
  entryHysteresisZoom: number;
  exitHysteresisZoom: number;
  cooldownMs: number;
  emergencyClusterOnly: boolean;
  logsEnabled: boolean;
};

type CommitIOSModePayload = {
  zoom: number;
  trigger: IOSModeCommitTrigger;
  markerCount?: number;
};

export const useIOSMapModeController = ({
  initialMode,
  singleLayerEnterZoom,
  entryHysteresisZoom,
  exitHysteresisZoom,
  cooldownMs,
  emergencyClusterOnly,
  logsEnabled,
}: UseIOSMapModeControllerParams) => {
  const initialResolvedMode = useMemo<IOSDisplayMode>(
    () => (emergencyClusterOnly ? "cluster" : initialMode),
    [emergencyClusterOnly, initialMode]
  );
  const [displayMode, setDisplayMode] = useState<IOSDisplayMode>(initialResolvedMode);
  const displayModeRef = useRef<IOSDisplayMode>(initialResolvedMode);
  const lastSwitchAtMsRef = useRef<number | null>(null);

  const resolveRequestedMode = useCallback(
    (zoom: number, currentMode: IOSDisplayMode) =>
      resolveIOSRequestedMode({
        zoom,
        singleLayerEnterZoom,
        currentMode,
        entryHysteresisZoom,
        exitHysteresisZoom,
        emergencyClusterOnly,
      }),
    [
      emergencyClusterOnly,
      entryHysteresisZoom,
      exitHysteresisZoom,
      singleLayerEnterZoom,
    ]
  );

  const commitModeForZoom = useCallback(
    ({ zoom, trigger, markerCount }: CommitIOSModePayload) => {
      const currentMode = displayModeRef.current;
      const requestedMode = resolveRequestedMode(zoom, currentMode);
      const nowMs = Date.now();
      const decision = shouldCommitIOSModeSwitch({
        nowMs,
        lastSwitchAtMs: lastSwitchAtMsRef.current,
        currentMode,
        requestedMode,
        cooldownMs,
      });

      if (logsEnabled) {
        console.debug(
          `[map_ios_rewrite_v2] mode-check trigger=${trigger} zoom=${zoom.toFixed(
            3
          )} current=${currentMode} requested=${requestedMode} decision=${
            decision.reason
          } elapsedMs=${decision.elapsedMs} markers=${markerCount ?? -1}`
        );
      }

      if (!decision.commit) {
        return {
          committed: false as const,
          mode: currentMode,
          requestedMode,
          reason: decision.reason,
        };
      }

      displayModeRef.current = requestedMode;
      lastSwitchAtMsRef.current = nowMs;
      setDisplayMode(requestedMode);
      if (logsEnabled) {
        console.debug(
          `[map_ios_rewrite_v2] mode-commit trigger=${trigger} from=${currentMode} to=${requestedMode} zoom=${zoom.toFixed(
            3
          )} markers=${markerCount ?? -1}`
        );
      }

      return {
        committed: true as const,
        mode: requestedMode,
        requestedMode,
        reason: "switch" as const,
      };
    },
    [cooldownMs, logsEnabled, resolveRequestedMode]
  );

  const forceClusterMode = useCallback(() => {
    displayModeRef.current = "cluster";
    setDisplayMode("cluster");
  }, []);

  return {
    displayMode,
    displayModeRef,
    resolveRequestedMode,
    commitModeForZoom,
    forceClusterMode,
  };
};

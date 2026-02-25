import {
  resolveIOSDisplayModeRequest,
  shouldCommitIOSDisplayModeSwitch,
  type IOSDisplayMode,
} from "../components/discover/map/pipelines/iosDisplayMode";

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const SINGLE_LAYER_ENTER_ZOOM = 15.2;
const ENTRY_HYSTERESIS_ZOOM = 0.16;
const EXIT_HYSTERESIS_ZOOM = 0.2;
const COOLDOWN_MS = 220;

const requestMode = (zoom: number, currentMode: IOSDisplayMode) =>
  resolveIOSDisplayModeRequest({
    zoom,
    singleLayerEnterZoom: SINGLE_LAYER_ENTER_ZOOM,
    currentMode,
    entryHysteresisZoom: ENTRY_HYSTERESIS_ZOOM,
    exitHysteresisZoom: EXIT_HYSTERESIS_ZOOM,
  });

const run = () => {
  // Entry threshold: cluster should stay until threshold is crossed.
  assert(requestMode(15.35, "cluster") === "cluster", "cluster should remain below entry threshold");
  assert(requestMode(15.36, "cluster") === "single", "cluster should switch at/above entry threshold");

  // Exit threshold: single should stay until lower threshold is crossed.
  assert(requestMode(15.01, "single") === "single", "single should remain above exit threshold");
  assert(requestMode(15.0, "single") === "cluster", "single should switch at/below exit threshold");

  // Cooldown skip: immediate opposite request should be ignored.
  const firstDecision = shouldCommitIOSDisplayModeSwitch({
    nowMs: 1000,
    lastSwitchAtMs: null,
    currentMode: "cluster",
    requestedMode: "single",
    cooldownMs: COOLDOWN_MS,
  });
  assert(firstDecision.commit, "first switch should commit");
  const cooldownDecision = shouldCommitIOSDisplayModeSwitch({
    nowMs: 1100,
    lastSwitchAtMs: 1000,
    currentMode: "single",
    requestedMode: "cluster",
    cooldownMs: COOLDOWN_MS,
  });
  assert(!cooldownDecision.commit && cooldownDecision.reason === "cooldown", "switch inside cooldown must be skipped");

  // No double-switch under oscillation around the threshold.
  let mode: IOSDisplayMode = "cluster";
  let lastSwitchAtMs: number | null = null;
  const sequence = [
    { zoom: 15.37, nowMs: 1000 }, // request single, commit
    { zoom: 14.95, nowMs: 1100 }, // request cluster, cooldown skip
    { zoom: 14.95, nowMs: 1350 }, // request cluster, commit
    { zoom: 15.25, nowMs: 1450 }, // still cluster (below entry threshold)
  ];

  sequence.forEach(({ zoom, nowMs }) => {
    const requestedMode = requestMode(zoom, mode);
    const decision = shouldCommitIOSDisplayModeSwitch({
      nowMs,
      lastSwitchAtMs,
      currentMode: mode,
      requestedMode,
      cooldownMs: COOLDOWN_MS,
    });
    if (decision.commit) {
      mode = requestedMode;
      lastSwitchAtMs = nowMs;
    }
  });

  assert(mode === "cluster", "oscillation scenario should end in stable cluster mode");

  console.log("[verify-ios-display-mode] all checks passed");
};

run();

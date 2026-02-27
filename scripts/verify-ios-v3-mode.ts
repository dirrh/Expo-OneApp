import {
  IOS_V3_MODE_SWITCH_COOLDOWN_MS,
  resolveIOSV3RequestedMode,
  shouldCommitIOSV3ModeSwitch,
  type IOSV3ModeSwitchDecision,
} from "../components/discover/map/ios_v3/useIOSV3Mode";

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const run = () => {
  assert(
    resolveIOSV3RequestedMode({
      zoom: 15.39,
      currentMode: "cluster",
      singleEnterZoom: 15.4,
      singleExitZoom: 15.0,
    }) === "cluster",
    "cluster mode should stay below enter threshold"
  );

  assert(
    resolveIOSV3RequestedMode({
      zoom: 15.4,
      currentMode: "cluster",
      singleEnterZoom: 15.4,
      singleExitZoom: 15.0,
    }) === "single",
    "cluster mode should switch at/above enter threshold"
  );

  assert(
    resolveIOSV3RequestedMode({
      zoom: 15.01,
      currentMode: "single",
      singleEnterZoom: 15.4,
      singleExitZoom: 15.0,
    }) === "single",
    "single mode should stay above exit threshold"
  );

  assert(
    resolveIOSV3RequestedMode({
      zoom: 15.0,
      currentMode: "single",
      singleEnterZoom: 15.4,
      singleExitZoom: 15.0,
    }) === "cluster",
    "single mode should switch at/below exit threshold"
  );

  const firstDecision = shouldCommitIOSV3ModeSwitch({
    nowMs: 1000,
    lastSwitchAtMs: null,
    currentMode: "cluster",
    requestedMode: "single",
    cooldownMs: IOS_V3_MODE_SWITCH_COOLDOWN_MS,
  });
  assert(firstDecision.commit, "first switch should commit");

  const cooldownDecision = shouldCommitIOSV3ModeSwitch({
    nowMs: 1100,
    lastSwitchAtMs: 1000,
    currentMode: "single",
    requestedMode: "cluster",
    cooldownMs: IOS_V3_MODE_SWITCH_COOLDOWN_MS,
  });
  assert(
    !cooldownDecision.commit && cooldownDecision.reason === "cooldown",
    "switch inside cooldown must be skipped"
  );

  let mode: "cluster" | "single" = "cluster";
  let lastSwitchAtMs: number | null = null;
  const decisions: IOSV3ModeSwitchDecision[] = [];
  const sequence: Array<{ zoom: number; nowMs: number }> = [
    { zoom: 15.6, nowMs: 1000 },
    { zoom: 14.9, nowMs: 1100 },
    { zoom: 14.9, nowMs: 1300 },
    { zoom: 15.45, nowMs: 1600 },
  ];
  for (const { zoom, nowMs } of sequence) {
    const requestedMode = resolveIOSV3RequestedMode({
      zoom,
      currentMode: mode,
      singleEnterZoom: 15.4,
      singleExitZoom: 15.0,
    });
    const decision = shouldCommitIOSV3ModeSwitch({
      nowMs,
      lastSwitchAtMs,
      currentMode: mode,
      requestedMode,
      cooldownMs: IOS_V3_MODE_SWITCH_COOLDOWN_MS,
    });
    decisions.push(decision);
    if (decision.commit) {
      mode = requestedMode;
      lastSwitchAtMs = nowMs;
    }
  }

  assert(mode === "single", "final mode should end in single");
  assert(
    decisions.filter((decision) => decision.commit).length === 3,
    "expected exactly three committed switches"
  );

  console.log("[verify-ios-v3-mode] all checks passed");
};

run();

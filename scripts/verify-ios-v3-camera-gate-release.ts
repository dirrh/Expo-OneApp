import { hasIOSV3MeaningfulCameraMotion } from "../components/discover/map/ios_v3/cameraMotion";
import {
  isIOSV3MapFullyIdle,
  type IOSV3GesturePhase,
} from "../components/discover/map/ios_v3/updatePolicy";

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

type GateSimulationState = {
  gesturePhase: IOSV3GesturePhase;
  refreshCount: number;
  liveCenter: [number, number];
  liveZoom: number;
};

const createInitialState = (): GateSimulationState => ({
  gesturePhase: "idle",
  refreshCount: 0,
  liveCenter: [18.091, 48.3069],
  liveZoom: 15.42,
});

const onTouchStart = (state: GateSimulationState): GateSimulationState => ({
  ...state,
  gesturePhase: "active",
});

const onTouchEnd = (state: GateSimulationState): GateSimulationState => ({
  ...state,
  gesturePhase: "releasing",
});

const onRegionChange = (
  state: GateSimulationState,
  nextCenter: [number, number],
  nextZoom: number
): GateSimulationState => {
  const hasMotion = hasIOSV3MeaningfulCameraMotion({
    previousCenter: state.liveCenter,
    previousZoom: state.liveZoom,
    nextCenter,
    nextZoom,
  });

  const shouldRefresh = state.gesturePhase === "releasing" && hasMotion;

  return {
    gesturePhase: shouldRefresh ? "releasing" : state.gesturePhase,
    refreshCount: shouldRefresh ? state.refreshCount + 1 : state.refreshCount,
    liveCenter: nextCenter,
    liveZoom: nextZoom,
  };
};

const onReleaseTimerElapsed = (state: GateSimulationState): GateSimulationState => ({
  ...state,
  gesturePhase: "idle",
});

const run = () => {
  let state = createInitialState();

  state = onTouchStart(state);
  assert(state.gesturePhase === "active", "touch start should move gesture phase to active");
  assert(
    !isIOSV3MapFullyIdle({
      gesturePhase: state.gesturePhase,
      isInteractionBlocked: true,
    }),
    "map must not be considered fully idle during an active gesture"
  );

  // Simulate one-finger-lift during a two-finger pinch.
  state = onTouchEnd(state);
  assert(
    state.gesturePhase === "releasing",
    "touch end should move gesture phase into the release-pending state"
  );
  assert(
    !isIOSV3MapFullyIdle({
      gesturePhase: state.gesturePhase,
      isInteractionBlocked: true,
    }),
    "map must not be considered fully idle during the release-pending window"
  );

  state = onRegionChange(state, [18.0912, 48.3069], 15.47);
  assert(
    state.refreshCount === 1 && state.gesturePhase === "releasing",
    "region motion during release-pending must refresh the timer and keep releasing phase"
  );

  state = onRegionChange(state, [18.0912, 48.3069], 15.47);
  assert(
    state.refreshCount === 1,
    "identical region samples must not refresh the release timer"
  );

  // Pinch without pan: no onPanDrag, only region changes.
  state = onRegionChange(state, [18.0912, 48.3069], 15.55);
  assert(
    state.refreshCount === 2,
    "pinch motion without pan drag must still keep extending the pending release timer"
  );

  state = onReleaseTimerElapsed(state);
  assert(
    state.gesturePhase === "idle",
    "gesture phase should return to idle after the release timer elapses"
  );
  assert(
    isIOSV3MapFullyIdle({
      gesturePhase: state.gesturePhase,
      isInteractionBlocked: false,
    }),
    "map should be considered fully idle only when idle and not interaction-blocked"
  );
  assert(
    !isIOSV3MapFullyIdle({
      gesturePhase: state.gesturePhase,
      isInteractionBlocked: true,
    }),
    "debounce blocking must still prevent fully-idle updates even after gesture phase returns to idle"
  );

  console.log("[verify-ios-v3-camera-gate-release] all checks passed");
};

run();

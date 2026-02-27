import {
  IOS_V3_SETTLED_EXIT_CONFIRMATIONS,
  IOS_V3_SINGLE_ENTER_ZOOM,
  IOS_V3_SINGLE_EXIT_ZOOM,
  IOS_V3_SINGLE_HARD_EXIT_ZOOM,
  resolveInitialIOSV3VisibleMode,
  resolveIOSV3ZoneModeStep,
  type IOSV3GesturePhase,
  type IOSV3VisibleMode,
} from "../components/discover/map/ios_v3/useIOSV3ZoneMode";

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

type ZoneModeState = {
  visibleMode: IOSV3VisibleMode;
  settledBelowExitCount: number;
};

const applyStep = (
  state: ZoneModeState,
  {
    liveEffectiveZoom,
    settledEffectiveZoom,
    gesturePhase,
    settledSampleAdvanced,
  }: {
    liveEffectiveZoom: number;
    settledEffectiveZoom: number;
    gesturePhase: IOSV3GesturePhase;
    settledSampleAdvanced: boolean;
  }
): ZoneModeState => {
  const next = resolveIOSV3ZoneModeStep({
    currentVisibleMode: state.visibleMode,
    liveEffectiveZoom,
    settledEffectiveZoom,
    gesturePhase,
    settledBelowExitCount: state.settledBelowExitCount,
    singleEnterZoom: IOS_V3_SINGLE_ENTER_ZOOM,
    singleExitZoom: IOS_V3_SINGLE_EXIT_ZOOM,
    hardExitZoom: IOS_V3_SINGLE_HARD_EXIT_ZOOM,
    exitConfirmationsRequired: IOS_V3_SETTLED_EXIT_CONFIRMATIONS,
    settledSampleAdvanced,
  });

  return {
    visibleMode: next.nextVisibleMode,
    settledBelowExitCount: next.nextSettledBelowExitCount,
  };
};

const run = () => {
  assert(
    resolveInitialIOSV3VisibleMode(IOS_V3_SINGLE_ENTER_ZOOM - 0.01) === "cluster",
    "initial mode should start in cluster below single-enter threshold"
  );
  assert(
    resolveInitialIOSV3VisibleMode(IOS_V3_SINGLE_ENTER_ZOOM) === "single",
    "initial mode should start in single at the single-enter threshold"
  );

  let state: ZoneModeState = {
    visibleMode: "cluster",
    settledBelowExitCount: 0,
  };

  state = applyStep(state, {
    liveEffectiveZoom: IOS_V3_SINGLE_ENTER_ZOOM + 0.05,
    settledEffectiveZoom: IOS_V3_SINGLE_EXIT_ZOOM + 0.2,
    gesturePhase: "active",
    settledSampleAdvanced: false,
  });
  assert(
    state.visibleMode === "single",
    "cluster should switch to single immediately when live zoom crosses the single-enter threshold"
  );

  state = applyStep(state, {
    liveEffectiveZoom: IOS_V3_SINGLE_ENTER_ZOOM + 0.15,
    settledEffectiveZoom: IOS_V3_SINGLE_EXIT_ZOOM - 0.05,
    gesturePhase: "active",
    settledSampleAdvanced: true,
  });
  assert(
    state.visibleMode === "single",
    "single should remain locked during active gesture even if settled zoom dips below exit"
  );

  state = applyStep(state, {
    liveEffectiveZoom: IOS_V3_SINGLE_ENTER_ZOOM + 0.02,
    settledEffectiveZoom: IOS_V3_SINGLE_EXIT_ZOOM + 0.01,
    gesturePhase: "releasing",
    settledSampleAdvanced: true,
  });
  assert(
    state.visibleMode === "single",
    "single should remain locked during the release-pending phase"
  );

  state = applyStep(state, {
    liveEffectiveZoom: IOS_V3_SINGLE_ENTER_ZOOM - 0.05,
    settledEffectiveZoom: IOS_V3_SINGLE_EXIT_ZOOM + 0.01,
    gesturePhase: "idle",
    settledSampleAdvanced: true,
  });
  assert(
    state.visibleMode === "single",
    "single should remain visible in the soft-lock transition band"
  );

  state = applyStep(state, {
    liveEffectiveZoom: IOS_V3_SINGLE_EXIT_ZOOM + 0.2,
    settledEffectiveZoom: IOS_V3_SINGLE_EXIT_ZOOM - 0.02,
    gesturePhase: "idle",
    settledSampleAdvanced: true,
  });
  assert(
    state.visibleMode === "single" && state.settledBelowExitCount === 0,
    "single must stay locked when live zoom is still above exit even if settled zoom dips below exit"
  );

  state = applyStep(state, {
    liveEffectiveZoom: IOS_V3_SINGLE_EXIT_ZOOM - 0.05,
    settledEffectiveZoom: IOS_V3_SINGLE_EXIT_ZOOM,
    gesturePhase: "idle",
    settledSampleAdvanced: true,
  });
  assert(
    state.visibleMode === "single" && state.settledBelowExitCount === 1,
    "first settled sample at/below exit should start confirmation but keep single visible"
  );

  state = applyStep(state, {
    liveEffectiveZoom: IOS_V3_SINGLE_EXIT_ZOOM - 0.08,
    settledEffectiveZoom: IOS_V3_SINGLE_EXIT_ZOOM - 0.02,
    gesturePhase: "idle",
    settledSampleAdvanced: true,
  });
  assert(
    state.visibleMode === "cluster",
    "second consecutive settled sample at/below exit should switch to cluster"
  );

  state = {
    visibleMode: "single",
    settledBelowExitCount: 0,
  };
  state = applyStep(state, {
    liveEffectiveZoom: IOS_V3_SINGLE_EXIT_ZOOM - 0.2,
    settledEffectiveZoom: IOS_V3_SINGLE_HARD_EXIT_ZOOM,
    gesturePhase: "idle",
    settledSampleAdvanced: true,
  });
  assert(
    state.visibleMode === "cluster",
    "hard-exit zoom should immediately switch single back to cluster"
  );

  state = {
    visibleMode: "single",
    settledBelowExitCount: 0,
  };
  state = applyStep(state, {
    liveEffectiveZoom: IOS_V3_SINGLE_ENTER_ZOOM + 0.3,
    settledEffectiveZoom: IOS_V3_SINGLE_EXIT_ZOOM + 0.4,
    gesturePhase: "active",
    settledSampleAdvanced: false,
  });
  state = applyStep(state, {
    liveEffectiveZoom: IOS_V3_SINGLE_ENTER_ZOOM + 0.1,
    settledEffectiveZoom: IOS_V3_SINGLE_EXIT_ZOOM + 0.2,
    gesturePhase: "releasing",
    settledSampleAdvanced: true,
  });
  state = applyStep(state, {
    liveEffectiveZoom: IOS_V3_SINGLE_ENTER_ZOOM - 0.02,
    settledEffectiveZoom: IOS_V3_SINGLE_EXIT_ZOOM + 0.1,
    gesturePhase: "idle",
    settledSampleAdvanced: true,
  });
  assert(
    state.visibleMode === "single",
    "re-pinch in the single zone must never flash cluster after release"
  );

  console.log("[verify-ios-v3-mode] all checks passed");
};

run();

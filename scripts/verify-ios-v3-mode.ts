import {
  IOS_V3_SINGLE_ENTER_ZOOM,
  IOS_V3_SINGLE_EXIT_ZOOM,
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
};

const applyStep = (
  state: ZoneModeState,
  {
    liveEffectiveZoom,
    settledEffectiveZoom,
    gesturePhase,
  }: {
    liveEffectiveZoom: number;
    settledEffectiveZoom: number;
    gesturePhase: IOSV3GesturePhase;
  }
): ZoneModeState => {
  const next = resolveIOSV3ZoneModeStep({
    currentVisibleMode: state.visibleMode,
    liveEffectiveZoom,
    settledEffectiveZoom,
    gesturePhase,
    singleEnterZoom: IOS_V3_SINGLE_ENTER_ZOOM,
    singleExitZoom: IOS_V3_SINGLE_EXIT_ZOOM,
  });

  return {
    visibleMode: next.nextVisibleMode,
  };
};

const run = () => {
  assert(
    IOS_V3_SINGLE_ENTER_ZOOM === 17.0,
    "iOS V3 single-enter zoom should stay locked at 17.0 for earlier clustering"
  );
  assert(
    IOS_V3_SINGLE_EXIT_ZOOM === 16.5,
    "iOS V3 single-exit zoom should stay locked at 16.5 for earlier clustering"
  );
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
  };

  state = applyStep(state, {
    liveEffectiveZoom: IOS_V3_SINGLE_ENTER_ZOOM + 0.05,
    settledEffectiveZoom: IOS_V3_SINGLE_EXIT_ZOOM + 0.2,
    gesturePhase: "active",
  });
  assert(
    state.visibleMode === "cluster",
    "cluster should stay cluster during an active gesture even when live zoom crosses the single-enter threshold"
  );

  state = applyStep(state, {
    liveEffectiveZoom: IOS_V3_SINGLE_ENTER_ZOOM + 0.05,
    settledEffectiveZoom: IOS_V3_SINGLE_ENTER_ZOOM + 0.02,
    gesturePhase: "idle",
  });
  assert(
    state.visibleMode === "single",
    "cluster should switch to single once the camera settles above the single-enter threshold"
  );

  state = applyStep(state, {
    liveEffectiveZoom: IOS_V3_SINGLE_ENTER_ZOOM + 0.15,
    settledEffectiveZoom: IOS_V3_SINGLE_EXIT_ZOOM - 0.05,
    gesturePhase: "active",
  });
  assert(
    state.visibleMode === "single",
    "single should remain locked during active gesture even if settled zoom dips below exit"
  );

  state = applyStep(state, {
    liveEffectiveZoom: IOS_V3_SINGLE_ENTER_ZOOM + 0.02,
    settledEffectiveZoom: IOS_V3_SINGLE_EXIT_ZOOM + 0.01,
    gesturePhase: "releasing",
  });
  assert(
    state.visibleMode === "single",
    "single should remain locked during the release-pending phase"
  );

  state = applyStep(state, {
    liveEffectiveZoom: IOS_V3_SINGLE_ENTER_ZOOM - 0.05,
    settledEffectiveZoom: IOS_V3_SINGLE_EXIT_ZOOM + 0.01,
    gesturePhase: "idle",
  });
  assert(
    state.visibleMode === "single",
    "single should remain visible in the soft-lock transition band"
  );

  state = applyStep(state, {
    liveEffectiveZoom: IOS_V3_SINGLE_EXIT_ZOOM + 0.2,
    settledEffectiveZoom: IOS_V3_SINGLE_EXIT_ZOOM - 0.02,
    gesturePhase: "idle",
  });
  assert(
    state.visibleMode === "single",
    "single must stay locked when live zoom is still above exit even if settled zoom dips below exit"
  );

  state = applyStep(state, {
    liveEffectiveZoom: IOS_V3_SINGLE_EXIT_ZOOM - 0.05,
    settledEffectiveZoom: IOS_V3_SINGLE_EXIT_ZOOM,
    gesturePhase: "idle",
  });
  assert(
    state.visibleMode === "cluster",
    "single should switch to cluster once both live and settled zoom are at/below exit"
  );

  state = {
    visibleMode: "single",
  };
  state = applyStep(state, {
    liveEffectiveZoom: IOS_V3_SINGLE_ENTER_ZOOM + 0.3,
    settledEffectiveZoom: IOS_V3_SINGLE_EXIT_ZOOM + 0.4,
    gesturePhase: "active",
  });
  state = applyStep(state, {
    liveEffectiveZoom: IOS_V3_SINGLE_ENTER_ZOOM + 0.1,
    settledEffectiveZoom: IOS_V3_SINGLE_EXIT_ZOOM + 0.2,
    gesturePhase: "releasing",
  });
  state = applyStep(state, {
    liveEffectiveZoom: IOS_V3_SINGLE_ENTER_ZOOM - 0.02,
    settledEffectiveZoom: IOS_V3_SINGLE_EXIT_ZOOM + 0.1,
    gesturePhase: "idle",
  });
  assert(
    state.visibleMode === "single",
    "re-pinch in the single zone must never flash cluster after release"
  );

  console.log("[verify-ios-v3-mode] all checks passed");
};

run();

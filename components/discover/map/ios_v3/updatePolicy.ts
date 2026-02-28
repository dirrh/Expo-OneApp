import type { IOSV3GesturePhase } from "./useIOSV3ZoneMode";

type IsIOSV3MapFullyIdleParams = {
  gesturePhase: IOSV3GesturePhase;
  isInteractionBlocked: boolean;
};

export type { IOSV3GesturePhase } from "./useIOSV3ZoneMode";

export const isIOSV3MapFullyIdle = ({
  gesturePhase,
  isInteractionBlocked,
}: IsIOSV3MapFullyIdleParams) => gesturePhase === "idle" && !isInteractionBlocked;

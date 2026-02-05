import { useCallback } from "react";

// Reanimated v4 removed `useWorkletCallback`, but some libs (e.g. bottom-sheet v4)
// still call it. Provide a small compat shim.
const reanimated = require("react-native-reanimated");

if (reanimated && typeof reanimated.useWorkletCallback !== "function") {
  reanimated.useWorkletCallback = (fn: (...args: any[]) => any, deps: any[]) =>
    useCallback((...args: any[]) => {
      "worklet";
      return fn(...args);
    }, deps);
}

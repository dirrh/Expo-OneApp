import { useMemo, useRef } from "react";
import type { IOSRenderItem } from "../types";

type IOSAnnotationPoolState = {
  slotByMarkerId: Map<string, number>;
  markerIdBySlot: Array<string | null>;
};

type BuildIOSAnnotationPoolParams = {
  items: IOSRenderItem[];
  poolSize: number;
  state: IOSAnnotationPoolState;
  placeholderImage: number;
  placeholderAnchor?: { x: number; y: number };
};

type BuildIOSAnnotationPoolResult = {
  pooledItems: IOSRenderItem[];
  visibleCount: number;
};

type UseIOSAnnotationPoolParams = {
  items: IOSRenderItem[];
  poolSize: number;
  placeholderImage: number;
  placeholderAnchor?: { x: number; y: number };
};

const PLACEHOLDER_COORDINATE = { latitude: 0, longitude: 0 } as const;

const normalizePoolSize = (poolSize: number) =>
  Number.isFinite(poolSize) ? Math.max(16, Math.min(96, Math.floor(poolSize))) : 48;

const ensurePoolState = (state: IOSAnnotationPoolState, poolSize: number) => {
  if (state.markerIdBySlot.length === poolSize) {
    return;
  }
  state.markerIdBySlot = Array.from({ length: poolSize }, (_, index) =>
    index < state.markerIdBySlot.length ? state.markerIdBySlot[index] ?? null : null
  );
  state.slotByMarkerId.forEach((slot, markerId) => {
    if (slot < 0 || slot >= poolSize) {
      state.slotByMarkerId.delete(markerId);
      return;
    }
    if (state.markerIdBySlot[slot] !== markerId) {
      state.slotByMarkerId.delete(markerId);
    }
  });
};

const takeFirstFreeSlot = (markerIdBySlot: Array<string | null>) => {
  for (let index = 0; index < markerIdBySlot.length; index += 1) {
    if (!markerIdBySlot[index]) {
      return index;
    }
  }
  return -1;
};

export const createIOSAnnotationPoolState = (poolSize: number): IOSAnnotationPoolState => ({
  slotByMarkerId: new Map(),
  markerIdBySlot: new Array(normalizePoolSize(poolSize)).fill(null),
});

export const buildIOSAnnotationPool = ({
  items,
  poolSize,
  state,
  placeholderImage,
  placeholderAnchor,
}: BuildIOSAnnotationPoolParams): BuildIOSAnnotationPoolResult => {
  const safePoolSize = normalizePoolSize(poolSize);
  ensurePoolState(state, safePoolSize);

  const cappedItems = items.slice(0, safePoolSize);
  const desiredIds = new Set(cappedItems.map((item) => item.id));
  state.slotByMarkerId.forEach((slot, markerId) => {
    if (desiredIds.has(markerId)) {
      return;
    }
    state.slotByMarkerId.delete(markerId);
    if (slot >= 0 && slot < state.markerIdBySlot.length) {
      state.markerIdBySlot[slot] = null;
    }
  });

  const assignedBySlot = new Map<number, IOSRenderItem>();
  const assignedIds = new Set<string>();

  cappedItems.forEach((item) => {
    if (assignedIds.has(item.id)) {
      return;
    }
    let slot = state.slotByMarkerId.get(item.id);
    if (typeof slot !== "number" || slot < 0 || slot >= safePoolSize) {
      slot = takeFirstFreeSlot(state.markerIdBySlot);
      if (slot < 0) {
        return;
      }
      state.slotByMarkerId.set(item.id, slot);
      state.markerIdBySlot[slot] = item.id;
    }
    assignedIds.add(item.id);
    assignedBySlot.set(slot, item);
  });

  const pooledItems: IOSRenderItem[] = [];
  for (let slot = 0; slot < safePoolSize; slot += 1) {
    const assigned = assignedBySlot.get(slot);
    if (assigned) {
      pooledItems.push({
        ...assigned,
        key: `ios-pool:${slot}`,
        isPoolPlaceholder: false,
        poolSlot: slot,
      });
      continue;
    }
    pooledItems.push({
      key: `ios-pool:${slot}`,
      id: `ios-pool:placeholder:${slot}`,
      kind: "placeholder",
      coordinate: PLACEHOLDER_COORDINATE,
      focusCoordinate: PLACEHOLDER_COORDINATE,
      image: placeholderImage,
      anchor: placeholderAnchor,
      zIndex: -1000,
      isCluster: false,
      isStacked: false,
      isPoolPlaceholder: true,
      poolSlot: slot,
    });
  }

  return {
    pooledItems,
    visibleCount: assignedBySlot.size,
  };
};

export const useIOSAnnotationPool = ({
  items,
  poolSize,
  placeholderImage,
  placeholderAnchor,
}: UseIOSAnnotationPoolParams): BuildIOSAnnotationPoolResult => {
  const stateRef = useRef(createIOSAnnotationPoolState(poolSize));
  return useMemo(
    () =>
      buildIOSAnnotationPool({
        items,
        poolSize,
        state: stateRef.current,
        placeholderImage,
        placeholderAnchor,
      }),
    [items, placeholderAnchor, placeholderImage, poolSize]
  );
};

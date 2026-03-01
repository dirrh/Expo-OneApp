import { useMemo, useRef } from "react";
import type { IOSV3RenderItem } from "./types";

export const IOS_V3_POOL_SIZE = 48;
export const IOS_V3_POOL_KEY_PREFIX = "ios-v3-pool";

export type IOSV3PoolState = {
  slotByMarkerId: Map<string, number>;
  markerIdBySlot: Array<string | null>;
};

type BuildIOSV3PoolParams = {
  items: IOSV3RenderItem[];
  poolSize: number;
  state: IOSV3PoolState;
  placeholderImage: number;
  placeholderAnchor?: { x: number; y: number };
};

export type IOSV3PoolResult = {
  pooledItems: IOSV3RenderItem[];
  visibleCount: number;
};

type UseIOSV3PoolParams = {
  items: IOSV3RenderItem[];
  poolSize?: number;
  placeholderImage: number;
  placeholderAnchor?: { x: number; y: number };
};

export const normalizeIOSV3PoolSize = (poolSize?: number | null, minimum: number = 16) =>
  typeof poolSize === "number" && Number.isFinite(poolSize)
    ? Math.max(minimum, Math.min(96, Math.floor(poolSize)))
    : IOS_V3_POOL_SIZE;

const placeholderCoordinate = (slot: number) => ({
  latitude: -80,
  longitude: -170 + slot * 0.01,
});

const ensurePoolState = (state: IOSV3PoolState, poolSize: number) => {
  if (state.markerIdBySlot.length === poolSize) {
    return;
  }
  state.markerIdBySlot = Array.from({ length: poolSize }, (_, index) =>
    index < state.markerIdBySlot.length ? state.markerIdBySlot[index] ?? null : null
  );
  state.slotByMarkerId.forEach((slot, markerId) => {
    if (slot < 0 || slot >= poolSize) {
      state.slotByMarkerId.delete(markerId);
      // Only clear array slot if within bounds
      if (slot >= 0 && slot < state.markerIdBySlot.length && state.markerIdBySlot[slot] === markerId) {
        state.markerIdBySlot[slot] = null;
      }
      return;
    }
    if (state.markerIdBySlot[slot] !== markerId) {
      state.slotByMarkerId.delete(markerId);
    }
  });
};

const clonePoolState = (state: IOSV3PoolState): IOSV3PoolState => ({
  slotByMarkerId: new Map(state.slotByMarkerId),
  markerIdBySlot: [...state.markerIdBySlot],
});

const takeFirstFreeSlot = (markerIdBySlot: Array<string | null>) => {
  for (let slot = 0; slot < markerIdBySlot.length; slot += 1) {
    if (!markerIdBySlot[slot]) {
      return slot;
    }
  }
  return -1;
};

export const createIOSV3PoolState = (poolSize: number): IOSV3PoolState => ({
  slotByMarkerId: new Map(),
  markerIdBySlot: new Array(normalizeIOSV3PoolSize(poolSize, 1)).fill(null),
});

const areAnchorsEqual = (
  left: { x: number; y: number } | undefined,
  right: { x: number; y: number } | undefined
) => {
  if (left === right) return true;
  if (!left || !right) return false;
  return left.x === right.x && left.y === right.y;
};

const areImagesEqual = (
  left: number | { uri: string },
  right: number | { uri: string }
) => {
  if (left === right) return true;
  if (typeof left === "object" && typeof right === "object") {
    return left.uri === right.uri;
  }
  return false;
};

const areItemsEquivalent = (left: IOSV3RenderItem, right: IOSV3RenderItem) =>
  left.id === right.id &&
  left.kind === right.kind &&
  areImagesEqual(left.image, right.image) &&
  left.coordinate.latitude === right.coordinate.latitude &&
  left.coordinate.longitude === right.coordinate.longitude &&
  left.zIndex === right.zIndex &&
  Boolean(left.isPoolPlaceholder) === Boolean(right.isPoolPlaceholder) &&
  areAnchorsEqual(left.anchor, right.anchor);

export const buildIOSV3Pool = ({
  items,
  poolSize,
  state,
  placeholderImage,
  placeholderAnchor,
}: BuildIOSV3PoolParams): IOSV3PoolResult => {
  const safePoolSize = normalizeIOSV3PoolSize(poolSize, 1);
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

  const assignedBySlot = new Map<number, IOSV3RenderItem>();
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

  const pooledItems: IOSV3RenderItem[] = [];
  for (let slot = 0; slot < safePoolSize; slot += 1) {
    const assigned = assignedBySlot.get(slot);
    if (assigned) {
      pooledItems.push({
        ...assigned,
        key: `${IOS_V3_POOL_KEY_PREFIX}:${slot}`,
        isPoolPlaceholder: false,
        poolSlot: slot,
      });
      continue;
    }
    const coordinate = placeholderCoordinate(slot);
    pooledItems.push({
      key: `${IOS_V3_POOL_KEY_PREFIX}:${slot}`,
      id: `${IOS_V3_POOL_KEY_PREFIX}:placeholder:${slot}`,
      kind: "placeholder",
      coordinate,
      focusCoordinate: coordinate,
      image: placeholderImage,
      anchor: placeholderAnchor,
      zIndex: -1000,
      isPoolPlaceholder: true,
      poolSlot: slot,
    });
  }

  return {
    pooledItems,
    visibleCount: assignedBySlot.size,
  };
};

export const useIOSV3Pool = ({
  items,
  poolSize = IOS_V3_POOL_SIZE,
  placeholderImage,
  placeholderAnchor,
}: UseIOSV3PoolParams): IOSV3PoolResult => {
  const stateRef = useRef(createIOSV3PoolState(poolSize));
  const previousPooledRef = useRef<IOSV3RenderItem[]>([]);

  return useMemo(() => {
    const workingState = clonePoolState(stateRef.current);
    const result = buildIOSV3Pool({
      items,
      poolSize,
      state: workingState,
      placeholderImage,
      placeholderAnchor,
    });
    stateRef.current = workingState;

    const previous = previousPooledRef.current;
    const stable = result.pooledItems.map((item, index) => {
      const prevItem = previous[index];
      if (prevItem && areItemsEquivalent(prevItem, item)) {
        return prevItem;
      }
      return item;
    });
    previousPooledRef.current = stable;

    return {
      pooledItems: stable,
      visibleCount: result.visibleCount,
    };
  }, [items, placeholderAnchor, placeholderImage, poolSize]);
};

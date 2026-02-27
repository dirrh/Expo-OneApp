import type { RenderMarker } from "../types";

export const IOS_MARKER_POOL_KEY_PREFIX = "ios-pool";

export type IOSMarkerPoolState = {
  slotByMarkerId: Map<string, number>;
  markerIdBySlot: Array<string | null>;
};

export type BuildIOSMarkerPoolParams = {
  markers: RenderMarker[];
  poolSize: number;
  state: IOSMarkerPoolState;
};

export type IOSMarkerPoolResult = {
  pooledMarkers: RenderMarker[];
  visibleCount: number;
};

const placeholderCoordinate = (slot: number) => ({
  latitude: -85 + slot * 0.0001,
  longitude: -180 + slot * 0.0001,
});

const sanitizePoolSize = (poolSize: number) =>
  Number.isFinite(poolSize) ? Math.max(1, Math.floor(poolSize)) : 1;

const ensurePoolStateSize = (state: IOSMarkerPoolState, poolSize: number) => {
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
  for (let slot = 0; slot < markerIdBySlot.length; slot += 1) {
    if (!markerIdBySlot[slot]) {
      return slot;
    }
  }
  return -1;
};

export const createIOSMarkerPoolState = (poolSize: number): IOSMarkerPoolState => ({
  slotByMarkerId: new Map(),
  markerIdBySlot: new Array(sanitizePoolSize(poolSize)).fill(null),
});

export const buildIOSMarkerPool = ({
  markers,
  poolSize,
  state,
}: BuildIOSMarkerPoolParams): IOSMarkerPoolResult => {
  const stablePoolSize = sanitizePoolSize(poolSize);
  ensurePoolStateSize(state, stablePoolSize);

  const cappedMarkers = markers.slice(0, stablePoolSize);
  const desiredMarkerIdSet = new Set(cappedMarkers.map((marker) => marker.id));

  state.slotByMarkerId.forEach((slot, markerId) => {
    if (desiredMarkerIdSet.has(markerId)) {
      return;
    }
    state.slotByMarkerId.delete(markerId);
    if (slot >= 0 && slot < state.markerIdBySlot.length) {
      state.markerIdBySlot[slot] = null;
    }
  });

  const assignedMarkerBySlot = new Map<number, RenderMarker>();
  const assignedMarkerIds = new Set<string>();

  cappedMarkers.forEach((marker) => {
    if (assignedMarkerIds.has(marker.id)) {
      return;
    }
    let slot = state.slotByMarkerId.get(marker.id);
    if (typeof slot !== "number" || slot < 0 || slot >= stablePoolSize) {
      slot = takeFirstFreeSlot(state.markerIdBySlot);
      if (slot < 0) {
        return;
      }
      state.slotByMarkerId.set(marker.id, slot);
      state.markerIdBySlot[slot] = marker.id;
    }
    assignedMarkerIds.add(marker.id);
    assignedMarkerBySlot.set(slot, marker);
  });

  const pooledMarkers: RenderMarker[] = [];
  for (let slot = 0; slot < stablePoolSize; slot += 1) {
    const activeMarker = assignedMarkerBySlot.get(slot);
    if (activeMarker) {
      pooledMarkers.push({
        ...activeMarker,
        key: `${IOS_MARKER_POOL_KEY_PREFIX}:${slot}`,
        isPoolPlaceholder: false,
        poolSlot: slot,
      });
      continue;
    }
    pooledMarkers.push({
      key: `${IOS_MARKER_POOL_KEY_PREFIX}:${slot}`,
      id: `${IOS_MARKER_POOL_KEY_PREFIX}:placeholder:${slot}`,
      coordinate: placeholderCoordinate(slot),
      focusCoordinate: placeholderCoordinate(slot),
      zIndex: -1000,
      isCluster: false,
      isStacked: false,
      isPoolPlaceholder: true,
      poolSlot: slot,
    });
  }

  return {
    pooledMarkers,
    visibleCount: assignedMarkerBySlot.size,
  };
};

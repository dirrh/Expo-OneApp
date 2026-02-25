import {
  buildIOSMarkerPool,
  createIOSMarkerPoolState,
} from "../components/discover/map/pipelines/iosMarkerPool";
import type { RenderMarker } from "../components/discover/map/types";

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const POOL_SIZE = 48;

const createMarker = (
  id: string,
  index: number,
  options?: { isCluster?: boolean; isStacked?: boolean }
): RenderMarker => ({
  key: `marker:${id}`,
  id,
  coordinate: {
    latitude: 48.30 + index * 0.0005,
    longitude: 18.09 + index * 0.0005,
  },
  focusCoordinate: {
    latitude: 48.30 + index * 0.0005,
    longitude: 18.09 + index * 0.0005,
  },
  image: 1,
  zIndex: 1,
  isCluster: Boolean(options?.isCluster),
  isStacked: Boolean(options?.isStacked),
});

const getSlotByMarkerId = (markers: RenderMarker[]) => {
  const slotById = new Map<string, number>();
  markers.forEach((marker) => {
    if (marker.isPoolPlaceholder) {
      return;
    }
    if (typeof marker.poolSlot === "number") {
      slotById.set(marker.id, marker.poolSlot);
    }
  });
  return slotById;
};

const run = () => {
  const poolState = createIOSMarkerPoolState(POOL_SIZE);

  const firstMarkers = Array.from({ length: 12 }, (_, index) =>
    createMarker(`first-${index}`, index, { isCluster: true })
  );
  const firstResult = buildIOSMarkerPool({
    markers: firstMarkers,
    poolSize: POOL_SIZE,
    state: poolState,
  });
  assert(
    firstResult.pooledMarkers.length === POOL_SIZE,
    "pool must always render exactly 48 markers"
  );
  assert(firstResult.visibleCount === firstMarkers.length, "visible count should match input");

  const secondMarkers = Array.from({ length: 30 }, (_, index) =>
    createMarker(`second-${index}`, index + 20)
  );
  const secondResult = buildIOSMarkerPool({
    markers: secondMarkers,
    poolSize: POOL_SIZE,
    state: poolState,
  });
  assert(
    secondResult.pooledMarkers.length === POOL_SIZE,
    "cluster/single crossing must keep mounted marker count stable"
  );
  const uniquePoolKeys = new Set(secondResult.pooledMarkers.map((marker) => marker.key));
  assert(uniquePoolKeys.size === POOL_SIZE, "pool keys must stay deterministic");

  const stickyState = createIOSMarkerPoolState(POOL_SIZE);
  const passA = buildIOSMarkerPool({
    markers: [createMarker("a", 0), createMarker("b", 1), createMarker("c", 2)],
    poolSize: POOL_SIZE,
    state: stickyState,
  });
  const slotsA = getSlotByMarkerId(passA.pooledMarkers);
  const slotBInA = slotsA.get("b");
  const slotCInA = slotsA.get("c");
  assert(typeof slotBInA === "number", "slot for marker b must exist in pass A");
  assert(typeof slotCInA === "number", "slot for marker c must exist in pass A");

  const passB = buildIOSMarkerPool({
    markers: [createMarker("b", 10), createMarker("c", 11)],
    poolSize: POOL_SIZE,
    state: stickyState,
  });
  const slotsB = getSlotByMarkerId(passB.pooledMarkers);
  assert(slotsB.get("b") === slotBInA, "marker b should keep the same slot");
  assert(slotsB.get("c") === slotCInA, "marker c should keep the same slot");

  const passC = buildIOSMarkerPool({
    markers: [createMarker("b", 20), createMarker("c", 21), createMarker("d", 22)],
    poolSize: POOL_SIZE,
    state: stickyState,
  });
  const slotsC = getSlotByMarkerId(passC.pooledMarkers);
  const recycledSlot = slotsA.get("a");
  assert(typeof recycledSlot === "number", "slot for marker a must exist in pass A");
  assert(
    slotsC.get("d") === recycledSlot,
    "new marker should deterministically reuse the first released slot"
  );

  console.log("[verify-ios-marker-pool] all checks passed");
};

run();

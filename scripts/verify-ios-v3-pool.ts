import {
  IOS_V3_POOL_SIZE,
  buildIOSV3Pool,
  createIOSV3PoolState,
} from "../components/discover/map/ios_v3/useIOSV3Pool";
import type { IOSV3RenderItem } from "../components/discover/map/ios_v3/types";

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const createItem = (id: string, index: number): IOSV3RenderItem => ({
  key: `raw:${id}`,
  id,
  kind: "single",
  coordinate: {
    latitude: 48.3 + index * 0.0001,
    longitude: 18.09 + index * 0.0001,
  },
  focusCoordinate: {
    latitude: 48.3 + index * 0.0001,
    longitude: 18.09 + index * 0.0001,
  },
  image: 1,
  anchor: { x: 0.492, y: 0.779 },
  zIndex: 1,
});

const getSlotById = (items: IOSV3RenderItem[]) => {
  const map = new Map<string, number>();
  items.forEach((item) => {
    if (item.isPoolPlaceholder) {
      return;
    }
    if (typeof item.poolSlot === "number") {
      map.set(item.id, item.poolSlot);
    }
  });
  return map;
};

const run = () => {
  const state = createIOSV3PoolState(IOS_V3_POOL_SIZE);
  const firstItems = Array.from({ length: 12 }, (_, index) =>
    createItem(`first-${index}`, index)
  );
  const first = buildIOSV3Pool({
    items: firstItems,
    poolSize: IOS_V3_POOL_SIZE,
    state,
    placeholderImage: 1,
    placeholderAnchor: { x: 0.492, y: 0.779 },
  });

  assert(
    first.pooledItems.length === IOS_V3_POOL_SIZE,
    "pool must always keep fixed slot count"
  );
  assert(first.visibleCount === 12, "visible count should match first batch");

  const secondItems = Array.from({ length: 30 }, (_, index) =>
    createItem(`second-${index}`, index + 20)
  );
  const second = buildIOSV3Pool({
    items: secondItems,
    poolSize: IOS_V3_POOL_SIZE,
    state,
    placeholderImage: 1,
    placeholderAnchor: { x: 0.492, y: 0.779 },
  });
  assert(
    second.pooledItems.length === IOS_V3_POOL_SIZE,
    "pool must keep fixed slots across dataset swaps"
  );
  assert(second.visibleCount === 30, "visible count should match second batch");
  assert(
    new Set(second.pooledItems.map((item) => item.key)).size === IOS_V3_POOL_SIZE,
    "slot keys must remain deterministic"
  );

  const stickyState = createIOSV3PoolState(IOS_V3_POOL_SIZE);
  const passA = buildIOSV3Pool({
    items: [createItem("a", 0), createItem("b", 1), createItem("c", 2)],
    poolSize: IOS_V3_POOL_SIZE,
    state: stickyState,
    placeholderImage: 1,
  });
  const slotsA = getSlotById(passA.pooledItems);
  const passB = buildIOSV3Pool({
    items: [createItem("b", 10), createItem("c", 11)],
    poolSize: IOS_V3_POOL_SIZE,
    state: stickyState,
    placeholderImage: 1,
  });
  const slotsB = getSlotById(passB.pooledItems);
  assert(slotsB.get("b") === slotsA.get("b"), "marker b should keep same slot");
  assert(slotsB.get("c") === slotsA.get("c"), "marker c should keep same slot");

  const passC = buildIOSV3Pool({
    items: [createItem("b", 20), createItem("c", 21), createItem("d", 22)],
    poolSize: IOS_V3_POOL_SIZE,
    state: stickyState,
    placeholderImage: 1,
  });
  const slotsC = getSlotById(passC.pooledItems);
  assert(
    slotsC.get("d") === slotsA.get("a"),
    "new marker should reuse first released slot"
  );

  console.log("[verify-ios-v3-pool] all checks passed");
};

run();


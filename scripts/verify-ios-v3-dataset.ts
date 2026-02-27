import type { DiscoverMapMarker } from "../lib/interfaces";
import { createRequire } from "node:module";
import type { RenderFeature } from "../components/discover/map/types";
import type * as IOSV3DatasetModule from "../components/discover/map/ios_v3/buildIOSV3Dataset";

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const createMarker = (
  id: string,
  lat: number,
  lng: number,
  category: DiscoverMapMarker["category"],
  groupId?: string
): DiscoverMapMarker => ({
  id,
  title: id,
  coord: { lat, lng },
  icon: 1,
  rating: 4.2,
  category,
  groupId,
});

const loadDatasetModule = async (): Promise<typeof IOSV3DatasetModule> => {
  const nodeRequire = createRequire(import.meta.url) as NodeJS.Require & {
    extensions?: Record<
      string,
      (module: { exports: unknown }, filename: string) => void
    >;
  };

  if (nodeRequire.extensions && !nodeRequire.extensions[".png"]) {
    nodeRequire.extensions[".png"] = (module) => {
      module.exports = 1;
    };
  }

  return import("../components/discover/map/ios_v3/buildIOSV3Dataset");
};

const run = async () => {
  const { buildIOSV3Dataset, groupIOSV3MarkersByLocation } = await loadDatasetModule();

  const markers: DiscoverMapMarker[] = [
    createMarker("single-a", 48.31, 18.10, "Fitness"),
    createMarker("single-b", 48.32, 18.11, "Gastro"),
    createMarker("g1-a", 48.33, 18.12, "Relax", "group-1"),
    createMarker("g1-b", 48.33, 18.12, "Beauty", "group-1"),
  ];

  const groups = groupIOSV3MarkersByLocation(markers);
  assert(groups.length === 3, "grouping should merge markers sharing groupId");

  const singles = buildIOSV3Dataset({
    mode: "single",
    groups,
    clusteredFeatures: [],
    hasActiveFilter: false,
    cameraCenter: [18.11, 48.32],
    poolSize: 48,
  });

  const groupedItem = singles.find((item) => item.kind === "grouped");
  assert(Boolean(groupedItem), "single mode should include grouped marker for multi-item group");
  assert(groupedItem?.id === "group-1", "grouped marker id must match group.id");

  const singleA = singles.find((item) => item.id === "single-a");
  assert(Boolean(singleA), "single markers should keep original marker id");
  assert(singleA?.kind === "single", "single markers should keep single kind");

  const clusterFeatures: RenderFeature[] = [
    {
      id: "cluster:one",
      isCluster: true,
      count: 12,
      coordinates: { latitude: 48.32, longitude: 18.11 },
      focusCoordinates: { latitude: 48.321, longitude: 18.111 },
    },
    {
      id: "cluster:two",
      isCluster: true,
      count: 4,
      coordinates: { latitude: 48.36, longitude: 18.18 },
      focusCoordinates: { latitude: 48.36, longitude: 18.18 },
    },
  ];

  const clusters = buildIOSV3Dataset({
    mode: "cluster",
    groups,
    clusteredFeatures: clusterFeatures,
    hasActiveFilter: true,
    cameraCenter: [18.11, 48.32],
    poolSize: 48,
  });

  assert(clusters.length === 2, "cluster mode should render provided clustered features");
  assert(
    clusters.every((item) => item.kind === "cluster"),
    "cluster mode should only return cluster render items"
  );

  const oversizedMarkers = Array.from({ length: 80 }, (_, index) =>
    createMarker(
      `m-${index}`,
      48.3 + index * 0.0001,
      18.09 + index * 0.0001,
      "Fitness"
    )
  );
  const oversizedGroups = groupIOSV3MarkersByLocation(oversizedMarkers);
  const cappedSingles = buildIOSV3Dataset({
    mode: "single",
    groups: oversizedGroups,
    clusteredFeatures: [],
    hasActiveFilter: false,
    cameraCenter: [18.09, 48.3],
    poolSize: 48,
  });
  assert(cappedSingles.length === 48, "dataset must be capped to pool size in single mode");

  console.log("[verify-ios-v3-dataset] all checks passed");
};

void run();

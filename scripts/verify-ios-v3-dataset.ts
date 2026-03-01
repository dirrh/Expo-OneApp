import type { DiscoverMapMarker } from "../lib/interfaces";
import { createRequire } from "node:module";
import type { RenderFeature } from "../components/discover/map/types";
import type * as IOSV3DatasetModule from "../components/discover/map/ios_v3/buildIOSV3Dataset";
import type * as IOSLabeledPinProviderModule from "../lib/maps/iosLabeledPinProvider";

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
    nodeRequire.extensions[".png"] = (module, filename) => {
      module.exports = filename;
    };
  }

  return import("../components/discover/map/ios_v3/buildIOSV3Dataset");
};

const loadLabeledPinProvider = async (): Promise<typeof IOSLabeledPinProviderModule> =>
  import("../lib/maps/iosLabeledPinProvider");

const ALWAYS_TEXT_BUDGET = {
  maxTextMarkers: 8,
  maxFullMarkers: 8,
} as const;
const VIEWPORT_SIZE = {
  width: 390,
  height: 844,
} as const;
const RENDER_ZOOM = 18;

const run = async () => {
  const { buildIOSV3Dataset, groupIOSV3MarkersByLocation } = await loadDatasetModule();
  const { resolveIOSLabeledPin } = await loadLabeledPinProvider();

  const markers: DiscoverMapMarker[] = [
    createMarker("gym_365", 48.31, 18.10, "Fitness"),
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
    renderZoom: RENDER_ZOOM,
    viewportSize: VIEWPORT_SIZE,
    poolSize: 48,
    textBudget: ALWAYS_TEXT_BUDGET,
  });

  const groupedItem = singles.find((item) => item.kind === "grouped");
  assert(Boolean(groupedItem), "single mode should include grouped marker for multi-item group");
  assert(groupedItem?.id === "group-1", "grouped marker id must match group.id");

  const singleA = singles.find((item) => item.id === "gym_365");
  assert(Boolean(singleA), "single markers should keep original marker id");
  assert(singleA?.kind === "single", "single markers should keep single kind");
  assert(
    String(singleA?.image).includes("images\\icons\\ios-scaled\\full-markers\\") ||
      String(singleA?.image).includes("images/icons/ios-scaled/full-markers/") ||
      String(singleA?.image).includes("images\\icons\\ios-scaled\\labeled-pins\\") ||
      String(singleA?.image).includes("images/icons/ios-scaled/labeled-pins/"),
    "nearest eligible singles should use text-capable marker sprites"
  );

  const knownLabeled = resolveIOSLabeledPin(markers[0]);
  assert(
    String(knownLabeled).includes("images\\icons\\ios-scaled\\full-markers\\") ||
      String(knownLabeled).includes("images/icons/ios-scaled/full-markers/") ||
      String(knownLabeled).includes("images\\icons\\ios-scaled\\labeled-pins\\") ||
      String(knownLabeled).includes("images/icons/ios-scaled/labeled-pins/"),
    "known marker keys should still resolve to text-capable marker sprites"
  );
  const fallbackMarker = createMarker("not-generated", 48.4, 18.2, "Beauty");
  const fallbackImage = resolveIOSLabeledPin(fallbackMarker);
  assert(
    String(fallbackImage).includes("images\\icons\\ios-scaled\\compact-pins\\") ||
      String(fallbackImage).includes("images/icons/ios-scaled/compact-pins/"),
    "unknown marker keys must fall back to compact category pins"
  );

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
    renderZoom: RENDER_ZOOM,
    viewportSize: VIEWPORT_SIZE,
    poolSize: 48,
    textBudget: ALWAYS_TEXT_BUDGET,
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
    renderZoom: RENDER_ZOOM,
    viewportSize: VIEWPORT_SIZE,
    poolSize: 48,
    textBudget: ALWAYS_TEXT_BUDGET,
  });
  assert(cappedSingles.length === 48, "dataset must be capped to pool size in single mode");

  const textCapIds = [
    "gym_365",
    "diamond_gym",
    "bodyworld_fitness",
    "fit_bar_nitra",
    "kelo_gym",
    "fit_club_olympia",
    "for_sport_nitra",
    "intersport_mlyny_nitra",
    "intersport_promenada_nitra",
    "top_sport_gym",
  ];
  const textCapMarkers = textCapIds.map((id, index) =>
    createMarker(id, 48.3 + index * 0.0001, 18.09 + index * 0.0001, "Fitness")
  );
  const textCapGroups = groupIOSV3MarkersByLocation(textCapMarkers);
  const textCappedDataset = buildIOSV3Dataset({
    mode: "single",
    groups: textCapGroups,
    clusteredFeatures: [],
    hasActiveFilter: false,
    cameraCenter: [18.09, 48.3],
    renderZoom: RENDER_ZOOM,
    viewportSize: VIEWPORT_SIZE,
    poolSize: 48,
    textBudget: ALWAYS_TEXT_BUDGET,
  });
  const textSpriteCount = textCappedDataset.filter((item) => {
    const source = String(item.image);
    return (
      source.includes("images\\icons\\ios-scaled\\full-markers\\") ||
      source.includes("images/icons/ios-scaled/full-markers/") ||
      source.includes("images\\icons\\ios-scaled\\labeled-pins\\") ||
      source.includes("images/icons/ios-scaled/labeled-pins/")
    );
  }).length;
  const compactSpriteCount = textCappedDataset.filter((item) => {
    const source = String(item.image);
    return (
      source.includes("images\\icons\\ios-scaled\\compact-pins\\") ||
      source.includes("images/icons/ios-scaled/compact-pins/")
    );
  }).length;
  const labeledSpriteCount = textCappedDataset.filter((item) => {
    const source = String(item.image);
    return (
      source.includes("images\\icons\\ios-scaled\\labeled-pins\\") ||
      source.includes("images/icons/ios-scaled/labeled-pins/")
    );
  }).length;
  assert(
    textSpriteCount > 0 && textSpriteCount <= 8,
    "single mode should keep at most 8 local text-capable markers after collision filtering"
  );
  assert(labeledSpriteCount === 0, "single mode should not use narrow labeled marker sprites");
  assert(
    compactSpriteCount >= 2,
    "markers outside the visible text set should stay on shared compact pins"
  );

  const collidingTextMarkers = [
    createMarker("gym_365", 48.3, 18.1, "Fitness"),
    createMarker("diamond_gym", 48.3, 18.1005, "Fitness"),
  ];
  const collidingGroups = groupIOSV3MarkersByLocation(collidingTextMarkers);
  const collidingDataset = buildIOSV3Dataset({
    mode: "single",
    groups: collidingGroups,
    clusteredFeatures: [],
    hasActiveFilter: false,
    cameraCenter: [18.1, 48.3],
    renderZoom: RENDER_ZOOM,
    viewportSize: VIEWPORT_SIZE,
    poolSize: 48,
    textBudget: ALWAYS_TEXT_BUDGET,
  });
  const leadingText = collidingDataset.find((item) => item.id === "gym_365");
  const trailingText = collidingDataset.find((item) => item.id === "diamond_gym");
  assert(Boolean(leadingText), "colliding dataset should keep the leading marker");
  assert(Boolean(trailingText), "colliding dataset should keep the trailing marker");
  assert(
    String(leadingText?.image).includes("images\\icons\\ios-scaled\\full-markers\\") ||
      String(leadingText?.image).includes("images/icons/ios-scaled/full-markers/"),
    "highest-priority colliding marker should keep its full text sprite"
  );
  assert(
    String(trailingText?.image).includes("images\\icons\\ios-scaled\\compact-pins\\") ||
      String(trailingText?.image).includes("images/icons/ios-scaled/compact-pins/"),
    "lower-priority colliding marker should fall back to compact sprite"
  );

  const blockedByGroupedMarkers = [
    createMarker("gym_365", 48.3, 18.1, "Fitness"),
    createMarker("stack-a", 48.2999, 18.1, "Gastro", "group-stack"),
    createMarker("stack-b", 48.2999, 18.1, "Relax", "group-stack"),
  ];
  const blockedByGroupedDataset = buildIOSV3Dataset({
    mode: "single",
    groups: groupIOSV3MarkersByLocation(blockedByGroupedMarkers),
    clusteredFeatures: [],
    hasActiveFilter: false,
    cameraCenter: [18.1, 48.3],
    renderZoom: RENDER_ZOOM,
    viewportSize: VIEWPORT_SIZE,
    poolSize: 48,
    textBudget: ALWAYS_TEXT_BUDGET,
  });
  const blockedSingle = blockedByGroupedDataset.find((item) => item.id === "gym_365");
  assert(
    String(blockedSingle?.image).includes("images\\icons\\ios-scaled\\compact-pins\\") ||
      String(blockedSingle?.image).includes("images/icons/ios-scaled/compact-pins/"),
    "grouped marker obstacle should still force compact fallback when it intrudes into the label zone"
  );

  const nearbySideGroupedMarkers = [
    createMarker("gym_365", 48.3, 18.1, "Fitness"),
    createMarker("side-a", 48.3, 18.1006, "Gastro", "group-side"),
    createMarker("side-b", 48.3, 18.1006, "Relax", "group-side"),
  ];
  const nearbySideGroupedDataset = buildIOSV3Dataset({
    mode: "single",
    groups: groupIOSV3MarkersByLocation(nearbySideGroupedMarkers),
    clusteredFeatures: [],
    hasActiveFilter: false,
    cameraCenter: [18.1, 48.3],
    renderZoom: RENDER_ZOOM,
    viewportSize: VIEWPORT_SIZE,
    poolSize: 48,
    textBudget: ALWAYS_TEXT_BUDGET,
  });
  const sideSingle = nearbySideGroupedDataset.find((item) => item.id === "gym_365");
  assert(
    String(sideSingle?.image).includes("images\\icons\\ios-scaled\\full-markers\\") ||
      String(sideSingle?.image).includes("images/icons/ios-scaled/full-markers/"),
    "grouped marker beside the pin should not force compact fallback when it misses the label zone"
  );

  const remoteOnlyMarker: DiscoverMapMarker = {
    ...createMarker("remote-only", 48.35, 18.15, "Beauty"),
    markerSpriteUrl: "https://example.com/remote-only.png",
  };
  const remoteOnlyDataset = buildIOSV3Dataset({
    mode: "single",
    groups: groupIOSV3MarkersByLocation([remoteOnlyMarker]),
    clusteredFeatures: [],
    hasActiveFilter: false,
    cameraCenter: [18.15, 48.35],
    renderZoom: RENDER_ZOOM,
    viewportSize: VIEWPORT_SIZE,
    poolSize: 48,
    textBudget: ALWAYS_TEXT_BUDGET,
  });
  const remoteOnlyItem = remoteOnlyDataset[0];
  assert(
    String(remoteOnlyItem?.image).includes("images\\icons\\ios-scaled\\compact-pins\\") ||
      String(remoteOnlyItem?.image).includes("images/icons/ios-scaled/compact-pins/"),
    "remote-only sprite markers must stay on compact local pins in collision mode"
  );

  console.log("[verify-ios-v3-dataset] all checks passed");
};

void run();

import fs from "node:fs";
import path from "node:path";
import type { DiscoverMapMarker } from "../lib/interfaces";
import {
  buildIOSAnnotationPool,
  createIOSAnnotationPoolState,
} from "../components/discover/map/ios/hooks/useIOSAnnotationPool";
import type { IOSRenderItem } from "../components/discover/map/ios/types";

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const createRenderItem = (id: string, index: number): IOSRenderItem => ({
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
  anchor: { x: 0.5, y: 1 },
  zIndex: 1,
  isCluster: false,
  isStacked: false,
});

const createMarker = (): DiscoverMapMarker => ({
  id: "marker-remote",
  title: "Remote marker",
  coord: { lat: 48.31, lng: 18.11 },
  icon: { uri: "https://example.com/icon.png" },
  rating: 4.4,
  category: "Fitness",
});

const projectRoot = path.resolve(__dirname, "..");
const generatedMapPath = path.join(projectRoot, "lib/maps/generatedIOSScaledImageMap.ts");
const iosRegistryPath = path.join(
  projectRoot,
  "components/discover/map/ios/pipelines/iosSpriteRegistry.ts"
);

const countGeneratedMapEntries = (source: string) => {
  const matches = source.match(/\[require\("/g);
  return matches ? matches.length : 0;
};

const hasLocalOnlyPolicyGuard = (source: string) =>
  source.includes("resolveScaledFullMarkerImage(") &&
  source.includes("if (scaledLocalSprite)") &&
  source.includes("if (!localOnlySprites)") &&
  source.includes("preferFullSprite: true") &&
  source.includes("getMarkerCompactFallbackImage(marker.category)") &&
  source.includes("image: fallback");

const run = () => {
  const generatedMapSource = fs.readFileSync(generatedMapPath, "utf8");
  const scaleMapEntries = countGeneratedMapEntries(generatedMapSource);
  assert(scaleMapEntries > 0, "scaled iOS image map must not be empty");

  const registrySource = fs.readFileSync(iosRegistryPath, "utf8");
  assert(
    hasLocalOnlyPolicyGuard(registrySource),
    "iOS sprite registry must keep local-only fallback policy for remote icons"
  );

  const markerWithRemoteIcon = createMarker();
  assert(
    typeof markerWithRemoteIcon.icon === "object" &&
      markerWithRemoteIcon.icon !== null &&
      "uri" in markerWithRemoteIcon.icon,
    "test marker should simulate remote icon input"
  );

  const items = Array.from({ length: 62 }, (_, index) =>
    createRenderItem(`m-${index}`, index)
  );
  const poolState = createIOSAnnotationPoolState(48);
  const result = buildIOSAnnotationPool({
    items,
    poolSize: 48,
    state: poolState,
    placeholderImage: 1,
    placeholderAnchor: { x: 0.5, y: 1 },
  });
  assert(result.pooledItems.length === 48, "pool must keep fixed 48 mounted markers");
  const keySet = new Set(result.pooledItems.map((item) => item.key));
  assert(keySet.size === 48, "pool keys must stay unique and deterministic");
  assert(result.visibleCount <= 48, "visible items cannot exceed pool size");

  console.log("[verify-ios-rewrite-invariants] all checks passed");
};

run();

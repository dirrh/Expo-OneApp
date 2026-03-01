import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = path.resolve(__dirname, "..");
const DISCOVER_MAP_PATH = path.join(
  ROOT_DIR,
  "components/discover/DiscoverMap.ios.tsx"
);

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const source = fs.readFileSync(DISCOVER_MAP_PATH, "utf8");
const markerLayerTagMatch = source.match(/<IOSV3MarkerLayer([\s\S]*?)\/>/m);

if (markerLayerTagMatch == null) {
  throw new Error(
    "[verify-ios-v3-marker-pool-transition] FAIL: could not find IOSV3MarkerLayer in DiscoverMap.ios.tsx"
  );
}

const markerLayerTag = markerLayerTagMatch[0];

assert(
  !/key=\{visibleMode\}/.test(markerLayerTag),
  "[verify-ios-v3-marker-pool-transition] FAIL: IOSV3MarkerLayer must not be keyed by visibleMode because that remounts the pooled markers during cluster/single transitions"
);

assert(
  /markers=\{displayedPooledItems\}/.test(markerLayerTag),
  "[verify-ios-v3-marker-pool-transition] FAIL: IOSV3MarkerLayer must render displayedPooledItems so pool slots update in place"
);

console.log("[verify-ios-v3-marker-pool-transition] all checks passed");

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const file = "components/discover/DiscoverMap.native.tsx";
const content = readFileSync(resolve(file), "utf8");

const expectations: Array<{ expected: string; description: string }> = [
  {
    expected: 'const shouldUseIOSBitmapSingleMarker = Platform.OS === "ios";',
    description: "iOS single markers explicitly switch to bitmap base pins",
  },
  {
    expected:
      'image: shouldUseIOSBitmapSingleMarker\n          ? resolveIOSCompactPin(marker.category)\n          : svgMarker?.asset ?? resolveIOSCompactPin(marker.category),',
    description: "iOS single markers use compact PNG pins instead of SVG base assets",
  },
  {
    expected:
      'anchor: shouldUseIOSBitmapSingleMarker\n          ? IOS_COMPACT_PIN_ANCHOR\n          : svgMarker?.anchor ?? IOS_COMPACT_PIN_ANCHOR,',
    description: "iOS single markers use compact pin anchor",
  },
  {
    expected: "isSvg: shouldUseIOSBitmapSingleMarker || Boolean(svgMarker),",
    description: "single-marker composition stays enabled on iOS after switching the base icon",
  },
];

const failures = expectations.flatMap((expectation) =>
  content.includes(expectation.expected) ? [] : [`${file}: ${expectation.description}`]
);

if (failures.length > 0) {
  console.error("iOS single marker bitmap compose verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("iOS single marker bitmap compose verification passed.");

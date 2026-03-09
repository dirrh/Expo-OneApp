import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const file = "components/discover/DiscoverMap.native.tsx";
const content = readFileSync(resolve(file), "utf8");

const expectations: Array<{ expected: string; description: string }> = [
  {
    expected: "function commitSingleMarkersRevision(revision, markers) {",
    description: "single marker commits use a dedicated progressive sync helper",
  },
  {
    expected: "commitSingleMarkersRevision(nextRevision, safeMarkers);",
    description: "single marker revision commits immediately before async image loads finish",
  },
  {
    expected: "loadSingleMarkerImage(imageEntry).finally(function () {",
    description: "each single marker image load re-triggers a revision commit",
  },
];

const forbiddenSnippets: Array<{ forbidden: string; description: string }> = [
  {
    forbidden: "Promise.all(imageLoads).then(function () {",
    description: "single marker rendering is no longer blocked behind Promise.all",
  },
];

const failures = [
  ...expectations.flatMap((expectation) =>
    content.includes(expectation.expected) ? [] : [`${file}: ${expectation.description}`]
  ),
  ...forbiddenSnippets.flatMap((forbidden) =>
    content.includes(forbidden.forbidden) ? [`${file}: ${forbidden.description}`] : []
  ),
];

if (failures.length > 0) {
  console.error("iOS single marker progressive sync verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("iOS single marker progressive sync verification passed.");

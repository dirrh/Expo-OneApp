import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const file = "components/discover/DiscoverMap.native.tsx";
const content = readFileSync(resolve(file), "utf8");

const expectations: Array<{ expected: string; description: string }> = [
  {
    expected: "var SINGLE_MARKER_LABEL_TEXT_OFFSET_Y = 0.2;",
    description: "iOS single-layer label offset must move the business name closer to the pin",
  },
  {
    expected: "var SINGLE_LABEL_OFFSET_Y_PX = 18;",
    description: "DOM label fallback offset must stay unchanged",
  },
];

const failures = expectations.flatMap((expectation) =>
  content.includes(expectation.expected) ? [] : [`${file}: ${expectation.description}`]
);

if (failures.length > 0) {
  console.error("iOS single label offset verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("iOS single label offset verification passed.");

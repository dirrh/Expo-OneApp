import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const file = "screens/profile/ProfileScreen.tsx";
const content = readFileSync(resolve(file), "utf8");

const extractStyleBlock = (styleName: string): string | null => {
  const styleNameIndex = content.indexOf(`${styleName}: {`);
  if (styleNameIndex === -1) {
    return null;
  }

  const blockStart = content.indexOf("{", styleNameIndex);
  if (blockStart === -1) {
    return null;
  }

  let depth = 0;
  for (let index = blockStart; index < content.length; index += 1) {
    const char = content[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return content.slice(blockStart, index + 1);
      }
    }
  }

  return null;
};

const styleExpectations: Array<{ styleName: string; expected: string; description: string }> = [
  {
    styleName: "tabBar",
    expected: 'backgroundColor: "#FFFFFF"',
    description: "tab bar frame background is white",
  },
  {
    styleName: "tabBar",
    expected: "borderRadius: 22",
    description: "tab bar frame uses pill radius",
  },
  {
    styleName: "tabItemActive",
    expected: 'backgroundColor: "#EB8100"',
    description: "active tab pill is orange",
  },
  {
    styleName: "tabLabel",
    expected: 'color: "#71717A"',
    description: "inactive tab text is gray",
  },
  {
    styleName: "tabLabelActive",
    expected: 'color: "#FFFFFF"',
    description: "active tab text is white",
  },
];

const textExpectations: Array<{ expected: string; description: string }> = [
  {
    expected: 'accessibilityRole="tab"',
    description: "tab buttons expose tab accessibility role",
  },
  {
    expected: 'color={isActive ? "#FFFFFF" : "#71717A"}',
    description: "tab icons switch between white and gray",
  },
  {
    expected: "styles.tabItemActive",
    description: "markup applies an active pill style",
  },
];

const failures = [
  ...styleExpectations.flatMap((expectation) => {
    const block = extractStyleBlock(expectation.styleName);
    if (!block) {
      return [`${file}: missing style block ${expectation.styleName}`];
    }
    return block.includes(expectation.expected) ? [] : [`${file}: ${expectation.description}`];
  }),
  ...textExpectations.flatMap((expectation) =>
    content.includes(expectation.expected) ? [] : [`${file}: ${expectation.description}`]
  ),
];

if (failures.length > 0) {
  console.error("Profile tabs pill verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Profile tabs pill verification passed.");

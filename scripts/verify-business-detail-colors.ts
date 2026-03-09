import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type StyleCheck = {
  file: string;
  styleName: string;
  expected: string;
  description: string;
};

type TextCheck = {
  file: string;
  expected: string;
  description: string;
};

const styleChecks: StyleCheck[] = [
  {
    file: "screens/BusinessDetailScreen.tsx",
    styleName: "container",
    expected: 'backgroundColor: "#FFFFFF"',
    description: "BusinessDetail root background is white",
  },
  {
    file: "screens/BusinessDetailScreen.tsx",
    styleName: "menuWrapper",
    expected: 'backgroundColor: "#FFFFFF"',
    description: "BusinessDetail menu wrapper background is white",
  },
  {
    file: "components/discover/TabMenu.tsx",
    styleName: "frame",
    expected: 'backgroundColor: "#FFFFFF"',
    description: "TabMenu frame background is white",
  },
  {
    file: "components/discover/TabMenu.tsx",
    styleName: "tabText",
    expected: 'color: "#71717A"',
    description: "TabMenu inactive text color matches design",
  },
];

const textChecks: TextCheck[] = [
  {
    file: "components/discover/HeroActions.tsx",
    expected: 'const iconColor = "#000000";',
    description: "Hero action default icon color is pure black",
  },
];

const read = (file: string) => readFileSync(resolve(file), "utf8");

const extractStyleBlock = (content: string, styleName: string): string | null => {
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

const failures = [
  ...styleChecks.flatMap((check) => {
    const block = extractStyleBlock(read(check.file), check.styleName);
    if (!block) {
      return [`${check.file}: missing style block ${check.styleName}`];
    }
    return block.includes(check.expected) ? [] : [`${check.file}: ${check.description}`];
  }),
  ...textChecks.flatMap((check) =>
    read(check.file).includes(check.expected) ? [] : [`${check.file}: ${check.description}`]
  ),
];

if (failures.length > 0) {
  console.error("BusinessDetail color verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("BusinessDetail color verification passed.");

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createCanvas, loadImage } from "canvas";

const mapFile = "components/discover/DiscoverMap.native.tsx";
const compactPinFile = "images/icons/ios-scaled/compact-pins/gastro.png";

const content = readFileSync(resolve(mapFile), "utf8");

const requiredSnippets: Array<{ expected: string; description: string }> = [
  {
    expected: "function drawSingleMarkerRatingBadge(ctx, entry, naturalWidth, naturalHeight) {",
    description: "webview marker pipeline must draw the iOS rating badge directly onto canvas",
  },
  {
    expected: "var sourceCanvasWidth = 165;",
    description: "runtime badge draw must reuse the original badged-icon source canvas width",
  },
  {
    expected: "var sourceCanvasHeight = 226;",
    description: "runtime badge draw must reuse the original badged-icon source canvas height",
  },
  {
    expected: "var badgeTop = 35;",
    description: "runtime badge draw must reuse the original badge top inset",
  },
  {
    expected: "var badgeFontPx = 30;",
    description: "runtime badge draw must reuse the original badge font size before scaling",
  },
  {
    expected: "ctx.drawImage(badgeCanvas, targetPinLeft, targetPinTop, targetPinWidth, targetPinHeight);",
    description: "runtime badge draw must scale the recreated source badge into the compact-pin frame",
  },
  {
    expected: "iosCanvasRatingBadge: shouldUseIOSBitmapSingleMarker && numericRating !== null,",
    description: "iOS single markers must opt into runtime canvas badge composition",
  },
  {
    expected: "if (entry.iosCanvasRatingBadge && entry.ratingValue) {",
    description: "loaded iOS single marker images must receive the canvas badge overlay",
  },
];

const forbiddenSnippets: Array<{ forbidden: string; description: string }> = [
  {
    forbidden: 'isSvg: shouldUseIOSBitmapSingleMarker || Boolean(svgMarker),',
    description: "iOS single markers must no longer pretend the bitmap path is SVG-based",
  },
];

const failures = [
  ...requiredSnippets.flatMap((snippet) =>
    content.includes(snippet.expected) ? [] : [`${mapFile}: ${snippet.description}`]
  ),
  ...forbiddenSnippets.flatMap((snippet) =>
    content.includes(snippet.forbidden) ? [`${mapFile}: ${snippet.description}`] : []
  ),
];

async function main() {
  const compactPin = await loadImage(resolve(compactPinFile));
  const canvas = createCanvas(compactPin.width, compactPin.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(compactPin, 0, 0);

  const bakedBadgeSample = Array.from(ctx.getImageData(220, 25, 1, 1).data);
  const bakedBadgeDetected =
    bakedBadgeSample[3] > 200 &&
    Math.abs(bakedBadgeSample[0] - 55) <= 4 &&
    Math.abs(bakedBadgeSample[1] - 65) <= 4 &&
    Math.abs(bakedBadgeSample[2] - 81) <= 4;

  if (bakedBadgeDetected) {
    failures.push(
      `${compactPinFile}: compact pin still contains a baked-in rating badge instead of a clean base pin`
    );
  }

  const sourceCanvasWidth = 165;
  const sourceCanvasHeight = 226;
  const badgeCanvas = createCanvas(sourceCanvasWidth, sourceCanvasHeight);
  const badgeCtx = badgeCanvas.getContext("2d");
  const badgeTop = 35;
  const badgeMinWidth = 98;
  const badgeMaxWidth = 132;
  const badgeMinHeight = 32;
  const badgeGap = 6;
  const badgePaddingLeft = 15;
  const badgePaddingRight = 15;
  const badgePaddingY = 10;
  const badgeTextWidthBuffer = 8;
  const badgeRightInset = -2;
  const badgeLeftSafeMargin = 2;
  const badgeRadius = 9999;
  const badgeFontPx = 30;
  const badgeStarSize = 27;
  const ratingValue = "4.0";

  const drawRoundedRectPath = (
    drawCtx: ReturnType<typeof badgeCanvas.getContext>,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    if (!drawCtx) {
      return;
    }
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    drawCtx.beginPath();
    drawCtx.moveTo(x + r, y);
    drawCtx.arcTo(x + width, y, x + width, y + height, r);
    drawCtx.arcTo(x + width, y + height, x, y + height, r);
    drawCtx.arcTo(x, y + height, x, y, r);
    drawCtx.arcTo(x, y, x + width, y, r);
    drawCtx.closePath();
  };

  const drawBadgeStar = (
    drawCtx: ReturnType<typeof badgeCanvas.getContext>,
    centerX: number,
    centerY: number,
    outerRadius: number,
    innerRadius: number
  ) => {
    if (!drawCtx) {
      return;
    }
    const points = 5;
    const step = Math.PI / points;
    let angle = -Math.PI / 2;
    drawCtx.beginPath();
    for (let pointIndex = 0; pointIndex < points * 2; pointIndex += 1) {
      const radius = pointIndex % 2 === 0 ? outerRadius : innerRadius;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      if (pointIndex === 0) {
        drawCtx.moveTo(x, y);
      } else {
        drawCtx.lineTo(x, y);
      }
      angle += step;
    }
    drawCtx.closePath();
  };

  if (!badgeCtx) {
    failures.push("canvas verifier could not acquire a 2d context");
  } else {
    badgeCtx.font = `600 ${badgeFontPx}px Arial`;
    badgeCtx.textBaseline = "middle";
    badgeCtx.textAlign = "left";
    const textMetrics = badgeCtx.measureText(ratingValue);
    const textHeight = Math.ceil(
      (textMetrics.actualBoundingBoxAscent ?? badgeFontPx * 0.78) +
        (textMetrics.actualBoundingBoxDescent ?? badgeFontPx * 0.22)
    );
    const rawBadgeWidth = Math.ceil(
      badgePaddingLeft +
        badgeStarSize +
        badgeGap +
        textMetrics.width +
        badgePaddingRight +
        badgeTextWidthBuffer
    );
    const badgeWidth = Math.max(badgeMinWidth, Math.min(badgeMaxWidth, rawBadgeWidth));
    const badgeHeight = Math.max(
      badgeMinHeight,
      Math.ceil(Math.max(badgeStarSize, textHeight) + badgePaddingY * 2)
    );
    const rawBadgeX = sourceCanvasWidth - badgeWidth - badgeRightInset;
    const badgeX = Math.min(
      sourceCanvasWidth - badgeWidth,
      Math.max(badgeLeftSafeMargin, rawBadgeX)
    );
    const badgeCenterY = badgeTop + badgeHeight / 2;
    const starCenterX = badgeX + badgePaddingLeft + badgeStarSize / 2;
    const textX = starCenterX + badgeStarSize / 2 + badgeGap;

    drawRoundedRectPath(badgeCtx, badgeX, badgeTop, badgeWidth, badgeHeight, badgeRadius);
    badgeCtx.fillStyle = "#374151";
    badgeCtx.fill();
    drawBadgeStar(
      badgeCtx,
      starCenterX,
      badgeCenterY,
      badgeStarSize / 2,
      badgeStarSize / 4.6
    );
    badgeCtx.fillStyle = "#FFD000";
    badgeCtx.fill();
    badgeCtx.fillStyle = "#FFFFFF";
    badgeCtx.font = `600 ${badgeFontPx}px Arial`;
    badgeCtx.fillText(ratingValue, textX, badgeCenterY);

    ctx.drawImage(
      badgeCanvas,
      compactPin.width * (149 / 402),
      0,
      compactPin.width * (104 / 402),
      compactPin.height * (141 / 172)
    );

    const imageData = ctx.getImageData(0, 0, compactPin.width, compactPin.height);
    let markerMinX = compactPin.width;
    let markerMinY = compactPin.height;
    let markerMaxX = -1;
    let markerMaxY = -1;
    for (let y = 0; y < compactPin.height; y += 1) {
      for (let x = 0; x < compactPin.width; x += 1) {
        const alpha = imageData.data[(y * compactPin.width + x) * 4 + 3];
        if (alpha === 0) {
          continue;
        }
        markerMinX = Math.min(markerMinX, x);
        markerMinY = Math.min(markerMinY, y);
        markerMaxX = Math.max(markerMaxX, x);
        markerMaxY = Math.max(markerMaxY, y);
      }
    }

    if (markerMinX !== 153 || markerMinY !== 21 || markerMaxX !== 252 || markerMaxY !== 136) {
      failures.push(
        `${compactPinFile}: final iOS marker bounds must match the old asset frame (expected 153,21,252,136 got ${markerMinX},${markerMinY},${markerMaxX},${markerMaxY})`
      );
    }
  }

  if (failures.length > 0) {
    console.error("iOS single marker canvas compose verification failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("iOS single marker canvas compose verification passed.");
}

void main();

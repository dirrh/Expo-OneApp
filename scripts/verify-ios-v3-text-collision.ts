import { resolveIOSV3TextCollision } from "../components/discover/map/ios_v3/resolveIOSV3TextCollision";

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const VIEWPORT = { width: 390, height: 844 } as const;
const CAMERA_CENTER: [number, number] = [18.1, 48.3];
const RENDER_ZOOM = 18;
const TEXT_BUDGET = { maxTextMarkers: 8, maxFullMarkers: 2 } as const;

const run = () => {
  const farApart = resolveIOSV3TextCollision({
    candidates: [
      {
        id: "single-a",
        kind: "single",
        coordinate: { latitude: 48.3, longitude: 18.1 },
        hasFullText: true,
        hasLabeledText: true,
      },
      {
        id: "single-b",
        kind: "single",
        coordinate: { latitude: 48.3, longitude: 18.103 },
        hasFullText: true,
        hasLabeledText: true,
      },
    ],
    cameraCenter: CAMERA_CENTER,
    renderZoom: RENDER_ZOOM,
    viewportSize: VIEWPORT,
    textBudget: TEXT_BUDGET,
  });

  assert(
    farApart.variantByMarkerId.get("single-a") === "full",
    "far apart primary single should keep full text"
  );
  assert(
    farApart.variantByMarkerId.get("single-b") === "full",
    "far apart secondary single should keep full text"
  );

  const overlappingSingles = resolveIOSV3TextCollision({
    candidates: [
      {
        id: "single-a",
        kind: "single",
        coordinate: { latitude: 48.3, longitude: 18.1 },
        hasFullText: true,
        hasLabeledText: true,
      },
      {
        id: "single-b",
        kind: "single",
        coordinate: { latitude: 48.3, longitude: 18.1005 },
        hasFullText: true,
        hasLabeledText: true,
      },
    ],
    cameraCenter: CAMERA_CENTER,
    renderZoom: RENDER_ZOOM,
    viewportSize: VIEWPORT,
    textBudget: TEXT_BUDGET,
  });

  assert(
    overlappingSingles.variantByMarkerId.get("single-a") === "full",
    "nearest single should keep text when labels collide"
  );
  assert(
    overlappingSingles.variantByMarkerId.get("single-b") === "compact",
    "lower-priority colliding single must fall back to compact"
  );

  const blockedByGrouped = resolveIOSV3TextCollision({
    candidates: [
      {
        id: "single-a",
        kind: "single",
        coordinate: { latitude: 48.3, longitude: 18.1 },
        hasFullText: true,
        hasLabeledText: true,
      },
      {
        id: "group-1",
        kind: "grouped",
        coordinate: { latitude: 48.2999, longitude: 18.1 },
      },
    ],
    cameraCenter: CAMERA_CENTER,
    renderZoom: RENDER_ZOOM,
    viewportSize: VIEWPORT,
    textBudget: TEXT_BUDGET,
  });

  assert(
    blockedByGrouped.variantByMarkerId.get("single-a") === "compact",
    "grouped marker obstacle should block nearby single text when it overlaps the label zone"
  );

  const nearbyButNotBlockingGrouped = resolveIOSV3TextCollision({
    candidates: [
      {
        id: "single-a",
        kind: "single",
        coordinate: { latitude: 48.3, longitude: 18.1 },
        hasFullText: true,
        hasLabeledText: true,
      },
      {
        id: "group-2",
        kind: "grouped",
        coordinate: { latitude: 48.3, longitude: 18.1006 },
      },
    ],
    cameraCenter: CAMERA_CENTER,
    renderZoom: RENDER_ZOOM,
    viewportSize: VIEWPORT,
    textBudget: TEXT_BUDGET,
  });

  assert(
    nearbyButNotBlockingGrouped.variantByMarkerId.get("single-a") === "full",
    "grouped marker beside the pin should not block text if it misses the label zone"
  );

  const blockedByUser = resolveIOSV3TextCollision({
    candidates: [
      {
        id: "single-a",
        kind: "single",
        coordinate: { latitude: 48.3, longitude: 18.1 },
        hasFullText: true,
        hasLabeledText: true,
      },
    ],
    cameraCenter: CAMERA_CENTER,
    renderZoom: RENDER_ZOOM,
    viewportSize: VIEWPORT,
    textBudget: TEXT_BUDGET,
    userCoordinate: { latitude: 48.3, longitude: 18.1001 },
  });

  assert(
    blockedByUser.variantByMarkerId.get("single-a") === "compact",
    "user marker should still block nearby single text when it overlaps the label zone"
  );

  const deterministicOrder = resolveIOSV3TextCollision({
    candidates: [
      {
        id: "single-c",
        kind: "single",
        coordinate: { latitude: 48.3, longitude: 18.101 },
        hasFullText: true,
        hasLabeledText: true,
      },
      {
        id: "single-a",
        kind: "single",
        coordinate: { latitude: 48.3, longitude: 18.1 },
        hasFullText: true,
        hasLabeledText: true,
      },
      {
        id: "single-b",
        kind: "single",
        coordinate: { latitude: 48.3, longitude: 18.1005 },
        hasFullText: true,
        hasLabeledText: true,
      },
    ],
    cameraCenter: CAMERA_CENTER,
    renderZoom: RENDER_ZOOM,
    viewportSize: VIEWPORT,
    textBudget: TEXT_BUDGET,
  });

  assert(
    deterministicOrder.variantByMarkerId.get("single-a") === "full",
    "closest candidate should win deterministic tie-breaking chain"
  );
  assert(
    deterministicOrder.variantByMarkerId.get("single-b") === "compact",
    "middle candidate should fall back in deterministic chain"
  );
  assert(
    deterministicOrder.variantByMarkerId.get("single-c") === "compact",
    "trailing candidate should also fall back when blocked by accepted text"
  );

  const labeledOnly = resolveIOSV3TextCollision({
    candidates: [
      {
        id: "single-a",
        kind: "single",
        coordinate: { latitude: 48.3, longitude: 18.1 },
        hasFullText: false,
        hasLabeledText: true,
      },
      {
        id: "single-b",
        kind: "single",
        coordinate: { latitude: 48.3, longitude: 18.1005 },
        hasFullText: false,
        hasLabeledText: true,
      },
    ],
    cameraCenter: CAMERA_CENTER,
    renderZoom: RENDER_ZOOM,
    viewportSize: VIEWPORT,
    textBudget: { maxTextMarkers: 8, maxFullMarkers: 0 },
  });

  assert(
    labeledOnly.variantByMarkerId.get("single-a") === "labeled",
    "labeled-only candidate should use labeled variant when space permits"
  );
  assert(
    labeledOnly.variantByMarkerId.get("single-b") === "compact",
    "labeled-only candidate should fall back when its label collides"
  );

  const compactOnly = resolveIOSV3TextCollision({
    candidates: [
      {
        id: "single-a",
        kind: "single",
        coordinate: { latitude: 48.3, longitude: 18.1 },
        hasFullText: false,
        hasLabeledText: false,
      },
    ],
    cameraCenter: CAMERA_CENTER,
    renderZoom: RENDER_ZOOM,
    viewportSize: VIEWPORT,
    textBudget: TEXT_BUDGET,
  });

  assert(
    compactOnly.variantByMarkerId.get("single-a") === "compact",
    "single without local text assets must stay compact"
  );

  const narrowLabels = resolveIOSV3TextCollision({
    candidates: [
      {
        id: "single-a",
        kind: "single",
        coordinate: { latitude: 48.3, longitude: 18.1 },
        hasFullText: true,
        hasLabeledText: true,
        fullTextWidth: 72,
        labeledTextWidth: 64,
      },
      {
        id: "single-b",
        kind: "single",
        coordinate: { latitude: 48.3, longitude: 18.10075 },
        hasFullText: true,
        hasLabeledText: true,
        fullTextWidth: 72,
        labeledTextWidth: 64,
      },
    ],
    cameraCenter: CAMERA_CENTER,
    renderZoom: RENDER_ZOOM,
    viewportSize: VIEWPORT,
    textBudget: TEXT_BUDGET,
  });

  assert(
    narrowLabels.variantByMarkerId.get("single-a") === "full" &&
      narrowLabels.variantByMarkerId.get("single-b") === "full",
    "narrow titles should both stay visible when there is enough real text space"
  );

  console.log("[verify-ios-v3-text-collision] all checks passed");
};

run();

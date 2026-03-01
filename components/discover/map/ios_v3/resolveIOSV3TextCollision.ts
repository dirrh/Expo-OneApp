import type {
  IOSV3CollisionRect,
  IOSV3Coordinate,
  IOSV3TextCollisionCandidate,
  IOSV3TextCollisionParams,
  IOSV3TextCollisionResult,
  IOSV3TextVariant,
  IOSV3ViewportSize,
} from "./types";
import {
  IOS_V3_TEXT_COLLISION_ANCHOR,
  IOS_V3_TEXT_COLLISION_CANVAS,
  IOS_V3_TEXT_COLLISION_MARKER_OBSTACLE_LOCAL_RECT,
  IOS_V3_TEXT_COLLISION_FULL_TEXT_LOCAL_RECT,
  IOS_V3_TEXT_COLLISION_LABELED_TEXT_LOCAL_RECT,
  IOS_V3_TEXT_COLLISION_USER_OBSTACLE_LOCAL_RECT,
} from "./iosV3TextCollisionConstants";

type ScreenPoint = {
  x: number;
  y: number;
};

type LocalRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type OwnedRect = {
  ownerId: string;
  rect: IOSV3CollisionRect;
};

const MIN_ZOOM = 0;
const MAX_ZOOM = 20;

const isValidCoordinate = (coordinate: IOSV3Coordinate | null | undefined) =>
  Boolean(
    coordinate &&
      Number.isFinite(coordinate.latitude) &&
      Number.isFinite(coordinate.longitude) &&
      Math.abs(coordinate.latitude) <= 90 &&
      Math.abs(coordinate.longitude) <= 180
  );

const normalizeViewportSize = (
  viewportSize: IOSV3ViewportSize
): IOSV3ViewportSize | null => {
  const width =
    typeof viewportSize.width === "number" && Number.isFinite(viewportSize.width)
      ? viewportSize.width
      : NaN;
  const height =
    typeof viewportSize.height === "number" && Number.isFinite(viewportSize.height)
      ? viewportSize.height
      : NaN;
  if (width <= 0 || height <= 0) {
    return null;
  }
  return { width, height };
};

const clampZoom = (zoom: number) => {
  if (!Number.isFinite(zoom)) {
    return MIN_ZOOM;
  }
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
};

const projectToWorld = (
  longitude: number,
  latitude: number,
  worldSize: number
) => {
  const x = ((longitude + 180) / 360) * worldSize;
  const sinLat = Math.sin((latitude * Math.PI) / 180);
  const clampedSinLat = Math.min(0.9999, Math.max(-0.9999, sinLat));
  const y =
    (0.5 -
      Math.log((1 + clampedSinLat) / (1 - clampedSinLat)) / (4 * Math.PI)) *
    worldSize;

  return { x, y };
};

const wrapWorldDelta = (delta: number, worldSize: number) => {
  if (delta > worldSize / 2) {
    return delta - worldSize;
  }
  if (delta < -worldSize / 2) {
    return delta + worldSize;
  }
  return delta;
};

const buildRect = (
  left: number,
  top: number,
  width: number,
  height: number
): IOSV3CollisionRect => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
});

const buildSpriteRectFromLocal = (
  point: ScreenPoint,
  localRect: LocalRect
): IOSV3CollisionRect => {
  const canvasOriginX =
    point.x - IOS_V3_TEXT_COLLISION_ANCHOR.x * IOS_V3_TEXT_COLLISION_CANVAS.width;
  const canvasOriginY =
    point.y - IOS_V3_TEXT_COLLISION_ANCHOR.y * IOS_V3_TEXT_COLLISION_CANVAS.height;
  return buildRect(
    canvasOriginX + localRect.x,
    canvasOriginY + localRect.y,
    localRect.width,
    localRect.height
  );
};

export const rectsIntersect = (
  left: IOSV3CollisionRect,
  right: IOSV3CollisionRect
) =>
  !(
    left.right <= right.left ||
    right.right <= left.left ||
    left.bottom <= right.top ||
    right.bottom <= left.top
  );

const buildOffsetRectFromPoint = (
  point: ScreenPoint,
  localRect: LocalRect
): IOSV3CollisionRect =>
  buildRect(
    point.x + localRect.x,
    point.y + localRect.y,
    localRect.width,
    localRect.height
  );

const buildCenteredLocalRect = (
  templateRect: LocalRect,
  width: number
): LocalRect => {
  const safeWidth = Math.max(1, Math.min(templateRect.width, width));
  const centerX = templateRect.x + templateRect.width / 2;
  return {
    x: centerX - safeWidth / 2,
    y: templateRect.y,
    width: safeWidth,
    height: templateRect.height,
  };
};

const projectCoordinateToScreen = ({
  coordinate,
  cameraCenter,
  renderZoom,
  viewportSize,
}: {
  coordinate: IOSV3Coordinate;
  cameraCenter: [number, number];
  renderZoom: number;
  viewportSize: IOSV3ViewportSize;
}): ScreenPoint | null => {
  if (!isValidCoordinate(coordinate)) {
    return null;
  }
  const safeLng =
    typeof cameraCenter[0] === "number" && Number.isFinite(cameraCenter[0])
      ? cameraCenter[0]
      : 0;
  const safeLat =
    typeof cameraCenter[1] === "number" && Number.isFinite(cameraCenter[1])
      ? cameraCenter[1]
      : 0;
  const safeZoom = clampZoom(renderZoom);
  const worldSize = 256 * Math.pow(2, safeZoom);
  const centerWorld = projectToWorld(safeLng, safeLat, worldSize);
  const pointWorld = projectToWorld(
    coordinate.longitude,
    coordinate.latitude,
    worldSize
  );
  const dx = wrapWorldDelta(pointWorld.x - centerWorld.x, worldSize);
  const dy = pointWorld.y - centerWorld.y;
  return {
    x: viewportSize.width / 2 + dx,
    y: viewportSize.height / 2 + dy,
  };
};

const distanceSqToCamera = (
  candidate: IOSV3TextCollisionCandidate,
  cameraCenter: [number, number]
) => {
  const latDelta = candidate.coordinate.latitude - cameraCenter[1];
  const lngDelta = candidate.coordinate.longitude - cameraCenter[0];
  const result = latDelta * latDelta + lngDelta * lngDelta;
  return Number.isFinite(result) ? result : Number.MAX_SAFE_INTEGER;
};

const compareByPriority = (
  left: IOSV3TextCollisionCandidate,
  right: IOSV3TextCollisionCandidate,
  cameraCenter: [number, number]
) => {
  const distanceDelta =
    distanceSqToCamera(left, cameraCenter) - distanceSqToCamera(right, cameraCenter);
  if (distanceDelta !== 0) {
    return distanceDelta;
  }
  return left.id.localeCompare(right.id);
};

const resolvePreferredVariant = ({
  candidate,
  assignedText,
  assignedFull,
  maxText,
  maxFull,
}: {
  candidate: IOSV3TextCollisionCandidate;
  assignedText: number;
  assignedFull: number;
  maxText: number;
  maxFull: number;
}): IOSV3TextVariant => {
  if (assignedText >= maxText) {
    return "compact";
  }
  if (candidate.hasFullText && assignedFull < maxFull) {
    return "full";
  }
  if (candidate.hasLabeledText) {
    return "labeled";
  }
  return "compact";
};

const resolveTextLocalRect = (
  candidate: IOSV3TextCollisionCandidate,
  variant: Extract<IOSV3TextVariant, "full" | "labeled">
) => {
  if (variant === "full") {
    return buildCenteredLocalRect(
      IOS_V3_TEXT_COLLISION_FULL_TEXT_LOCAL_RECT,
      candidate.fullTextWidth ?? IOS_V3_TEXT_COLLISION_FULL_TEXT_LOCAL_RECT.width
    );
  }
  return buildCenteredLocalRect(
    IOS_V3_TEXT_COLLISION_LABELED_TEXT_LOCAL_RECT,
    candidate.labeledTextWidth ?? IOS_V3_TEXT_COLLISION_LABELED_TEXT_LOCAL_RECT.width
  );
};

export const resolveIOSV3TextCollision = ({
  candidates,
  cameraCenter,
  renderZoom,
  viewportSize,
  textBudget,
  userCoordinate,
}: IOSV3TextCollisionParams): IOSV3TextCollisionResult => {
  const variantByMarkerId = new Map<string, IOSV3TextVariant>();
  candidates.forEach((candidate) => {
    if (candidate.kind === "single") {
      variantByMarkerId.set(candidate.id, "compact");
    }
  });

  const safeViewport = normalizeViewportSize(viewportSize);
  if (!safeViewport) {
    return { variantByMarkerId };
  }

  const requiredRects: OwnedRect[] = [];
  const screenPointById = new Map<string, ScreenPoint>();

  candidates.forEach((candidate) => {
    if (!isValidCoordinate(candidate.coordinate)) {
      return;
    }
    const screenPoint = projectCoordinateToScreen({
      coordinate: candidate.coordinate,
      cameraCenter,
      renderZoom,
      viewportSize: safeViewport,
    });
    if (!screenPoint) {
      return;
    }
    screenPointById.set(candidate.id, screenPoint);
    requiredRects.push({
      ownerId: candidate.id,
      rect: buildSpriteRectFromLocal(
        screenPoint,
        IOS_V3_TEXT_COLLISION_MARKER_OBSTACLE_LOCAL_RECT
      ),
    });
  });

  if (userCoordinate && isValidCoordinate(userCoordinate)) {
    const userScreenPoint = projectCoordinateToScreen({
      coordinate: userCoordinate,
      cameraCenter,
      renderZoom,
      viewportSize: safeViewport,
    });
    if (userScreenPoint) {
      requiredRects.push({
        ownerId: "__user__",
        rect: buildOffsetRectFromPoint(
          userScreenPoint,
          IOS_V3_TEXT_COLLISION_USER_OBSTACLE_LOCAL_RECT
        ),
      });
    }
  }

  const safeMaxText =
    typeof textBudget.maxTextMarkers === "number" &&
    Number.isFinite(textBudget.maxTextMarkers)
      ? Math.max(0, Math.floor(textBudget.maxTextMarkers))
      : 0;
  const safeMaxFull =
    typeof textBudget.maxFullMarkers === "number" &&
    Number.isFinite(textBudget.maxFullMarkers)
      ? Math.max(0, Math.min(safeMaxText, Math.floor(textBudget.maxFullMarkers)))
      : 0;

  const textCandidates = candidates
    .filter(
      (candidate) =>
        candidate.kind === "single" &&
        Boolean(candidate.hasFullText || candidate.hasLabeledText) &&
        screenPointById.has(candidate.id)
    )
    .sort((left, right) => compareByPriority(left, right, cameraCenter));

  const acceptedTextRects: IOSV3CollisionRect[] = [];
  let assignedText = 0;
  let assignedFull = 0;

  for (let index = 0; index < textCandidates.length; index += 1) {
    const candidate = textCandidates[index];
    const preferredVariant = resolvePreferredVariant({
      candidate,
      assignedText,
      assignedFull,
      maxText: safeMaxText,
      maxFull: safeMaxFull,
    });
    if (preferredVariant === "compact") {
      continue;
    }

    const screenPoint = screenPointById.get(candidate.id);
    if (!screenPoint) {
      continue;
    }

    const textRect = buildSpriteRectFromLocal(
      screenPoint,
      resolveTextLocalRect(candidate, preferredVariant)
    );

    const blockedByRequired = requiredRects.some(
      (entry) => entry.ownerId !== candidate.id && rectsIntersect(textRect, entry.rect)
    );
    if (blockedByRequired) {
      continue;
    }

    const blockedByText = acceptedTextRects.some((rect) => rectsIntersect(textRect, rect));
    if (blockedByText) {
      continue;
    }

    variantByMarkerId.set(candidate.id, preferredVariant);
    acceptedTextRects.push(textRect);
    assignedText += 1;
    if (preferredVariant === "full") {
      assignedFull += 1;
    }
  }

  return { variantByMarkerId };
};

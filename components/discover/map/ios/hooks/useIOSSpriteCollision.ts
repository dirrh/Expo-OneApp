import { useMemo } from "react";
import type { IOSRenderItem } from "../types";
import { resolveIOSCompactSprite } from "../pipelines/iosSpriteRegistry";

type UseIOSSpriteCollisionParams = {
  items: IOSRenderItem[];
  zoom: number;
  cameraCenter: [number, number]; // [lng, lat]
  mapWidth: number; // UIKit points
  collisionW: number; // horizontal threshold in UIKit points
  collisionH: number; // vertical threshold in UIKit points
  enabled: boolean;
};

const boxesOverlap = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  w: number,
  h: number
) => Math.abs(ax - bx) < w && Math.abs(ay - by) < h;

export const useIOSSpriteCollision = ({
  items,
  zoom,
  cameraCenter,
  mapWidth,
  collisionW,
  collisionH,
  enabled,
}: UseIOSSpriteCollisionParams): IOSRenderItem[] =>
  useMemo(() => {
    if (!enabled || mapWidth <= 0) {
      return items;
    }

    // camera.ts uses longitudeDelta = 360 / 2^zoom (flat, not mercator) and
    // latitudeDelta = longitudeDelta * aspectRatio (also flat). This means
    // mapWidth UIKit points spans exactly (360 / 2^zoom) degrees in both
    // horizontal and vertical → scale = mapWidth * 2^zoom / 360 pt/deg.
    // No separate mercator correction needed; both axes use the same scale.
    const scale = (mapWidth * Math.pow(2, zoom)) / 360;

    const occupiedCenters: Array<{ cx: number; cy: number }> = [];

    return items.map((item) => {
      // Only single markers carry a text label – skip collision for all others.
      if (item.isPoolPlaceholder || item.kind !== "single") {
        return item;
      }

      const cx = (item.coordinate.longitude - cameraCenter[0]) * scale;
      const cy = -(item.coordinate.latitude - cameraCenter[1]) * scale;

      const collides = occupiedCenters.some((box) =>
        boxesOverlap(cx, cy, box.cx, box.cy, collisionW, collisionH)
      );

      occupiedCenters.push({ cx, cy });

      if (!collides) {
        return item;
      }

      // Collision: keep the marker visible but replace the full text sprite
      // with a compact text-free pin (badged icon, no category label).
      const compact = resolveIOSCompactSprite(item.markerData?.category ?? "");
      return { ...item, image: compact.image, anchor: compact.anchor };
    });
  }, [items, zoom, cameraCenter, mapWidth, collisionW, collisionH, enabled]);

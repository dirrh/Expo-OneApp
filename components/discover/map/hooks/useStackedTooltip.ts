import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { MapViewRef } from "../../../../lib/interfaces";
import { clampNumber } from "../../../../lib/maps/discoverMapUtils";
import { TOOLTIP_ROW_HEIGHT, TOOLTIP_WIDTH } from "../constants";
import type { MapLayoutSize, RenderMarker } from "../types";

type UseStackedTooltipParams = {
  cameraRef: MapViewRef;
  renderMarkers: RenderMarker[];
  mapLayoutSize: MapLayoutSize;
};

type UseStackedTooltipResult = {
  selectedStackedMarkerId: string | null;
  setSelectedStackedMarkerId: Dispatch<SetStateAction<string | null>>;
  selectedStackedMarker: RenderMarker | null;
  tooltipItems: NonNullable<RenderMarker["stackedItems"]>;
  stackedTooltipLayout: { left: number; top: number; width: number; height: number } | null;
  pendingStackedOpenRef: MutableRefObject<{
    id: string;
    timeout: ReturnType<typeof setTimeout> | null;
  } | null>;
  clearPendingStackedOpen: () => void;
  closeStackedTooltip: () => void;
  updateStackedTooltipPosition: (marker: RenderMarker | null) => Promise<void>;
};

export const useStackedTooltip = ({
  cameraRef,
  renderMarkers,
  mapLayoutSize,
}: UseStackedTooltipParams): UseStackedTooltipResult => {
  const [selectedStackedMarkerId, setSelectedStackedMarkerId] = useState<string | null>(
    null
  );
  const [stackedTooltipPoint, setStackedTooltipPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const pendingStackedOpenRef = useRef<{
    id: string;
    timeout: ReturnType<typeof setTimeout> | null;
  } | null>(null);

  const clearPendingStackedOpen = useCallback(() => {
    const pending = pendingStackedOpenRef.current;
    if (pending?.timeout) {
      clearTimeout(pending.timeout);
    }
    pendingStackedOpenRef.current = null;
  }, []);

  const selectedStackedMarker = useMemo(() => {
    if (!selectedStackedMarkerId) {
      return null;
    }
    return (
      renderMarkers.find(
        (marker) => marker.isStacked && marker.id === selectedStackedMarkerId
      ) ?? null
    );
  }, [renderMarkers, selectedStackedMarkerId]);

  const closeStackedTooltip = useCallback(() => {
    clearPendingStackedOpen();
    setSelectedStackedMarkerId(null);
    setStackedTooltipPoint(null);
  }, [clearPendingStackedOpen]);

  const projectionGenRef = useRef(0);

  const updateStackedTooltipPosition = useCallback(
    async (marker: RenderMarker | null) => {
      if (!marker?.isStacked) {
        setStackedTooltipPoint(null);
        return;
      }
      const mapView = cameraRef.current;
      if (!mapView) {
        return;
      }
      const generation = ++projectionGenRef.current;
      try {
        const point = await mapView.pointForCoordinate(marker.coordinate);
        if (projectionGenRef.current !== generation) {
          return;
        }
        if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
          return;
        }
        setStackedTooltipPoint({ x: point.x, y: point.y });
      } catch {
      }
    },
    [cameraRef]
  );

  useEffect(() => {
    if (!selectedStackedMarker) {
      setStackedTooltipPoint(null);
      return;
    }
    void updateStackedTooltipPosition(selectedStackedMarker);
  }, [selectedStackedMarker, updateStackedTooltipPosition]);

  useEffect(() => {
    if (!selectedStackedMarkerId) {
      return;
    }
    const stillVisible = renderMarkers.some(
      (marker) => marker.isStacked && marker.id === selectedStackedMarkerId
    );
    if (!stillVisible) {
      closeStackedTooltip();
    }
  }, [selectedStackedMarkerId, renderMarkers, closeStackedTooltip]);

  useEffect(() => {
    return () => {
      clearPendingStackedOpen();
    };
  }, [clearPendingStackedOpen]);

  const tooltipItems = selectedStackedMarker?.stackedItems ?? [];
  const stackedTooltipLayout = useMemo(() => {
    if (!stackedTooltipPoint) {
      return null;
    }
    const tooltipWidth = Math.min(
      TOOLTIP_WIDTH,
      Math.max(156, mapLayoutSize.width - 16)
    );
    const estimatedHeight = Math.max(
      TOOLTIP_ROW_HEIGHT,
      tooltipItems.length * TOOLTIP_ROW_HEIGHT
    );
    const left = clampNumber(
      stackedTooltipPoint.x - tooltipWidth / 2,
      8,
      Math.max(8, mapLayoutSize.width - tooltipWidth - 8)
    );
    const top = clampNumber(
      stackedTooltipPoint.y + 10,
      8,
      Math.max(8, mapLayoutSize.height - estimatedHeight - 8)
    );

    return { left, top, width: tooltipWidth, height: estimatedHeight };
  }, [mapLayoutSize.height, mapLayoutSize.width, stackedTooltipPoint, tooltipItems.length]);

  return {
    selectedStackedMarkerId,
    setSelectedStackedMarkerId,
    selectedStackedMarker,
    tooltipItems,
    stackedTooltipLayout,
    pendingStackedOpenRef,
    clearPendingStackedOpen,
    closeStackedTooltip,
    updateStackedTooltipPosition,
  };
};

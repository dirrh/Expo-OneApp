import React, { useMemo } from "react";
import { Text, View } from "react-native";
import type { LabelPlacement } from "../../../../lib/maps/labelSelection";
import { localStyles } from "../styles";

type InlineLabelLayerProps = {
  showSingleLayer: boolean;
  inlineLabelPlacements: LabelPlacement[];
  useInlineLabelOverlay: boolean;
  inlineTextRenderedByMarkerIdSet: Set<string>;
};

export function InlineLabelLayer({
  showSingleLayer,
  inlineLabelPlacements,
  useInlineLabelOverlay,
  inlineTextRenderedByMarkerIdSet,
}: InlineLabelLayerProps) {
  const inlineLabelOverlayElements = useMemo(() => {
    if (!showSingleLayer || inlineLabelPlacements.length === 0) {
      return [] as React.ReactNode[];
    }

    const placementsToRender = useInlineLabelOverlay
      ? inlineLabelPlacements
      : inlineLabelPlacements.filter(
          (placement) => !inlineTextRenderedByMarkerIdSet.has(placement.id)
        );
    if (placementsToRender.length === 0) {
      return [] as React.ReactNode[];
    }

    return placementsToRender.map((placement) => (
      <View
        key={`inline-label:${placement.id}`}
        pointerEvents="none"
        style={[
          localStyles.inlineLabelWrap,
          {
            left: placement.left,
            top: placement.top,
            width: placement.width,
            height: placement.height,
          },
        ]}
      >
        <Text style={localStyles.inlineLabelText} numberOfLines={1}>
          {placement.title}
        </Text>
      </View>
    ));
  }, [
    inlineLabelPlacements,
    inlineTextRenderedByMarkerIdSet,
    showSingleLayer,
    useInlineLabelOverlay,
  ]);

  if (inlineLabelOverlayElements.length === 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={localStyles.inlineLabelLayer}>
      {inlineLabelOverlayElements}
    </View>
  );
}

import React from "react";
import { Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getTooltipCategoryIcon } from "../../../../lib/maps/discoverMapUtils";
import type { DiscoverMapMarker } from "../../../../lib/interfaces";
import type { RenderMarker } from "../types";
import { localStyles } from "../styles";

type StackedTooltipLayerProps = {
  selectedStackedMarker: RenderMarker | null;
  stackedTooltipLayout: { left: number; top: number; width: number; height: number } | null;
  tooltipItems: DiscoverMapMarker[];
  closeStackedTooltip: () => void;
  onMarkerPress?: (id: string) => void;
};

export function StackedTooltipLayer({
  selectedStackedMarker,
  stackedTooltipLayout,
  tooltipItems,
  closeStackedTooltip,
  onMarkerPress,
}: StackedTooltipLayerProps) {
  if (!selectedStackedMarker || !stackedTooltipLayout) {
    return null;
  }

  return (
    <TouchableWithoutFeedback onPress={closeStackedTooltip}>
      <View style={localStyles.tooltipBackdrop}>
        <TouchableWithoutFeedback onPress={() => undefined}>
          <View
            style={[
              localStyles.tooltipCard,
              {
                left: stackedTooltipLayout.left,
                top: stackedTooltipLayout.top,
                width: stackedTooltipLayout.width,
                height: stackedTooltipLayout.height,
              },
            ]}
          >
            {tooltipItems.map((item, index) => {
              const title = item.title ?? item.id;
              const ratingText = Number.isFinite(item.rating)
                ? item.rating.toFixed(1)
                : item.ratingFormatted ?? "-";
              return (
                <TouchableOpacity
                  key={`${selectedStackedMarker.id}:${item.id}`}
                  activeOpacity={0.8}
                  style={[
                    localStyles.tooltipRow,
                    index < tooltipItems.length - 1 && localStyles.tooltipRowDivider,
                  ]}
                  onPress={() => {
                    closeStackedTooltip();
                    onMarkerPress?.(item.id);
                  }}
                >
                  <View style={localStyles.tooltipTitleWrap}>
                    <View style={localStyles.tooltipCategoryIconWrap}>
                      <Ionicons
                        name={getTooltipCategoryIcon(item.category)}
                        size={12}
                        color="#000000"
                      />
                    </View>
                    <Text style={localStyles.tooltipTitle} numberOfLines={1}>
                      {title}
                    </Text>
                  </View>
                  <View style={localStyles.tooltipRatingWrap}>
                    <Ionicons
                      name="star-outline"
                      size={12}
                      color="rgba(0, 0, 0, 0.5)"
                    />
                    <Text style={localStyles.tooltipRating}>{ratingText}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  );
}

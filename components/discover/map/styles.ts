import { StyleSheet } from "react-native";
import { TOOLTIP_ROW_HEIGHT } from "./constants";

export const localStyles = StyleSheet.create({
  iosMarkerImageWrap: {
    position: "relative",
    alignItems: "center",
    overflow: "visible",
  },
  iosMarkerImage: {
    position: "absolute",
  },
  iosMarkerLayerVisible: {
    opacity: 1,
  },
  iosMarkerLayerHidden: {
    opacity: 0,
  },
  inlineLabelLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 12,
  },
  inlineLabelWrap: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  inlineLabelText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    color: "#0B0F19",
    textAlign: "center",
    includeFontPadding: false,
    textShadowColor: "rgba(255, 255, 255, 0.92)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  tooltipBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  tooltipCard: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  tooltipRow: {
    height: TOOLTIP_ROW_HEIGHT,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
  },
  tooltipRowDivider: {
    borderBottomWidth: 0.8,
    borderBottomColor: "#E4E4E7",
  },
  tooltipTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    marginRight: 10,
    gap: 8,
  },
  tooltipCategoryIconWrap: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tooltipTitle: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    color: "#000000",
    flexShrink: 1,
  },
  tooltipRatingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  tooltipRating: {
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 14,
    color: "rgba(0, 0, 0, 0.5)",
  },
});

type HasIOSV3MeaningfulCameraMotionParams = {
  previousCenter: [number, number];
  previousZoom: number;
  nextCenter: [number, number];
  nextZoom: number;
  centerEpsilon?: number;
  zoomEpsilon?: number;
};

export const IOS_V3_CAMERA_MOTION_CENTER_EPSILON = 0.000001;
export const IOS_V3_CAMERA_MOTION_ZOOM_EPSILON = 0.0001;

export const hasIOSV3MeaningfulCameraMotion = ({
  previousCenter,
  previousZoom,
  nextCenter,
  nextZoom,
  centerEpsilon = IOS_V3_CAMERA_MOTION_CENTER_EPSILON,
  zoomEpsilon = IOS_V3_CAMERA_MOTION_ZOOM_EPSILON,
}: HasIOSV3MeaningfulCameraMotionParams) => {
  const centerDelta = Math.hypot(
    nextCenter[0] - previousCenter[0],
    nextCenter[1] - previousCenter[1]
  );
  const zoomDelta = Math.abs(nextZoom - previousZoom);
  return centerDelta > centerEpsilon || zoomDelta > zoomEpsilon;
};

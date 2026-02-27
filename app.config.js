import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  // SDK 54 still allows opting out of New Architecture; used as iOS crash fallback for react-native-maps.
  newArchEnabled: false,
  runtimeVersion: {
    policy: 'appVersion',
  },
  plugins: [
    ...(config.plugins ?? []),
    './plugins/withAndroidXFix',
    './plugins/withGradleProperties',
    './plugins/withReanimatedWorkletsPrefabFix',
    [
      "expo-build-properties",
      {
        ios: {
          deploymentTarget: "18.0",
        },
      },
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Allow $(PRODUCT_NAME) to access your location.",
      },
    ],
    [
      "expo-camera",
      {
        cameraPermission: "Allow $(PRODUCT_NAME) to access your camera.",
        recordAudioAndroid: false,
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "Allow $(PRODUCT_NAME) to access your photos.",
      },
    ],
    "expo-video",
    "expo-localization",
    "expo-asset",
  ],
  android: {
    ...config.android,
    // Reanimated + Worklets in SDK 54 require New Architecture on Android builds.
    newArchEnabled: true,
    config: {
      ...config.android?.config,
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },
  },
  web: {
    ...config.web,
    bundler: 'metro',
    // Set viewport to iPhone size
    meta: {
      viewport: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no',
    },
  },
  extra: {
    ...config.extra,
  },
});

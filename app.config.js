import 'dotenv/config';

export default ({ config }) => ({
  ...config,
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
    "expo-localization",
    "expo-asset",
  ],
  android: {
    ...config.android,
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

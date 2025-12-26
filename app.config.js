import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    './plugins/withMapboxMaven',
    "expo-localization",
  ],
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
    MAPBOX_TOKEN: process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
  },
});

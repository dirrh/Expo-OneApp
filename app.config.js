import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    './plugins/withMapboxMaven',
    "expo-localization",
  ],
  extra: {
    ...config.extra,
    MAPBOX_TOKEN: process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
  },
});

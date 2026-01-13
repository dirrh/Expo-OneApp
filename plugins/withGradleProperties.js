const { withGradleProperties } = require("@expo/config-plugins");

/**
 * Plugin to ensure AndroidX and Jetifier are enabled in gradle.properties.
 * This helps resolve conflicts between AndroidX and old Android Support libraries.
 */
module.exports = function withAndroidXGradleProperties(config) {
  return withGradleProperties(config, (config) => {
    const properties = config.modResults;

    // Ensure AndroidX is enabled
    const androidXProperty = properties.find(
      (p) => p.type === "property" && p.key === "android.useAndroidX"
    );
    if (!androidXProperty) {
      properties.push({
        type: "property",
        key: "android.useAndroidX",
        value: "true",
      });
    }

    // Ensure Jetifier is enabled to convert Support library dependencies to AndroidX
    const jetifierProperty = properties.find(
      (p) => p.type === "property" && p.key === "android.enableJetifier"
    );
    if (!jetifierProperty) {
      properties.push({
        type: "property",
        key: "android.enableJetifier",
        value: "true",
      });
    }

    return config;
  });
};

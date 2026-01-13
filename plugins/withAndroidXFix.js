const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Plugin to fix AndroidX/Support library manifest merger conflicts.
 * Adds tools:replace="android:appComponentFactory" to the application element
 * and sets the AndroidX appComponentFactory value.
 */
module.exports = function withAndroidXFix(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;

    // Ensure the tools namespace is declared
    if (!androidManifest.manifest.$["xmlns:tools"]) {
      androidManifest.manifest.$["xmlns:tools"] =
        "http://schemas.android.com/tools";
    }

    // Get the application element
    const application = androidManifest.manifest.application?.[0];
    if (application) {
      // Set the AndroidX appComponentFactory value
      application.$["android:appComponentFactory"] =
        "androidx.core.app.CoreComponentFactory";
      // Add tools:replace to override any conflicting values from dependencies
      application.$["tools:replace"] = "android:appComponentFactory";
    }

    return config;
  });
};

const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Hardens AndroidManifest for Google Play Store and OWASP MASVS-STORAGE compliance:
 * - Disables ADB / cloud backup extraction of local AsyncStorage & app databases (`android:allowBackup="false"`).
 */
function withPlayStoreSecurity(config) {
  return withAndroidManifest(config, (modConfig) => {
    const application = modConfig.modResults?.manifest?.application?.[0];
    if (application && application.$) {
      application.$['android:allowBackup'] = 'false';
    }
    return modConfig;
  });
}

module.exports = withPlayStoreSecurity;

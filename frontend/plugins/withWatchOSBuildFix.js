// withWatchOSBuildFix.js
// This plugin is intentionally a NO-OP during prebuild.
// The actual fix is applied by: node scripts/fix-xcode-cycle.js
// which must run AFTER pod install completes.
//
// Why? CocoaPods post_integrate hook crashes on Ruby 4.0 (macOS Sequoia+).
// The Node.js script modifies .pbxproj directly — no Ruby dependency.

const { withDangerousMod } = require('@expo/config-plugins');

module.exports = function withWatchOSBuildFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      console.log('[withWatchOSBuildFix] Skipping Podfile hook (Ruby 4.0 incompatible)');
      console.log('[withWatchOSBuildFix] Run "node scripts/fix-xcode-cycle.js" after pod install');
      return config;
    },
  ]);
};

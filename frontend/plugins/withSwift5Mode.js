// Expo Config Plugin to disable Swift 6 strict concurrency checking
// This fixes "main actor-isolated" errors with Xcode 16+

const { withXcodeProject } = require('@expo/config-plugins');

const withSwift5Mode = (config) => {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    
    // Get all build configurations
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();
    
    for (const key in configurations) {
      if (typeof configurations[key] === 'object' && configurations[key].buildSettings) {
        const buildSettings = configurations[key].buildSettings;
        
        // Set Swift language version to 5 to avoid Swift 6 strict concurrency
        buildSettings.SWIFT_VERSION = '5.0';
        
        // Disable strict concurrency checking
        buildSettings.SWIFT_STRICT_CONCURRENCY = 'minimal';
        
        // Use complete concurrency checking but as warnings, not errors
        // buildSettings.SWIFT_UPCOMING_FEATURE_ISOLATED_DEFAULT_VALUES = 'NO';
        // buildSettings.SWIFT_UPCOMING_FEATURE_GLOBAL_CONCURRENCY = 'NO';
      }
    }
    
    return config;
  });
};

module.exports = withSwift5Mode;

// Custom Config Plugin for Google Cast - iOS additional settings
const { withInfoPlist, withAppDelegate } = require('@expo/config-plugins');

// Add Bonjour services and local network usage description for iOS
const withGoogleCastInfoPlist = (config) => {
  return withInfoPlist(config, (config) => {
    // Add Bonjour services for Cast device discovery
    config.modResults.NSBonjourServices = [
      '_googlecast._tcp',
      '_CC1AD845._googlecast._tcp', // Default receiver
    ];
    
    // Local network usage description
    if (!config.modResults.NSLocalNetworkUsageDescription) {
      config.modResults.NSLocalNetworkUsageDescription = 
        'MegaRadio uses the local network to discover Cast-enabled devices on your WiFi network.';
    }
    
    return config;
  });
};

// Initialize Google Cast in AppDelegate
const withGoogleCastAppDelegate = (config) => {
  return withAppDelegate(config, (config) => {
    const contents = config.modResults.contents;
    
    // Check if already configured
    if (contents.includes('GCKCastContext')) {
      return config;
    }
    
    // Add import
    const importStatement = '#import <GoogleCast/GoogleCast.h>';
    if (!contents.includes(importStatement)) {
      config.modResults.contents = contents.replace(
        '#import "AppDelegate.h"',
        `#import "AppDelegate.h"\n${importStatement}`
      );
    }
    
    // Add initialization code in didFinishLaunchingWithOptions
    const initCode = `
  // Initialize Google Cast
  NSString *receiverAppID = @"CC1AD845";
  GCKDiscoveryCriteria *criteria = [[GCKDiscoveryCriteria alloc] initWithApplicationID:receiverAppID];
  GCKCastOptions *options = [[GCKCastOptions alloc] initWithDiscoveryCriteria:criteria];
  options.physicalVolumeButtonsWillControlDeviceVolume = YES;
  [GCKCastContext setSharedInstanceWithOptions:options];
`;
    
    // Find the right place to insert (after [super application...)
    const didFinishMatch = config.modResults.contents.match(
      /\[super application:application didFinishLaunchingWithOptions:launchOptions\];/
    );
    
    if (didFinishMatch) {
      config.modResults.contents = config.modResults.contents.replace(
        didFinishMatch[0],
        `${didFinishMatch[0]}\n${initCode}`
      );
    }
    
    return config;
  });
};

module.exports = (config) => {
  config = withGoogleCastInfoPlist(config);
  // Note: AppDelegate modification is handled by react-native-google-cast plugin
  // config = withGoogleCastAppDelegate(config);
  return config;
};

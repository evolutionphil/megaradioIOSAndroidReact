// Expo Config Plugin for Android Auto Support
// This adds required AndroidManifest.xml entries for Android Auto media browsing

const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Add Android Auto meta-data and intent filters to AndroidManifest.xml
const withAndroidAutoManifest = (config) => {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    
    // Get the application element
    const application = manifest.manifest.application[0];
    
    // Ensure meta-data array exists
    if (!application['meta-data']) {
      application['meta-data'] = [];
    }
    
    // Add Android Auto media app declaration
    // This tells Android Auto that this app provides media content
    const autoMetaData = {
      $: {
        'android:name': 'com.google.android.gms.car.application',
        'android:resource': '@xml/automotive_app_desc',
      },
    };
    
    // Check if already exists
    const existingMeta = application['meta-data'].find(
      (m) => m.$['android:name'] === 'com.google.android.gms.car.application'
    );
    
    if (!existingMeta) {
      application['meta-data'].push(autoMetaData);
      console.log('[withAndroidAuto] Added Android Auto meta-data');
    }
    
    // Find the MusicService (from react-native-track-player) and add intent filter
    if (application.service) {
      for (const service of application.service) {
        const serviceName = service.$['android:name'];
        
        // Look for TrackPlayer's MusicService
        if (serviceName && serviceName.includes('MusicService')) {
          console.log('[withAndroidAuto] Found MusicService:', serviceName);
          
          // Ensure intent-filter array exists
          if (!service['intent-filter']) {
            service['intent-filter'] = [];
          }
          
          // Add media browser service intent filter for Android Auto
          const mediaBrowserIntentFilter = {
            action: [
              { $: { 'android:name': 'android.media.browse.MediaBrowserService' } },
            ],
          };
          
          // Check if already exists
          const hasMediaBrowser = service['intent-filter'].some(
            (filter) => filter.action && filter.action.some(
              (action) => action.$['android:name'] === 'android.media.browse.MediaBrowserService'
            )
          );
          
          if (!hasMediaBrowser) {
            service['intent-filter'].push(mediaBrowserIntentFilter);
            console.log('[withAndroidAuto] Added MediaBrowserService intent filter');
          }
        }
      }
    }
    
    return config;
  });
};

// Create the automotive_app_desc.xml resource file
const withAndroidAutoResources = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const xmlDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'xml');
      const xmlFile = path.join(xmlDir, 'automotive_app_desc.xml');
      
      // Create xml directory if it doesn't exist
      if (!fs.existsSync(xmlDir)) {
        fs.mkdirSync(xmlDir, { recursive: true });
        console.log('[withAndroidAuto] Created xml resource directory');
      }
      
      // Create automotive_app_desc.xml content
      const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<automotiveApp>
    <!-- Declare this app as a media app for Android Auto -->
    <uses name="media" />
</automotiveApp>
`;
      
      fs.writeFileSync(xmlFile, xmlContent);
      console.log('[withAndroidAuto] Created automotive_app_desc.xml');
      
      return config;
    },
  ]);
};

// Main plugin export
module.exports = function withAndroidAuto(config) {
  console.log('[withAndroidAuto] Applying Android Auto configuration...');
  
  // Apply manifest modifications
  config = withAndroidAutoManifest(config);
  
  // Apply resource file creation
  config = withAndroidAutoResources(config);
  
  return config;
};

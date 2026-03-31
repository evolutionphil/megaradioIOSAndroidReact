// Expo Config Plugin: Ensures TrackPlayer MusicService has correct
// foregroundServiceType="mediaPlayback" for Android 15+ compatibility.
// Also adds FOREGROUND_SERVICE_MEDIA_PLAYBACK permission.

const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withTrackPlayerServiceFix(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application[0];

    // Ensure tools namespace
    if (!manifest.manifest.$['xmlns:tools']) {
      manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // Ensure FOREGROUND_SERVICE_MEDIA_PLAYBACK permission
    if (!manifest.manifest['uses-permission']) {
      manifest.manifest['uses-permission'] = [];
    }
    
    const fgPermission = manifest.manifest['uses-permission'].find(
      (p) => p.$?.['android:name'] === 'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK'
    );
    if (!fgPermission) {
      manifest.manifest['uses-permission'].push({
        $: { 'android:name': 'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK' },
      });
      console.log('[withTrackPlayerServiceFix] Added FOREGROUND_SERVICE_MEDIA_PLAYBACK permission');
    }

    // Add/Override MusicService with foregroundServiceType
    if (!application.service) {
      application.service = [];
    }

    const existingService = application.service.find(
      (s) => s.$?.['android:name'] === 'com.doublesymmetry.trackplayer.service.MusicService'
    );

    const musicServiceConfig = {
      $: {
        'android:name': 'com.doublesymmetry.trackplayer.service.MusicService',
        'android:exported': 'true',
        'android:foregroundServiceType': 'mediaPlayback',
        'tools:replace': 'android:exported,android:foregroundServiceType',
      },
      'intent-filter': [
        {
          action: [
            { $: { 'android:name': 'android.media.browse.MediaBrowserService' } },
          ],
        },
      ],
    };

    if (existingService) {
      // Override existing service entry
      const idx = application.service.indexOf(existingService);
      application.service[idx] = musicServiceConfig;
    } else {
      application.service.push(musicServiceConfig);
    }

    console.log('[withTrackPlayerServiceFix] MusicService configured with foregroundServiceType=mediaPlayback');
    return config;
  });
};

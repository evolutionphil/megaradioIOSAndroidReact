// Audio Service Factory
// Uses react-native-track-player on native builds
// Falls back to expo-audio on web/development

import { Platform } from 'react-native';

// Check if we're in a native environment where RNTP is available
let isNativeWithRNTP = false;

// Try to detect if RNTP is properly linked (only works in native builds)
try {
  if (Platform.OS !== 'web') {
    // This will throw if RNTP is not properly linked
    const RNTP = require('react-native-track-player');
    if (RNTP && typeof RNTP.setupPlayer === 'function') {
      isNativeWithRNTP = true;
      console.log('[AudioService] react-native-track-player is available');
    }
  }
} catch (e) {
  console.log('[AudioService] react-native-track-player not available, using expo-audio');
  isNativeWithRNTP = false;
}

export const useTrackPlayer = isNativeWithRNTP;

// Export the appropriate service based on environment
export const getAudioService = () => {
  if (isNativeWithRNTP) {
    return require('./trackPlayerService').default;
  }
  // For expo-audio, we don't have a separate service - it's handled by AudioProvider
  return null;
};

export default {
  useTrackPlayer,
  getAudioService,
};

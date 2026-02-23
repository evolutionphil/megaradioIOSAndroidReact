// App entry point
// FIRST: Send remote log immediately to track app startup
import { sendLog } from './src/services/remoteLog';
sendLog('APP_ENTRY_POINT');

// IMPORTANT: Import gesture handler FIRST - required for React Navigation
import 'react-native-gesture-handler';
sendLog('GESTURE_HANDLER_IMPORTED');

import { Platform } from 'react-native';
import 'expo-router/entry';
sendLog('EXPO_ROUTER_IMPORTED');

// Register the playback service for background audio (native only)
if (Platform.OS !== 'web') {
  try {
    sendLog('TRACK_PLAYER_REGISTERING');
    const TrackPlayer = require('react-native-track-player').default;
    TrackPlayer.registerPlaybackService(() => require('./service'));
    sendLog('TRACK_PLAYER_REGISTERED');
    console.log('[App] Track Player service registered for', Platform.OS);
  } catch (error) {
    sendLog('TRACK_PLAYER_ERROR', { error: String(error) });
    console.error('[App] Failed to register Track Player:', error);
  }
} else {
  sendLog('WEB_PLATFORM');
  console.log('[App] Web platform - Track Player not available');
}

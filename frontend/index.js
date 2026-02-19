// App entry point with Track Player service registration
import { Platform } from 'react-native';
import 'expo-router/entry';

// Register the playback service for background audio (native only)
// This MUST be done at the top level before any component renders
if (Platform.OS !== 'web') {
  // Dynamic import to avoid web bundling issues
  const TrackPlayer = require('react-native-track-player').default;
  TrackPlayer.registerPlaybackService(() => require('./service'));
  console.log('[App] Track Player service registered for', Platform.OS);
} else {
  console.log('[App] Web platform - Track Player not available');
}

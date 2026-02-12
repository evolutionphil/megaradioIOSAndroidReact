// Entry point for TrackPlayer registration
// This file registers the playback service before the app starts
import { Platform, AppRegistry } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { playbackService } from './src/services/trackPlayerService';

// Register the playback service (native only)
if (Platform.OS !== 'web') {
  TrackPlayer.registerPlaybackService(() => playbackService);
}

// Import and register the Expo Router app
import 'expo-router/entry';

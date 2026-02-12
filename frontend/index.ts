// Entry point for TrackPlayer registration
// This file registers the playback service before the app starts
import { Platform } from 'react-native';

// Only register TrackPlayer on native platforms
// Web uses expo-av fallback in useAudioPlayer hook
if (Platform.OS !== 'web') {
  // Dynamic import to avoid loading TrackPlayer on web
  const TrackPlayer = require('react-native-track-player').default;
  const { playbackService } = require('./src/services/trackPlayerService');
  TrackPlayer.registerPlaybackService(() => playbackService);
}

// Import and register the Expo Router app
import 'expo-router/entry';

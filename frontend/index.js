// App entry point with Track Player service registration
import 'expo-router/entry';
import TrackPlayer from 'react-native-track-player';

// Register the playback service for background audio
// This MUST be done at the top level before any component renders
TrackPlayer.registerPlaybackService(() => require('./service'));

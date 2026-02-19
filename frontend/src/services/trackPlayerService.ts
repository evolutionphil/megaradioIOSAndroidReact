// TrackPlayerService - React Native Track Player setup and configuration
// Handles iOS Control Center, Lock Screen, and background audio playback

import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  RepeatMode,
  Event,
  State,
} from 'react-native-track-player';
import { Platform } from 'react-native';

let isSetup = false;

// Setup Track Player
export async function setupPlayer(): Promise<boolean> {
  if (isSetup) {
    console.log('[TrackPlayer] Already setup');
    return true;
  }

  try {
    console.log('[TrackPlayer] Setting up player...');
    
    await TrackPlayer.setupPlayer({
      // iOS specific options
      iosCategory: 'playback', // IMPORTANT: This makes other apps stop
      iosCategoryMode: 'default',
      iosCategoryOptions: [], // No mixWithOthers - we want exclusive playback
      
      // Buffering
      minBuffer: 15,
      maxBuffer: 50,
      playBuffer: 3,
      backBuffer: 0,
      
      // Wait for buffer
      waitForBuffer: true,
    });

    // Configure player options
    await TrackPlayer.updateOptions({
      // Android specific
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
        alwaysPauseOnInterruption: true,
      },
      
      // Capabilities shown in Control Center / Lock Screen
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
      ],
      
      // Compact capabilities (for small notifications)
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
      ],
      
      // Notification config
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
      ],
      
      // Icon for notification
      icon: Platform.OS === 'android' 
        ? require('../../assets/images/notification-icon.png') 
        : undefined,
      
      // Progress update interval (ms)
      progressUpdateEventInterval: 1,
    });

    // Set repeat mode to off (for live radio)
    await TrackPlayer.setRepeatMode(RepeatMode.Off);

    isSetup = true;
    console.log('[TrackPlayer] Setup complete');
    return true;
  } catch (error) {
    console.error('[TrackPlayer] Setup error:', error);
    return false;
  }
}

// Add radio station to queue
export async function addRadioStation(
  id: string,
  url: string,
  title: string,
  artist: string,
  artwork?: string
): Promise<void> {
  try {
    // Clear existing queue
    await TrackPlayer.reset();
    
    // Add the radio station
    await TrackPlayer.add({
      id,
      url,
      title,
      artist,
      artwork: artwork || 'https://themegaradio.com/logo.png',
      isLiveStream: true,
      duration: 0, // Live stream has no duration
    });
    
    console.log('[TrackPlayer] Added station:', title);
  } catch (error) {
    console.error('[TrackPlayer] Error adding station:', error);
    throw error;
  }
}

// Update now playing metadata (for song changes)
export async function updateNowPlaying(
  title: string,
  artist: string,
  artwork?: string
): Promise<void> {
  try {
    const queue = await TrackPlayer.getQueue();
    if (queue.length > 0) {
      await TrackPlayer.updateMetadataForTrack(0, {
        title,
        artist,
        artwork: artwork || queue[0].artwork,
      });
      console.log('[TrackPlayer] Updated metadata:', title, '-', artist);
    }
  } catch (error) {
    console.error('[TrackPlayer] Error updating metadata:', error);
  }
}

// Play
export async function play(): Promise<void> {
  try {
    await TrackPlayer.play();
    console.log('[TrackPlayer] Playing');
  } catch (error) {
    console.error('[TrackPlayer] Play error:', error);
  }
}

// Pause
export async function pause(): Promise<void> {
  try {
    await TrackPlayer.pause();
    console.log('[TrackPlayer] Paused');
  } catch (error) {
    console.error('[TrackPlayer] Pause error:', error);
  }
}

// Stop
export async function stop(): Promise<void> {
  try {
    await TrackPlayer.stop();
    await TrackPlayer.reset();
    console.log('[TrackPlayer] Stopped');
  } catch (error) {
    console.error('[TrackPlayer] Stop error:', error);
  }
}

// Get current state
export async function getState(): Promise<State> {
  return await TrackPlayer.getPlaybackState().then(state => state.state);
}

// Check if playing
export async function isPlaying(): Promise<boolean> {
  const state = await getState();
  return state === State.Playing;
}

// Cleanup
export async function cleanup(): Promise<void> {
  try {
    await TrackPlayer.reset();
    console.log('[TrackPlayer] Cleanup done');
  } catch (error) {
    console.error('[TrackPlayer] Cleanup error:', error);
  }
}

export default {
  setupPlayer,
  addRadioStation,
  updateNowPlaying,
  play,
  pause,
  stop,
  getState,
  isPlaying,
  cleanup,
};

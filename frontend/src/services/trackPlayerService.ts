// Track Player Service - Playback Service and Event Handlers
import TrackPlayer, {
  Event,
  State,
  AppKilledPlaybackBehavior,
  Capability,
  RepeatMode,
} from 'react-native-track-player';
import { Platform } from 'react-native';

// Playback service that runs in background
export const playbackService = async function () {
  // Handle remote play event (from lock screen / notification)
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    console.log('[TrackPlayer] RemotePlay event');
    await TrackPlayer.play();
  });

  // Handle remote pause event
  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    console.log('[TrackPlayer] RemotePause event');
    await TrackPlayer.pause();
  });

  // Handle skip to next
  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    console.log('[TrackPlayer] RemoteNext event');
    await TrackPlayer.skipToNext();
  });

  // Handle skip to previous
  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    console.log('[TrackPlayer] RemotePrevious event');
    await TrackPlayer.skipToPrevious();
  });

  // Handle stop event
  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    console.log('[TrackPlayer] RemoteStop event');
    await TrackPlayer.stop();
  });

  // Handle playback errors
  TrackPlayer.addEventListener(Event.PlaybackError, async (event) => {
    console.error('[TrackPlayer] Playback error:', event);
  });

  // Handle playback state changes
  TrackPlayer.addEventListener(Event.PlaybackState, async (event) => {
    console.log('[TrackPlayer] Playback state:', event.state);
  });

  // Handle track changes
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
    console.log('[TrackPlayer] Active track changed:', event.track?.title);
  });
};

// Initialize and setup TrackPlayer
export const setupTrackPlayer = async (): Promise<boolean> => {
  let isSetup = false;

  try {
    // Check if player is already initialized
    await TrackPlayer.getActiveTrack();
    isSetup = true;
    console.log('[TrackPlayer] Already initialized');
  } catch {
    // Player not initialized, set it up
    try {
      await TrackPlayer.setupPlayer({
        maxCacheSize: 1024 * 50, // 50 MB cache
      });

      // Configure player capabilities
      await TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
          alwaysPauseOnInterruption: true,
        },
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
        ],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
        ],
        progressUpdateEventInterval: 2,
      });

      isSetup = true;
      console.log('[TrackPlayer] Setup complete');
    } catch (error) {
      console.error('[TrackPlayer] Setup failed:', error);
      throw error;
    }
  }

  return isSetup;
};

// Add a radio station as a track
export const addRadioTrack = async (
  id: string,
  url: string,
  title: string,
  artist: string,
  artwork?: string
): Promise<void> => {
  await TrackPlayer.add({
    id,
    url,
    title,
    artist,
    artwork: artwork || undefined,
    isLiveStream: true,
  });
};

// Play a station (clear queue and play)
export const playRadioStation = async (
  id: string,
  url: string,
  title: string,
  artist: string,
  artwork?: string
): Promise<void> => {
  try {
    // Reset queue
    await TrackPlayer.reset();

    // Add the station
    await addRadioTrack(id, url, title, artist, artwork);

    // Start playback
    await TrackPlayer.play();
  } catch (error) {
    console.error('[TrackPlayer] Failed to play station:', error);
    throw error;
  }
};

// Get current playback state
export const getPlaybackState = async (): Promise<State> => {
  const state = await TrackPlayer.getPlaybackState();
  return state.state;
};

// Check if player is playing
export const isPlaying = async (): Promise<boolean> => {
  const state = await getPlaybackState();
  return state === State.Playing;
};

// Toggle play/pause
export const togglePlayPause = async (): Promise<void> => {
  const state = await getPlaybackState();
  if (state === State.Playing) {
    await TrackPlayer.pause();
  } else {
    await TrackPlayer.play();
  }
};

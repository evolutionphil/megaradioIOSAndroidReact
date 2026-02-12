// Custom hook for TrackPlayer integration with Zustand store
import { useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import TrackPlayer, {
  usePlaybackState,
  useActiveTrack,
  State,
  Event,
} from 'react-native-track-player';
import { usePlayerStore, PlaybackState } from '../store/playerStore';
import { setupTrackPlayer, playRadioStation } from '../services/trackPlayerService';
import stationService from '../services/stationService';
import userService from '../services/userService';
import type { Station } from '../types';

// Check if we're on web (TrackPlayer doesn't work on web)
const isWeb = Platform.OS === 'web';

// Map TrackPlayer state to our PlaybackState
const mapState = (state: State): PlaybackState => {
  switch (state) {
    case State.Playing:
      return 'playing';
    case State.Paused:
      return 'paused';
    case State.Buffering:
    case State.Loading:
      return 'buffering';
    case State.Ready:
      return 'paused';
    case State.Error:
      return 'error';
    default:
      return 'idle';
  }
};

export const useTrackPlayer = () => {
  const listeningStartRef = useRef<Date | null>(null);
  const isInitializedRef = useRef(false);

  const {
    currentStation,
    playbackState,
    setCurrentStation,
    setPlaybackState,
    setStreamUrl,
    setNowPlaying,
    setError,
    setMiniPlayerVisible,
  } = usePlayerStore();

  // Only use TrackPlayer hooks on native platforms
  const trackPlayerState = isWeb ? { state: State.None } : usePlaybackState();
  const activeTrack = isWeb ? null : useActiveTrack();

  // Sync TrackPlayer state with our store (native only)
  useEffect(() => {
    if (isWeb) return;
    
    const mappedState = mapState(trackPlayerState.state);
    if (mappedState !== playbackState) {
      setPlaybackState(mappedState);
    }
  }, [trackPlayerState.state, playbackState, setPlaybackState]);

  // Initialize TrackPlayer on mount (native only)
  useEffect(() => {
    if (isWeb || isInitializedRef.current) return;

    const init = async () => {
      try {
        await setupTrackPlayer();
        isInitializedRef.current = true;
        console.log('[useTrackPlayer] Initialized');
      } catch (error) {
        console.error('[useTrackPlayer] Init failed:', error);
      }
    };

    init();
  }, []);

  // Resolve stream URL
  const resolveStreamUrl = useCallback(async (station: Station): Promise<string | null> => {
    try {
      const streamData = await stationService.resolveStream(station.url);

      if (streamData.candidates && streamData.candidates.length > 0) {
        let streamUrl = streamData.candidates[0];

        // If HTTP stream, use proxy
        if (streamUrl.startsWith('http://')) {
          streamUrl = stationService.getProxyUrl(streamUrl);
        }

        return streamUrl;
      }

      // Fallback to original URL
      return station.url_resolved || station.url;
    } catch (error) {
      console.error('[useTrackPlayer] Failed to resolve stream:', error);
      return station.url_resolved || station.url;
    }
  }, []);

  // Get logo URL for a station
  const getLogoUrl = useCallback((station: Station): string | undefined => {
    if (station.logoAssets?.webp192) {
      return `https://themegaradio.com/station-logos/${station.logoAssets.folder}/${station.logoAssets.webp192}`;
    }
    return station.favicon || station.logo || undefined;
  }, []);

  // Play a station
  const playStation = useCallback(async (station: Station) => {
    try {
      // Set station and loading state
      setCurrentStation(station);
      setPlaybackState('loading');
      setError(null);
      setMiniPlayerVisible(true);

      // Record click
      try {
        await stationService.recordClick(station._id);
      } catch {
        // Non-critical
      }

      // Resolve stream URL
      const url = await resolveStreamUrl(station);
      if (!url) {
        throw new Error('Could not resolve stream URL');
      }
      setStreamUrl(url);

      // Get genre for artist field
      const genre = station.genres?.[0] || station.country || 'Radio';
      const artwork = getLogoUrl(station);

      if (isWeb) {
        // Web fallback - just update state (no actual playback)
        setPlaybackState('playing');
        console.log('[useTrackPlayer] Web mode - simulated playback');
      } else {
        // Native - use TrackPlayer
        await playRadioStation(
          station._id,
          url,
          station.name,
          genre,
          artwork
        );
      }

      listeningStartRef.current = new Date();

      // Record recently played
      try {
        await userService.recordRecentlyPlayed(station._id);
      } catch {
        // Non-critical
      }

      // Fetch now playing metadata
      fetchNowPlaying(station._id);
    } catch (error) {
      console.error('[useTrackPlayer] Failed to play station:', error);
      setError(error instanceof Error ? error.message : 'Failed to play station');
      setPlaybackState('error');
    }
  }, [resolveStreamUrl, getLogoUrl, setCurrentStation, setPlaybackState, setStreamUrl, setError, setMiniPlayerVisible]);

  // Fetch now playing metadata
  const fetchNowPlaying = useCallback(async (stationId: string) => {
    try {
      const metadata = await stationService.getNowPlaying(stationId);
      setNowPlaying(metadata);
    } catch {
      console.log('[useTrackPlayer] Now playing metadata not available');
    }
  }, [setNowPlaying]);

  // Stop playback
  const stopPlayback = useCallback(async () => {
    try {
      // Record listening time
      if (listeningStartRef.current && currentStation) {
        const duration = Math.floor(
          (new Date().getTime() - listeningStartRef.current.getTime()) / 1000
        );
        if (duration > 5) {
          try {
            await userService.recordListening(
              currentStation._id,
              duration,
              listeningStartRef.current.toISOString()
            );
          } catch {
            // Non-critical
          }
        }
        listeningStartRef.current = null;
      }

      if (!isWeb) {
        await TrackPlayer.stop();
        await TrackPlayer.reset();
      }

      setPlaybackState('idle');
      setMiniPlayerVisible(false);
    } catch (error) {
      console.error('[useTrackPlayer] Error stopping playback:', error);
    }
  }, [currentStation, setPlaybackState, setMiniPlayerVisible]);

  // Pause playback
  const pause = useCallback(async () => {
    try {
      if (!isWeb) {
        await TrackPlayer.pause();
      }
      setPlaybackState('paused');
    } catch (error) {
      console.error('[useTrackPlayer] Error pausing:', error);
    }
  }, [setPlaybackState]);

  // Resume playback
  const resume = useCallback(async () => {
    try {
      if (!isWeb) {
        await TrackPlayer.play();
      }
      setPlaybackState('playing');
    } catch (error) {
      console.error('[useTrackPlayer] Error resuming:', error);
    }
  }, [setPlaybackState]);

  // Toggle play/pause
  const togglePlayPause = useCallback(async () => {
    if (playbackState === 'playing') {
      await pause();
    } else if (playbackState === 'paused') {
      await resume();
    }
  }, [playbackState, pause, resume]);

  // Set volume
  const setVolume = useCallback(async (volume: number) => {
    try {
      if (!isWeb) {
        await TrackPlayer.setVolume(volume);
      }
    } catch (error) {
      console.error('[useTrackPlayer] Error setting volume:', error);
    }
  }, []);

  return {
    currentStation,
    playbackState,
    isWeb,
    playStation,
    stopPlayback,
    pause,
    resume,
    togglePlayPause,
    setVolume,
  };
};

export default useTrackPlayer;

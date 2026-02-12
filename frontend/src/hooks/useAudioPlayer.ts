// useAudioPlayer - Uses expo-av for audio playback
// Works in both Expo Go and web
// IMPORTANT: Always stops current playback before starting new one

import { useCallback, useRef, useEffect } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { usePlayerStore } from '../store/playerStore';
import stationService from '../services/stationService';
import userService from '../services/userService';
import type { Station } from '../types';

// Global sound reference to ensure only one sound plays at a time
let globalSound: Audio.Sound | null = null;

export const useAudioPlayer = () => {
  const listeningStartRef = useRef<Date | null>(null);

  const {
    currentStation,
    playbackState,
    streamUrl,
    setCurrentStation,
    setPlaybackState,
    setStreamUrl,
    setNowPlaying,
    setError,
    setMiniPlayerVisible,
    reset,
  } = usePlayerStore();

  // Set up audio mode on mount
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          allowsRecordingIOS: false,
        });
        console.log('[useAudioPlayer] Audio mode set');
      } catch (error) {
        console.error('[useAudioPlayer] Failed to set audio mode:', error);
      }
    };
    setupAudio();

    return () => {
      // Cleanup on unmount
      if (globalSound) {
        globalSound.unloadAsync().catch(() => {});
        globalSound = null;
      }
    };
  }, []);

  // Handle playback state changes
  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.error('[useAudioPlayer] Playback error:', status.error);
        setError(`Playback error: ${status.error}`);
        setPlaybackState('error');
      }
      return;
    }

    if (status.isBuffering) {
      setPlaybackState('buffering');
    } else if (status.isPlaying) {
      setPlaybackState('playing');
    } else {
      setPlaybackState('paused');
    }
  }, [setPlaybackState, setError]);

  // Resolve stream URL
  const resolveStreamUrl = useCallback(async (station: Station): Promise<string | null> => {
    try {
      const streamData = await stationService.resolveStream(station.url);

      if (streamData.candidates && streamData.candidates.length > 0) {
        let resolvedUrl = streamData.candidates[0];

        // If HTTP stream, use proxy
        if (resolvedUrl.startsWith('http://')) {
          resolvedUrl = stationService.getProxyUrl(resolvedUrl);
        }

        return resolvedUrl;
      }

      // Fallback to original URL
      return station.url_resolved || station.url;
    } catch (error) {
      console.error('[useAudioPlayer] Failed to resolve stream:', error);
      return station.url_resolved || station.url;
    }
  }, []);

  // STOP current playback - MUST be called before playing new station
  const stopPlayback = useCallback(async () => {
    console.log('[useAudioPlayer] ===== STOPPING PLAYBACK =====');
    try {
      if (globalSound) {
        console.log('[useAudioPlayer] Stopping and unloading current sound...');
        try {
          await globalSound.stopAsync();
        } catch (e) {
          console.log('[useAudioPlayer] Stop error (ignored):', e);
        }
        try {
          await globalSound.unloadAsync();
        } catch (e) {
          console.log('[useAudioPlayer] Unload error (ignored):', e);
        }
        globalSound = null;
        console.log('[useAudioPlayer] Sound stopped and unloaded');
      }

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

      setPlaybackState('idle');
    } catch (error) {
      console.error('[useAudioPlayer] Error stopping playback:', error);
    }
  }, [currentStation, setPlaybackState]);

  // Play a station - ALWAYS stops current playback first
  const playStation = useCallback(async (station: Station) => {
    console.log('[useAudioPlayer] ===== PLAYING NEW STATION =====');
    console.log('[useAudioPlayer] Station:', station.name);
    
    try {
      // STEP 1: ALWAYS stop current playback first
      console.log('[useAudioPlayer] Step 1: Stopping any current playback...');
      if (globalSound) {
        try {
          await globalSound.stopAsync();
        } catch (e) {
          // Ignore
        }
        try {
          await globalSound.unloadAsync();
        } catch (e) {
          // Ignore
        }
        globalSound = null;
      }
      console.log('[useAudioPlayer] Current playback stopped');

      // STEP 2: Set new station and loading state
      console.log('[useAudioPlayer] Step 2: Setting up new station...');
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

      // STEP 3: Resolve stream URL
      console.log('[useAudioPlayer] Step 3: Resolving stream URL...');
      const url = await resolveStreamUrl(station);
      if (!url) {
        throw new Error('Could not resolve stream URL');
      }
      console.log('[useAudioPlayer] Stream URL:', url);
      setStreamUrl(url);

      // STEP 4: Create and load NEW sound
      console.log('[useAudioPlayer] Step 4: Creating new sound...');
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, volume: 1.0 },
        onPlaybackStatusUpdate
      );
      
      globalSound = sound;
      listeningStartRef.current = new Date();
      console.log('[useAudioPlayer] ===== NEW STATION PLAYING =====');

      // Record recently played
      try {
        await userService.recordRecentlyPlayed(station._id);
      } catch {
        // Non-critical
      }

      // Fetch now playing metadata
      fetchNowPlaying(station._id);

    } catch (error) {
      console.error('[useAudioPlayer] Failed to play station:', error);
      setError(error instanceof Error ? error.message : 'Failed to play station');
      setPlaybackState('error');
    }
  }, [resolveStreamUrl, onPlaybackStatusUpdate, setCurrentStation, setPlaybackState, setStreamUrl, setError, setMiniPlayerVisible]);

  // Fetch now playing metadata
  const fetchNowPlaying = useCallback(async (stationId: string) => {
    try {
      const metadata = await stationService.getNowPlaying(stationId);
      setNowPlaying(metadata);
    } catch {
      console.log('[useAudioPlayer] Now playing metadata not available');
    }
  }, [setNowPlaying]);

  // Pause playback
  const pause = useCallback(async () => {
    try {
      if (globalSound) {
        await globalSound.pauseAsync();
        setPlaybackState('paused');
      }
    } catch (error) {
      console.error('[useAudioPlayer] Error pausing:', error);
    }
  }, [setPlaybackState]);

  // Resume playback
  const resume = useCallback(async () => {
    try {
      if (globalSound) {
        await globalSound.playAsync();
        setPlaybackState('playing');
      }
    } catch (error) {
      console.error('[useAudioPlayer] Error resuming:', error);
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
      if (globalSound) {
        await globalSound.setVolumeAsync(volume);
      }
    } catch (error) {
      console.error('[useAudioPlayer] Error setting volume:', error);
    }
  }, []);

  return {
    currentStation,
    playbackState,
    streamUrl,
    playStation,
    stopPlayback,
    pause,
    resume,
    togglePlayPause,
    setVolume,
    reset,
  };
};

export default useAudioPlayer;

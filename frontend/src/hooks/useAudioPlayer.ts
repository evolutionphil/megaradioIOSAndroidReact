// useAudioPlayer - Uses expo-av for audio playback
// Works in both Expo Go and web

import { useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { usePlayerStore } from '../store/playerStore';
import stationService from '../services/stationService';
import userService from '../services/userService';
import type { Station } from '../types';

export const useAudioPlayer = () => {
  const soundRef = useRef<Audio.Sound | null>(null);
  const listeningStartRef = useRef<Date | null>(null);
  const isPlayingRef = useRef<boolean>(false);

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
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
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
      isPlayingRef.current = true;
    } else {
      if (isPlayingRef.current) {
        setPlaybackState('paused');
      }
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

  // Stop current playback
  const stopPlayback = useCallback(async () => {
    console.log('[useAudioPlayer] Stopping playback');
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      isPlayingRef.current = false;

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
      setMiniPlayerVisible(false);
    } catch (error) {
      console.error('[useAudioPlayer] Error stopping playback:', error);
    }
  }, [currentStation, setPlaybackState, setMiniPlayerVisible]);

  // Play a station
  const playStation = useCallback(async (station: Station) => {
    console.log('[useAudioPlayer] Playing station:', station.name);
    try {
      // Stop current playback first
      if (soundRef.current) {
        console.log('[useAudioPlayer] Stopping previous playback');
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      isPlayingRef.current = false;

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
      console.log('[useAudioPlayer] Stream URL:', url);
      setStreamUrl(url);

      // Create and load sound
      console.log('[useAudioPlayer] Creating sound...');
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, volume: 1.0 },
        onPlaybackStatusUpdate
      );
      
      soundRef.current = sound;
      listeningStartRef.current = new Date();
      console.log('[useAudioPlayer] Sound created and playing');

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
      if (soundRef.current) {
        await soundRef.current.pauseAsync();
        setPlaybackState('paused');
        isPlayingRef.current = false;
      }
    } catch (error) {
      console.error('[useAudioPlayer] Error pausing:', error);
    }
  }, [setPlaybackState]);

  // Resume playback
  const resume = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.playAsync();
        setPlaybackState('playing');
        isPlayingRef.current = true;
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
      if (soundRef.current) {
        await soundRef.current.setVolumeAsync(volume);
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

// useAudioPlayer - Audio playback with expo-audio (Expo SDK 54+)
// Uses a SINGLE AudioPlayer instance to prevent multiple audio playing simultaneously

import { useCallback, useRef, useEffect, useState } from 'react';
import { AudioPlayer, setAudioModeAsync } from 'expo-audio';
import { usePlayerStore } from '../store/playerStore';
import stationService from '../services/stationService';
import userService from '../services/userService';
import type { Station } from '../types';

// Global state
let audioModeConfigured = false;
let globalPlayer: AudioPlayer | null = null;
let globalPlaybackState: 'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'error' = 'idle';

// Get or create the single global player
const getGlobalPlayer = (): AudioPlayer => {
  if (!globalPlayer) {
    console.log('[AudioPlayer] Creating new global AudioPlayer instance');
    globalPlayer = new AudioPlayer();
  }
  return globalPlayer;
};

// Stop and release the global player
const stopGlobalPlayer = async () => {
  if (globalPlayer) {
    try {
      console.log('[AudioPlayer] Stopping global player');
      globalPlayer.pause();
      // Release the player to free resources
      if (typeof globalPlayer.release === 'function') {
        globalPlayer.release();
      }
    } catch (e) {
      console.log('[AudioPlayer] Stop error (ignored):', e);
    }
    globalPlayer = null;
  }
  globalPlaybackState = 'idle';
};

export const useAudioPlayer = () => {
  const listeningStartRef = useRef<Date | null>(null);
  const [localPlaybackState, setLocalPlaybackState] = useState(globalPlaybackState);
  const currentStationIdRef = useRef<string | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  
  const {
    currentStation,
    setCurrentStation,
    setPlaybackState: setStorePlaybackState,
    setStreamUrl,
    setNowPlaying,
    setError,
    setMiniPlayerVisible,
  } = usePlayerStore();

  // Sync local state with store
  const setPlaybackState = useCallback((state: typeof globalPlaybackState) => {
    globalPlaybackState = state;
    setLocalPlaybackState(state);
    setStorePlaybackState(state);
  }, [setStorePlaybackState]);

  // Configure audio mode once
  useEffect(() => {
    const setupAudio = async () => {
      if (audioModeConfigured) return;
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: 'duckOthers',
        });
        audioModeConfigured = true;
        console.log('[useAudioPlayer] Audio mode configured');
      } catch (error) {
        console.error('[useAudioPlayer] Failed to configure audio mode:', error);
      }
    };
    setupAudio();
  }, []);

  // Listen to player status changes
  useEffect(() => {
    const player = globalPlayer;
    if (!player) return;

    const checkStatus = () => {
      try {
        if (player.playing) {
          if (globalPlaybackState !== 'playing') {
            setPlaybackState('playing');
          }
        } else if (globalPlaybackState === 'playing') {
          setPlaybackState('paused');
        }
      } catch (e) {
        // Player might be released
      }
    };

    const interval = setInterval(checkStatus, 500);
    return () => clearInterval(interval);
  }, [localPlaybackState, setPlaybackState]);

  // Resolve stream URL
  const resolveStreamUrl = useCallback(async (station: Station): Promise<string | null> => {
    try {
      const streamData = await stationService.resolveStream(station.url);

      if (streamData.candidates && streamData.candidates.length > 0) {
        let resolvedUrl = streamData.candidates[0];
        
        // Always proxy for reliability
        if (resolvedUrl.startsWith('http://') || !resolvedUrl.includes('streamtheworld.com')) {
          resolvedUrl = stationService.getProxyUrl(resolvedUrl);
        }
        return resolvedUrl;
      }

      // Fallback
      let fallbackUrl = station.url_resolved || station.url;
      return stationService.getProxyUrl(fallbackUrl);
    } catch (error) {
      console.error('[useAudioPlayer] Failed to resolve stream:', error);
      let fallbackUrl = station.url_resolved || station.url;
      return stationService.getProxyUrl(fallbackUrl);
    }
  }, []);

  // Fetch now playing metadata
  const fetchNowPlaying = useCallback(async (stationId: string) => {
    try {
      const nowPlayingData = await stationService.getNowPlaying(stationId);
      if (nowPlayingData && (nowPlayingData.title || nowPlayingData.artist)) {
        setNowPlaying(nowPlayingData);
      }
    } catch {
      console.log('[useAudioPlayer] Now playing metadata not available');
    }
  }, [setNowPlaying]);

  // STOP playback completely
  const stopPlayback = useCallback(async () => {
    console.log('[useAudioPlayer] ========== STOP PLAYBACK ==========');
    
    // Record listening time
    if (listeningStartRef.current && currentStationIdRef.current) {
      const duration = Math.floor(
        (new Date().getTime() - listeningStartRef.current.getTime()) / 1000
      );
      if (duration > 5) {
        try {
          await userService.recordListening(
            currentStationIdRef.current,
            duration,
            listeningStartRef.current.toISOString()
          );
        } catch {
          // Non-critical
        }
      }
      listeningStartRef.current = null;
    }

    await stopGlobalPlayer();
    currentStationIdRef.current = null;
    currentUrlRef.current = null;
    setPlaybackState('idle');
    setMiniPlayerVisible(false);
    
    console.log('[useAudioPlayer] ========== STOPPED ==========');
  }, [setPlaybackState, setMiniPlayerVisible]);

  // PLAY a station
  const playStation = useCallback(async (station: Station) => {
    console.log('[useAudioPlayer] ========== PLAY STATION ==========');
    console.log('[useAudioPlayer] Station:', station.name, 'ID:', station._id);
    
    // Check if same station - toggle play/pause
    if (currentStationIdRef.current === station._id && globalPlayer) {
      console.log('[useAudioPlayer] Same station, toggling play/pause');
      try {
        if (globalPlayer.playing) {
          globalPlayer.pause();
          setPlaybackState('paused');
        } else {
          globalPlayer.play();
          setPlaybackState('playing');
        }
      } catch (e) {
        console.log('[useAudioPlayer] Toggle error:', e);
      }
      return;
    }

    try {
      // STEP 1: STOP any current playback FIRST
      console.log('[useAudioPlayer] Step 1: Stopping current playback...');
      await stopGlobalPlayer();
      
      // STEP 2: Set loading state
      setPlaybackState('loading');
      setError(null);
      
      // STEP 3: Update station state for immediate UI feedback
      console.log('[useAudioPlayer] Step 2: Setting new station...');
      setCurrentStation(station);
      setMiniPlayerVisible(true);
      currentStationIdRef.current = station._id;

      // Record click (non-blocking)
      stationService.recordClick(station._id).catch(() => {});

      // STEP 4: Resolve stream URL
      console.log('[useAudioPlayer] Step 3: Resolving stream URL...');
      const url = await resolveStreamUrl(station);
      if (!url) {
        throw new Error('Could not resolve stream URL');
      }

      console.log('[useAudioPlayer] Stream URL:', url.substring(0, 80) + '...');
      setStreamUrl(url);
      currentUrlRef.current = url;
      
      // STEP 5: Create new player and load
      console.log('[useAudioPlayer] Step 4: Creating player and loading...');
      const player = getGlobalPlayer();
      
      // Replace the source
      player.replace({ uri: url });
      
      // Wait a bit for the player to load
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // STEP 6: Play
      console.log('[useAudioPlayer] Step 5: Playing...');
      player.play();
      setPlaybackState('playing');
      
      listeningStartRef.current = new Date();
      console.log('[useAudioPlayer] ========== PLAYING ==========');

      // Record recently played (non-blocking)
      userService.recordRecentlyPlayed(station._id).catch(() => {});

      // Fetch now playing metadata (non-blocking)
      fetchNowPlaying(station._id);

    } catch (error: any) {
      console.error('[useAudioPlayer] Play error:', error);
      setPlaybackState('error');
      setError(error?.message || 'Failed to play station');
    }
  }, [setCurrentStation, setPlaybackState, setError, setMiniPlayerVisible, setStreamUrl, resolveStreamUrl, fetchNowPlaying]);

  // Pause playback
  const pause = useCallback(async () => {
    console.log('[useAudioPlayer] Pause called');
    try {
      if (globalPlayer) {
        globalPlayer.pause();
        setPlaybackState('paused');
        console.log('[useAudioPlayer] Paused');
      } else {
        console.warn('[useAudioPlayer] No player to pause');
      }
    } catch (error) {
      console.error('[useAudioPlayer] Error pausing:', error);
    }
  }, [setPlaybackState]);

  // Resume playback
  const resume = useCallback(async () => {
    console.log('[useAudioPlayer] Resume called');
    try {
      if (globalPlayer) {
        globalPlayer.play();
        setPlaybackState('playing');
        console.log('[useAudioPlayer] Resumed');
      } else {
        console.warn('[useAudioPlayer] No player to resume');
      }
    } catch (error) {
      console.error('[useAudioPlayer] Error resuming:', error);
    }
  }, [setPlaybackState]);

  // Toggle play/pause
  const togglePlayPause = useCallback(async () => {
    console.log('[useAudioPlayer] togglePlayPause called, state:', globalPlaybackState);
    
    if (globalPlaybackState === 'playing') {
      await pause();
    } else if (globalPlaybackState === 'paused') {
      await resume();
    } else if ((globalPlaybackState === 'idle' || globalPlaybackState === 'error') && currentStation) {
      console.log('[useAudioPlayer] Replaying station from', globalPlaybackState, 'state');
      await playStation(currentStation);
    } else {
      console.log('[useAudioPlayer] togglePlayPause - no action, state:', globalPlaybackState);
    }
  }, [pause, resume, currentStation, playStation]);

  // Set volume
  const setVolume = useCallback(async (volume: number) => {
    try {
      if (globalPlayer) {
        globalPlayer.volume = Math.max(0, Math.min(1, volume));
        console.log('[useAudioPlayer] Volume set to:', volume);
      }
    } catch (error) {
      console.error('[useAudioPlayer] Error setting volume:', error);
    }
  }, []);

  // Reset state
  const reset = useCallback(() => {
    stopGlobalPlayer();
    currentStationIdRef.current = null;
    currentUrlRef.current = null;
  }, []);

  return {
    currentStation,
    playbackState: localPlaybackState,
    streamUrl: currentUrlRef.current,
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

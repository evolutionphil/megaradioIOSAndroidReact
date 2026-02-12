// useAudioPlayer - Audio playback with GUARANTEED stop before play
// Uses a singleton pattern to ensure only ONE sound plays at a time
// CRITICAL: This singleton MUST be shared across ALL components

import { useCallback, useRef, useEffect } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { usePlayerStore } from '../store/playerStore';
import stationService from '../services/stationService';
import userService from '../services/userService';
import type { Station } from '../types';

// Global state to track initialization
let audioModeConfigured = false;

// SINGLETON: Global sound instance - ensures only ONE sound exists across the entire app
class AudioManager {
  private static instance: AudioManager;
  private sound: Audio.Sound | null = null;
  private currentStationId: string | null = null;
  private statusCallback: ((status: AVPlaybackStatus) => void) | null = null;

  private constructor() {
    console.log('[AudioManager] Singleton instance created');
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  getCurrentStationId(): string | null {
    return this.currentStationId;
  }

  setStatusCallback(callback: (status: AVPlaybackStatus) => void): void {
    this.statusCallback = callback;
  }

  private onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (this.statusCallback) {
      this.statusCallback(status);
    }
  };

  async stopAndUnload(): Promise<void> {
    console.log('[AudioManager] stopAndUnload called, current sound:', this.sound ? 'exists' : 'null');
    
    if (this.sound) {
      const soundToUnload = this.sound;
      // Clear references FIRST to prevent race conditions
      this.sound = null;
      this.currentStationId = null;
      
      try {
        console.log('[AudioManager] Getting status...');
        const status = await soundToUnload.getStatusAsync();
        if (status.isLoaded) {
          console.log('[AudioManager] Stopping sound...');
          await soundToUnload.stopAsync();
        }
      } catch (e) {
        console.log('[AudioManager] Stop error (ignored):', e);
      }
      
      try {
        console.log('[AudioManager] Unloading sound...');
        await soundToUnload.unloadAsync();
        console.log('[AudioManager] Sound unloaded successfully');
      } catch (e) {
        console.log('[AudioManager] Unload error (ignored):', e);
      }
    }
  }

  async play(url: string, stationId: string): Promise<void> {
    console.log('[AudioManager] play() called for station:', stationId);
    console.log('[AudioManager] Current station:', this.currentStationId);
    
    // If same station, don't restart
    if (this.currentStationId === stationId && this.sound) {
      console.log('[AudioManager] Same station already playing, resuming if needed');
      try {
        const status = await this.sound.getStatusAsync();
        if (status.isLoaded && !status.isPlaying) {
          await this.sound.playAsync();
        }
      } catch (e) {
        console.log('[AudioManager] Resume error:', e);
      }
      return;
    }
    
    // CRITICAL: Stop any existing sound FIRST
    console.log('[AudioManager] Stopping existing sound before playing new one...');
    await this.stopAndUnload();
    
    // Small delay to ensure cleanup is complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('[AudioManager] Creating new sound for:', url.substring(0, 50) + '...');
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, volume: 1.0 },
        this.onPlaybackStatusUpdate
      );
      
      this.sound = sound;
      this.currentStationId = stationId;
      console.log('[AudioManager] New sound created and playing for station:', stationId);
    } catch (error) {
      console.error('[AudioManager] Failed to create sound:', error);
      throw error;
    }
  }

  async pause(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.pauseAsync();
        console.log('[AudioManager] Paused');
      } catch (e) {
        console.log('[AudioManager] Pause error:', e);
      }
    }
  }

  async resume(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.playAsync();
        console.log('[AudioManager] Resumed');
      } catch (e) {
        console.log('[AudioManager] Resume error:', e);
      }
    }
  }

  async setVolume(volume: number): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.setVolumeAsync(volume);
      } catch (e) {
        console.log('[AudioManager] Volume error:', e);
      }
    }
  }

  async getIsPlaying(): Promise<boolean> {
    if (!this.sound) return false;
    try {
      const status = await this.sound.getStatusAsync();
      return status.isLoaded && status.isPlaying;
    } catch {
      return false;
    }
  }
}

// Get singleton instance - MUST be called once at module level
const audioManager = AudioManager.getInstance();

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

  // Set up audio mode ONCE globally (not per hook instance)
  useEffect(() => {
    const setupAudio = async () => {
      // Only configure once across all hook instances
      if (audioModeConfigured) {
        console.log('[useAudioPlayer] Audio mode already configured, skipping');
        return;
      }
      
      try {
        await Audio.setAudioModeAsync({
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          allowsRecordingIOS: false,
        });
        audioModeConfigured = true;
        console.log('[useAudioPlayer] Audio mode configured (first time)');
      } catch (error) {
        console.error('[useAudioPlayer] Failed to set audio mode:', error);
      }
    };
    setupAudio();

    // Set up the status callback for this hook instance
    audioManager.setStatusCallback(onPlaybackStatusUpdate);

    // NOTE: We do NOT cleanup on unmount because the singleton should persist
    // Only cleanup when app is fully closed (handled by AppState listener if needed)
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

        if (resolvedUrl.startsWith('http://')) {
          resolvedUrl = stationService.getProxyUrl(resolvedUrl);
        }

        return resolvedUrl;
      }

      return station.url_resolved || station.url;
    } catch (error) {
      console.error('[useAudioPlayer] Failed to resolve stream:', error);
      return station.url_resolved || station.url;
    }
  }, []);

  // STOP playback
  const stopPlayback = useCallback(async () => {
    console.log('[useAudioPlayer] ========== STOP PLAYBACK ==========');
    
    const currentStationId = audioManager.getCurrentStationId();
    
    // Record listening time if there was a previous station
    if (listeningStartRef.current && currentStationId) {
      const duration = Math.floor(
        (new Date().getTime() - listeningStartRef.current.getTime()) / 1000
      );
      if (duration > 5) {
        try {
          await userService.recordListening(
            currentStationId,
            duration,
            listeningStartRef.current.toISOString()
          );
        } catch {
          // Non-critical
        }
      }
      listeningStartRef.current = null;
    }

    await audioManager.stopAndUnload();
    setPlaybackState('idle');
    setMiniPlayerVisible(false);
    
    console.log('[useAudioPlayer] ========== STOPPED ==========');
  }, [setPlaybackState, setMiniPlayerVisible]);

  // PLAY a station - ALWAYS stops current first
  const playStation = useCallback(async (station: Station) => {
    console.log('[useAudioPlayer] ========== PLAY STATION ==========');
    console.log('[useAudioPlayer] Station:', station.name, 'ID:', station._id);
    
    const currentStationId = audioManager.getCurrentStationId();
    
    // Check if same station - toggle play/pause
    if (currentStationId === station._id) {
      console.log('[useAudioPlayer] Same station, toggling play/pause');
      const isPlaying = await audioManager.getIsPlaying();
      if (isPlaying) {
        await audioManager.pause();
        setPlaybackState('paused');
      } else {
        await audioManager.resume();
        setPlaybackState('playing');
      }
      return;
    }

    try {
      // STEP 1: Set loading state immediately
      setPlaybackState('loading');
      setError(null);
      
      // STEP 2: Update station state BEFORE stopping (for immediate UI feedback)
      console.log('[useAudioPlayer] Step 1: Setting new station...');
      setCurrentStation(station);
      setMiniPlayerVisible(true);

      // Record click (non-blocking)
      stationService.recordClick(station._id).catch(() => {});

      // STEP 3: Resolve stream URL
      console.log('[useAudioPlayer] Step 2: Resolving stream URL...');
      const url = await resolveStreamUrl(station);
      if (!url) {
        throw new Error('Could not resolve stream URL');
      }
      console.log('[useAudioPlayer] Stream URL:', url.substring(0, 80) + '...');
      setStreamUrl(url);

      // STEP 4: Play new sound (AudioManager handles stopping internally)
      console.log('[useAudioPlayer] Step 3: Playing new sound...');
      await audioManager.play(url, station._id);
      
      listeningStartRef.current = new Date();
      console.log('[useAudioPlayer] ========== NOW PLAYING ==========');

      // Record recently played (non-blocking)
      userService.recordRecentlyPlayed(station._id).catch(() => {});

      // Fetch now playing metadata (non-blocking)
      fetchNowPlaying(station._id);

    } catch (error) {
      console.error('[useAudioPlayer] Failed to play station:', error);
      setError(error instanceof Error ? error.message : 'Failed to play station');
      setPlaybackState('error');
    }
  }, [resolveStreamUrl, setCurrentStation, setPlaybackState, setStreamUrl, setError, setMiniPlayerVisible]);

  // Fetch now playing metadata from our backend
  const fetchNowPlaying = useCallback(async (stationId: string) => {
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || '';
    
    try {
      // Try our local backend API first
      const response = await fetch(`${backendUrl}/api/now-playing/${stationId}`);
      if (response.ok) {
        const metadata = await response.json();
        if (metadata && (metadata.title || metadata.artist)) {
          setNowPlaying(metadata);
          return;
        }
      }
    } catch (error) {
      console.log('[useAudioPlayer] Local backend now-playing failed:', error);
    }
    
    // Fall through to external API
    try {
      const metadata = await stationService.getNowPlaying(stationId);
      if (metadata) {
        setNowPlaying(metadata);
      }
    } catch {
      console.log('[useAudioPlayer] Now playing metadata not available');
    }
  }, [setNowPlaying]);

  // Pause playback
  const pause = useCallback(async () => {
    try {
      await audioManager.pause();
      setPlaybackState('paused');
    } catch (error) {
      console.error('[useAudioPlayer] Error pausing:', error);
    }
  }, [setPlaybackState]);

  // Resume playback
  const resume = useCallback(async () => {
    try {
      await audioManager.resume();
      setPlaybackState('playing');
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
      await audioManager.setVolume(volume);
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

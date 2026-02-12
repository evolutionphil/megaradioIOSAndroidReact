// useAudioPlayer - Audio playback with GUARANTEED stop before play
// Uses a singleton pattern to ensure only ONE sound plays at a time

import { useCallback, useRef, useEffect } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { usePlayerStore } from '../store/playerStore';
import stationService from '../services/stationService';
import userService from '../services/userService';
import type { Station } from '../types';

// SINGLETON: Global sound instance - ensures only ONE sound exists
class AudioManager {
  private static instance: AudioManager;
  private sound: Audio.Sound | null = null;
  private isPlaying: boolean = false;

  private constructor() {}

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  async stopAndUnload(): Promise<void> {
    console.log('[AudioManager] stopAndUnload called');
    if (this.sound) {
      try {
        const status = await this.sound.getStatusAsync();
        if (status.isLoaded) {
          console.log('[AudioManager] Stopping sound...');
          await this.sound.stopAsync();
        }
      } catch (e) {
        console.log('[AudioManager] Stop error (ignored):', e);
      }
      
      try {
        console.log('[AudioManager] Unloading sound...');
        await this.sound.unloadAsync();
      } catch (e) {
        console.log('[AudioManager] Unload error (ignored):', e);
      }
      
      this.sound = null;
      this.isPlaying = false;
      console.log('[AudioManager] Sound stopped and unloaded');
    }
  }

  async play(
    url: string, 
    onStatusUpdate: (status: AVPlaybackStatus) => void
  ): Promise<void> {
    // ALWAYS stop current sound first
    await this.stopAndUnload();
    
    console.log('[AudioManager] Creating new sound for:', url);
    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: true, volume: 1.0 },
      onStatusUpdate
    );
    
    this.sound = sound;
    this.isPlaying = true;
    console.log('[AudioManager] New sound created and playing');
  }

  async pause(): Promise<void> {
    if (this.sound) {
      await this.sound.pauseAsync();
      this.isPlaying = false;
    }
  }

  async resume(): Promise<void> {
    if (this.sound) {
      await this.sound.playAsync();
      this.isPlaying = true;
    }
  }

  async setVolume(volume: number): Promise<void> {
    if (this.sound) {
      await this.sound.setVolumeAsync(volume);
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

// Get singleton instance
const audioManager = AudioManager.getInstance();

export const useAudioPlayer = () => {
  const listeningStartRef = useRef<Date | null>(null);
  const currentStationIdRef = useRef<string | null>(null);

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
        console.log('[useAudioPlayer] Audio mode configured');
      } catch (error) {
        console.error('[useAudioPlayer] Failed to set audio mode:', error);
      }
    };
    setupAudio();

    // Cleanup on unmount
    return () => {
      audioManager.stopAndUnload();
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
    
    // Record listening time if there was a previous station
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

    await audioManager.stopAndUnload();
    setPlaybackState('idle');
    setMiniPlayerVisible(false);
    currentStationIdRef.current = null;
    
    console.log('[useAudioPlayer] ========== STOPPED ==========');
  }, [setPlaybackState, setMiniPlayerVisible]);

  // PLAY a station - ALWAYS stops current first
  const playStation = useCallback(async (station: Station) => {
    console.log('[useAudioPlayer] ========== PLAY STATION ==========');
    console.log('[useAudioPlayer] Station:', station.name, 'ID:', station._id);
    
    // Check if same station
    if (currentStationIdRef.current === station._id) {
      console.log('[useAudioPlayer] Same station, toggling play/pause');
      if (audioManager.getIsPlaying()) {
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
      
      // STEP 2: STOP any current playback
      console.log('[useAudioPlayer] Step 1: Stopping current playback...');
      await audioManager.stopAndUnload();
      
      // STEP 3: Update station state
      console.log('[useAudioPlayer] Step 2: Setting new station...');
      setCurrentStation(station);
      setMiniPlayerVisible(true);
      currentStationIdRef.current = station._id;

      // Record click
      try {
        await stationService.recordClick(station._id);
      } catch {
        // Non-critical
      }

      // STEP 4: Resolve stream URL
      console.log('[useAudioPlayer] Step 3: Resolving stream URL...');
      const url = await resolveStreamUrl(station);
      if (!url) {
        throw new Error('Could not resolve stream URL');
      }
      console.log('[useAudioPlayer] Stream URL:', url);
      setStreamUrl(url);

      // STEP 5: Create and play NEW sound
      console.log('[useAudioPlayer] Step 4: Playing new sound...');
      await audioManager.play(url, onPlaybackStatusUpdate);
      
      listeningStartRef.current = new Date();
      console.log('[useAudioPlayer] ========== NOW PLAYING ==========');

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
      currentStationIdRef.current = null;
    }
  }, [resolveStreamUrl, onPlaybackStatusUpdate, setCurrentStation, setPlaybackState, setStreamUrl, setError, setMiniPlayerVisible]);

  // Fetch now playing metadata from our backend
  const fetchNowPlaying = useCallback(async (stationId: string) => {
    try {
      // Try our backend first
      const response = await fetch(`/api/now-playing/${stationId}`);
      if (response.ok) {
        const metadata = await response.json();
        setNowPlaying(metadata);
        return;
      }
    } catch {
      // Fall through to external API
    }
    
    // Try external API
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

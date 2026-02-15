// useAudioPlayer - Audio playback with expo-audio (Expo SDK 54+)
// Uses a singleton pattern to ensure only ONE audio player exists at a time
// Migrated from deprecated expo-av

import { useCallback, useRef, useEffect, useState } from 'react';
import { 
  useAudioPlayer as useExpoAudioPlayer, 
  useAudioPlayerStatus,
  setAudioModeAsync,
} from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import { usePlayerStore } from '../store/playerStore';
import stationService from '../services/stationService';
import userService from '../services/userService';
import type { Station } from '../types';

// Global state to track initialization
let audioModeConfigured = false;

// SINGLETON: Global audio player manager
class AudioManager {
  private static instance: AudioManager;
  private currentStationId: string | null = null;
  private currentUrl: string | null = null;
  private _playId = 0;
  private playerRef: AudioPlayer | null = null;

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

  getCurrentUrl(): string | null {
    return this.currentUrl;
  }

  setPlayer(player: AudioPlayer | null): void {
    this.playerRef = player;
  }

  getPlayer(): AudioPlayer | null {
    return this.playerRef;
  }

  setCurrentStation(stationId: string | null, url: string | null): void {
    this.currentStationId = stationId;
    this.currentUrl = url;
  }

  incrementPlayId(): number {
    return ++this._playId;
  }

  getPlayId(): number {
    return this._playId;
  }

  async stop(): Promise<void> {
    this._playId++;
    console.log('[AudioManager] stop called, playId now:', this._playId);
    
    if (this.playerRef) {
      try {
        this.playerRef.pause();
        console.log('[AudioManager] Player paused');
      } catch (e) {
        console.log('[AudioManager] Pause error (ignored):', e);
      }
    }
    this.currentStationId = null;
    this.currentUrl = null;
  }
}

// Get singleton instance
const audioManager = AudioManager.getInstance();

export const useAudioPlayer = () => {
  const listeningStartRef = useRef<Date | null>(null);
  const [audioSource, setAudioSource] = useState<string | null>(null);
  
  // expo-audio hook - creates player instance
  const player = useExpoAudioPlayer(audioSource ? audioSource : undefined);
  const status = useAudioPlayerStatus(player);

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

  // Register player with AudioManager
  useEffect(() => {
    audioManager.setPlayer(player);
  }, [player]);

  // Set up audio mode ONCE globally
  useEffect(() => {
    const setupAudio = async () => {
      if (audioModeConfigured) {
        console.log('[useAudioPlayer] Audio mode already configured, skipping');
        return;
      }
      
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
        });
        audioModeConfigured = true;
        console.log('[useAudioPlayer] Audio mode configured (expo-audio)');
      } catch (error) {
        console.error('[useAudioPlayer] Failed to set audio mode:', error);
      }
    };
    setupAudio();
  }, []);

  // Handle playback status updates from expo-audio
  useEffect(() => {
    if (!status) return;

    // Map expo-audio status to our playback states
    if (status.playing) {
      setPlaybackState('playing');
    } else if (status.isBuffering) {
      setPlaybackState('buffering');
    } else if (status.currentTime > 0 && !status.playing) {
      setPlaybackState('paused');
    }
  }, [status, setPlaybackState, setError]);

  // Resolve stream URL - follows redirects and handles HTTP/HTTPS
  const resolveStreamUrl = useCallback(async (station: Station): Promise<string | null> => {
    try {
      const streamData = await stationService.resolveStream(station.url);

      if (streamData.candidates && streamData.candidates.length > 0) {
        let resolvedUrl = streamData.candidates[0];

        // iOS AVPlayer has problems with HTTP and certain redirects
        // Always proxy through themegaradio for reliability
        const isKnownWorkingHttps = resolvedUrl.includes('stream.laut.fm') || 
                                     resolvedUrl.includes('radiohost.de') ||
                                     resolvedUrl.includes('streamtheworld.com');
        
        if (resolvedUrl.startsWith('http://') || !isKnownWorkingHttps) {
          console.log('[useAudioPlayer] Using proxy for stream:', resolvedUrl.substring(0, 50));
          resolvedUrl = stationService.getProxyUrl(resolvedUrl);
        }

        return resolvedUrl;
      }

      // Fallback to url_resolved or original url - always proxy
      let fallbackUrl = station.url_resolved || station.url;
      console.log('[useAudioPlayer] Using fallback URL with proxy:', fallbackUrl.substring(0, 50));
      return stationService.getProxyUrl(fallbackUrl);
      
    } catch (error) {
      console.error('[useAudioPlayer] Failed to resolve stream:', error);
      
      // Final fallback - always proxy
      let fallbackUrl = station.url_resolved || station.url;
      return stationService.getProxyUrl(fallbackUrl);
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

    await audioManager.stop();
    setAudioSource(null);
    setPlaybackState('idle');
    setMiniPlayerVisible(false);
    
    console.log('[useAudioPlayer] ========== STOPPED ==========');
  }, [setPlaybackState, setMiniPlayerVisible]);

  // PLAY a station
  const playStation = useCallback(async (station: Station) => {
    console.log('[useAudioPlayer] ========== PLAY STATION ==========');
    console.log('[useAudioPlayer] Station:', station.name, 'ID:', station._id);
    
    const currentStationId = audioManager.getCurrentStationId();
    
    // Check if same station - toggle play/pause
    if (currentStationId === station._id) {
      console.log('[useAudioPlayer] Same station, toggling play/pause');
      if (status?.playing) {
        player.pause();
        setPlaybackState('paused');
      } else {
        player.play();
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

      // STEP 3: Get play ID for race condition prevention
      const myPlayId = audioManager.incrementPlayId();
      console.log('[useAudioPlayer] PlayID:', myPlayId, '- Starting');

      // STEP 4: Stop current playback
      if (player && status?.playing) {
        player.pause();
      }

      // STEP 5: Resolve stream URL
      console.log('[useAudioPlayer] Step 2: Resolving stream URL...');
      const url = await resolveStreamUrl(station);
      if (!url) {
        throw new Error('Could not resolve stream URL');
      }
      
      // Check if we're still the current play request
      if (audioManager.getPlayId() !== myPlayId) {
        console.log('[useAudioPlayer] PlayID', myPlayId, '- STALE, aborting');
        return;
      }

      console.log('[useAudioPlayer] Stream URL:', url.substring(0, 80) + '...');
      setStreamUrl(url);
      
      // STEP 6: Update audio source - this triggers expo-audio to load
      audioManager.setCurrentStation(station._id, url);
      setAudioSource(url);
      
      // Give expo-audio time to load the new source, then play
      // Use longer timeout and verify player state before play
      const attemptPlay = (attempt: number = 1, maxAttempts: number = 5) => {
        setTimeout(() => {
          const currentPlayer = audioManager.getPlayer();
          if (audioManager.getPlayId() !== myPlayId) {
            console.log('[useAudioPlayer] PlayID', myPlayId, '- STALE, aborting play attempt');
            return;
          }
          
          if (currentPlayer) {
            try {
              currentPlayer.play();
              console.log('[useAudioPlayer] PlayID', myPlayId, '- Play triggered (attempt', attempt, ')');
            } catch (e) {
              console.warn('[useAudioPlayer] Play attempt', attempt, 'failed:', e);
              if (attempt < maxAttempts) {
                attemptPlay(attempt + 1, maxAttempts);
              } else {
                setError('Unable to start playback');
                setPlaybackState('error');
              }
            }
          } else {
            console.warn('[useAudioPlayer] Player not ready, attempt', attempt);
            if (attempt < maxAttempts) {
              attemptPlay(attempt + 1, maxAttempts);
            } else {
              setError('Player initialization failed');
              setPlaybackState('error');
            }
          }
        }, attempt * 200); // Increasing delay: 200, 400, 600, 800, 1000ms
      };
      
      attemptPlay();
      
      listeningStartRef.current = new Date();
      console.log('[useAudioPlayer] ========== LOADING NEW STATION ==========');

      // Record recently played (non-blocking)
      userService.recordRecentlyPlayed(station._id).catch(() => {});

      // Fetch now playing metadata (non-blocking)
      fetchNowPlaying(station._id);

    } catch (error) {
      console.error('[useAudioPlayer] Failed to play station:', error);
      setError(error instanceof Error ? error.message : 'Failed to play station');
      setPlaybackState('error');
    }
  }, [player, status, resolveStreamUrl, setCurrentStation, setPlaybackState, setStreamUrl, setError, setMiniPlayerVisible]);

  // Fetch now playing metadata
  const fetchNowPlaying = useCallback(async (stationId: string) => {
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || '';
    
    try {
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
      if (player) {
        player.pause();
        setPlaybackState('paused');
        console.log('[useAudioPlayer] Paused');
      }
    } catch (error) {
      console.error('[useAudioPlayer] Error pausing:', error);
    }
  }, [player, setPlaybackState]);

  // Resume playback
  const resume = useCallback(async () => {
    try {
      if (player) {
        player.play();
        setPlaybackState('playing');
        console.log('[useAudioPlayer] Resumed');
      }
    } catch (error) {
      console.error('[useAudioPlayer] Error resuming:', error);
    }
  }, [player, setPlaybackState]);

  // Toggle play/pause
  const togglePlayPause = useCallback(async () => {
    if (playbackState === 'playing') {
      await pause();
    } else if (playbackState === 'paused') {
      await resume();
    } else if (playbackState === 'idle' && currentStation) {
      // After sleep timer stops playback, allow re-play
      await playStation(currentStation);
    }
  }, [playbackState, pause, resume, currentStation, playStation]);

  // Set volume
  const setVolume = useCallback(async (volume: number) => {
    try {
      if (player) {
        player.volume = Math.max(0, Math.min(1, volume));
        console.log('[useAudioPlayer] Volume set to:', volume);
      }
    } catch (error) {
      console.error('[useAudioPlayer] Error setting volume:', error);
    }
  }, [player]);

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

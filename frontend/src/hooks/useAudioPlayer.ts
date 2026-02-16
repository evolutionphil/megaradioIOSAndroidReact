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
        // Try to release the player
        if (typeof this.playerRef.release === 'function') {
          this.playerRef.release();
        }
        console.log('[AudioManager] Player paused and released');
      } catch (e) {
        console.log('[AudioManager] Stop error (ignored):', e);
      }
    }
    this.currentStationId = null;
    this.currentUrl = null;
    this.playerRef = null;
  }
}

// Get singleton instance
const audioManager = AudioManager.getInstance();

export const useAudioPlayer = () => {
  const listeningStartRef = useRef<Date | null>(null);
  const [audioSource, setAudioSource] = useState<string | null>(null);
  const [pendingPlay, setPendingPlay] = useState(false);
  const pendingPlayIdRef = useRef<number>(0);
  
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

  // Register player with AudioManager whenever it changes
  useEffect(() => {
    if (player) {
      console.log('[useAudioPlayer] Registering player with AudioManager');
      audioManager.setPlayer(player);
    }
  }, [player]);
  
  // Debug: Log playbackState changes
  useEffect(() => {
    console.log('[useAudioPlayer] playbackState changed to:', playbackState);
  }, [playbackState]);
  
  // Auto-play when player is ready and pendingPlay is true
  // Key fix: Check that player exists and is in a valid state before calling play()
  useEffect(() => {
    if (!pendingPlay || !player) return;
    
    const currentPlayId = audioManager.getPlayId();
    if (pendingPlayIdRef.current !== currentPlayId) {
      console.log('[useAudioPlayer] Stale pendingPlay, ignoring');
      setPendingPlay(false);
      return;
    }
    
    // Safer play attempt with delay to ensure player is fully initialized
    const attemptPlay = async () => {
      try {
        // Small delay to ensure native player is ready
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Double-check we're still the current play request
        if (pendingPlayIdRef.current !== audioManager.getPlayId()) {
          console.log('[useAudioPlayer] Play request became stale during delay');
          return;
        }
        
        // Check player is still valid
        if (!player) {
          console.log('[useAudioPlayer] Player became null during delay');
          return;
        }
        
        console.log('[useAudioPlayer] Attempting play...');
        player.play();
        setPendingPlay(false);
        console.log('[useAudioPlayer] Play called successfully');
      } catch (e: any) {
        console.warn('[useAudioPlayer] Play attempt failed:', e?.message || e);
        
        // If it's the NativeSharedObjectNotFoundException, retry with longer delay
        if (e?.message?.includes('NativeSharedObject') || e?.message?.includes('native')) {
          console.log('[useAudioPlayer] Native object error, retrying with longer delay...');
          setTimeout(async () => {
            if (pendingPlayIdRef.current === audioManager.getPlayId() && player) {
              try {
                player.play();
                setPendingPlay(false);
                console.log('[useAudioPlayer] Retry successful');
              } catch (retryError: any) {
                console.error('[useAudioPlayer] Retry also failed:', retryError?.message);
                setError('Unable to start playback. Please try again.');
                setPlaybackState('error');
                setPendingPlay(false);
              }
            }
          }, 500);
        } else {
          setError('Unable to start playback');
          setPlaybackState('error');
          setPendingPlay(false);
        }
      }
    };
    
    attemptPlay();
  }, [pendingPlay, player, setError, setPlaybackState]);

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
    const currentPlayer = audioManager.getPlayer();
    
    // Check if same station - toggle play/pause
    if (currentStationId === station._id && currentPlayer) {
      console.log('[useAudioPlayer] Same station, toggling play/pause');
      try {
        if (status?.playing) {
          currentPlayer.pause();
          setPlaybackState('paused');
        } else {
          currentPlayer.play();
          setPlaybackState('playing');
        }
      } catch (e) {
        console.log('[useAudioPlayer] Toggle error:', e);
      }
      return;
    }

    try {
      // STEP 1: STOP current playback FIRST
      console.log('[useAudioPlayer] Step 1: Stopping current playback...');
      if (currentPlayer) {
        try {
          currentPlayer.pause();
          console.log('[useAudioPlayer] Previous station paused');
        } catch (e) {
          console.log('[useAudioPlayer] Pause error (ignored):', e);
        }
      }
      await audioManager.stop();
      
      // STEP 2: Set loading state
      setPlaybackState('loading');
      setError(null);
      
      // STEP 3: Update station state for immediate UI feedback
      console.log('[useAudioPlayer] Step 2: Setting new station...');
      setCurrentStation(station);
      setMiniPlayerVisible(true);

      // Record click (non-blocking)
      stationService.recordClick(station._id).catch(() => {});

      // STEP 4: Get play ID for race condition prevention
      const myPlayId = audioManager.incrementPlayId();
      console.log('[useAudioPlayer] PlayID:', myPlayId, '- Starting');

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
      
      // STEP 6: Update audio source - this triggers expo-audio to load a NEW player
      audioManager.setCurrentStation(station._id, url);
      setAudioSource(url);
      
      // Set pending play flag - the useEffect will trigger play when player is ready
      pendingPlayIdRef.current = myPlayId;
      setPendingPlay(true);
      
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
    console.log('[useAudioPlayer] Pause called');
    try {
      // Try audioManager's player first (most reliable)
      const managerPlayer = audioManager.getPlayer();
      if (managerPlayer) {
        managerPlayer.pause();
        setPlaybackState('paused');
        console.log('[useAudioPlayer] Paused via audioManager');
        return;
      }
      // Fallback to hook's player
      if (player) {
        player.pause();
        setPlaybackState('paused');
        console.log('[useAudioPlayer] Paused via hook player');
        return;
      }
      console.warn('[useAudioPlayer] Cannot pause - no player instance available');
    } catch (error) {
      console.error('[useAudioPlayer] Error pausing:', error);
    }
  }, [player, setPlaybackState]);

  // Resume playback
  const resume = useCallback(async () => {
    console.log('[useAudioPlayer] Resume called');
    try {
      // Try audioManager's player first (most reliable)
      const managerPlayer = audioManager.getPlayer();
      if (managerPlayer) {
        managerPlayer.play();
        setPlaybackState('playing');
        console.log('[useAudioPlayer] Resumed via audioManager');
        return;
      }
      // Fallback to hook's player
      if (player) {
        player.play();
        setPlaybackState('playing');
        console.log('[useAudioPlayer] Resumed via hook player');
        return;
      }
      console.warn('[useAudioPlayer] Cannot resume - no player instance available');
    } catch (error) {
      console.error('[useAudioPlayer] Error resuming:', error);
    }
  }, [player, setPlaybackState]);

  // Toggle play/pause
  const togglePlayPause = useCallback(async () => {
    console.log('[useAudioPlayer] togglePlayPause called, playbackState:', playbackState);
    
    // Get current player
    const currentPlayer = audioManager.getPlayer() || player;
    console.log('[useAudioPlayer] Current player exists:', !!currentPlayer);
    
    if (playbackState === 'playing') {
      await pause();
    } else if (playbackState === 'paused') {
      await resume();
    } else if ((playbackState === 'idle' || playbackState === 'error') && currentStation) {
      // After sleep timer stops playback or error, allow re-play
      console.log('[useAudioPlayer] Replaying station from', playbackState, 'state');
      await playStation(currentStation);
    } else {
      console.log('[useAudioPlayer] togglePlayPause - no action taken, state:', playbackState, 'hasStation:', !!currentStation);
    }
  }, [playbackState, pause, resume, currentStation, playStation, player]);

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

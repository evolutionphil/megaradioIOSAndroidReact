// useAudioPlayer - Audio playback hook using GLOBAL SINGLETON
// This ensures only ONE audio stream plays at a time across ALL screens
// Every component that uses this hook shares the SAME player instance

import { useCallback, useEffect, useRef } from 'react';
import { 
  useAudioPlayer as useExpoAudioPlayer, 
  useAudioPlayerStatus,
  setAudioModeAsync,
} from 'expo-audio';
import { usePlayerStore } from '../store/playerStore';
import stationService from '../services/stationService';
import userService from '../services/userService';
import type { Station } from '../types';

// ============================================
// GLOBAL SINGLETON STATE
// This state is shared across ALL hook instances
// ============================================
let globalPlayer: any = null;
let globalPlayId = 0;
let currentPlayingStationId: string | null = null;
let listeningStartTime: Date | null = null;
let audioModeConfigured = false;

// ============================================
// HOOK IMPLEMENTATION
// ============================================
export const useAudioPlayer = () => {
  // Create a player instance - but we'll only use ONE globally
  const hookPlayer = useExpoAudioPlayer(null as any);
  const hookStatus = useAudioPlayerStatus(hookPlayer);
  
  // On first mount, set the global player
  const isFirstMount = useRef(true);
  
  useEffect(() => {
    // Register this player as the global one if not set yet
    // Or if we're the "active" component
    if (!globalPlayer || isFirstMount.current) {
      console.log('[useAudioPlayer] Registering global player');
      globalPlayer = hookPlayer;
      isFirstMount.current = false;
    }
  }, [hookPlayer]);

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

  // Configure audio mode ONCE
  useEffect(() => {
    const setupAudio = async () => {
      if (audioModeConfigured) return;
      
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
        });
        audioModeConfigured = true;
        console.log('[useAudioPlayer] Audio mode configured');
      } catch (error) {
        console.error('[useAudioPlayer] Failed to set audio mode:', error);
      }
    };
    setupAudio();
  }, []);

  // Sync playback state with actual player status
  useEffect(() => {
    if (!hookStatus) return;
    
    const isPlaying = hookStatus.playing === true;
    const isBuffering = hookStatus.isBuffering === true;
    
    if (isBuffering && playbackState !== 'buffering') {
      setPlaybackState('buffering');
    } else if (isPlaying && playbackState !== 'playing') {
      setPlaybackState('playing');
    } else if (!isPlaying && !isBuffering && playbackState === 'playing') {
      setPlaybackState('paused');
    }
  }, [hookStatus?.playing, hookStatus?.isBuffering]);

  // Resolve stream URL
  const resolveStreamUrl = useCallback(async (station: Station): Promise<string | null> => {
    try {
      const streamData = await stationService.resolveStream(station.url);

      if (streamData.candidates && streamData.candidates.length > 0) {
        let resolvedUrl = streamData.candidates[0];
        
        const isKnownWorkingHttps = resolvedUrl.includes('stream.laut.fm') || 
                                     resolvedUrl.includes('radiohost.de') ||
                                     resolvedUrl.includes('streamtheworld.com');
        
        if (resolvedUrl.startsWith('http://') || !isKnownWorkingHttps) {
          resolvedUrl = stationService.getProxyUrl(resolvedUrl);
        }

        return resolvedUrl;
      }

      let fallbackUrl = station.url_resolved || station.url;
      return stationService.getProxyUrl(fallbackUrl);
    } catch (error) {
      let fallbackUrl = station.url_resolved || station.url;
      return stationService.getProxyUrl(fallbackUrl);
    }
  }, []);

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
    } catch {}
    
    try {
      const metadata = await stationService.getNowPlaying(stationId);
      if (metadata) {
        setNowPlaying(metadata);
      }
    } catch {}
  }, [setNowPlaying]);

  // ============================================
  // PLAY STATION - THE CRITICAL FUNCTION
  // Always uses the GLOBAL player instance
  // ============================================
  const playStation = useCallback(async (station: Station) => {
    console.log('[useAudioPlayer] ========================================');
    console.log('[useAudioPlayer] PLAY STATION:', station.name);
    console.log('[useAudioPlayer] Station ID:', station._id);
    console.log('[useAudioPlayer] Current playing:', currentPlayingStationId);
    console.log('[useAudioPlayer] ========================================');

    // Use global player - this is the key!
    const player = globalPlayer || hookPlayer;
    
    // Same station? Toggle play/pause
    if (currentPlayingStationId === station._id) {
      console.log('[useAudioPlayer] Same station - toggling play/pause');
      try {
        if (player.playing) {
          player.pause();
          setPlaybackState('paused');
        } else {
          player.play();
          setPlaybackState('playing');
        }
      } catch (e) {
        console.log('[useAudioPlayer] Toggle error:', e);
      }
      return;
    }

    // NEW STATION - Stop everything first!
    const myPlayId = ++globalPlayId;
    console.log('[useAudioPlayer] New PlayID:', myPlayId);

    try {
      // ==========================================
      // STEP 1: STOP CURRENT PLAYBACK IMMEDIATELY
      // This is the critical fix!
      // ==========================================
      console.log('[useAudioPlayer] STEP 1: Stopping current playback...');
      
      // Stop the global player
      if (globalPlayer) {
        try {
          globalPlayer.pause();
          console.log('[useAudioPlayer] Global player paused');
        } catch (e) {
          console.log('[useAudioPlayer] Global pause error (ignored):', e);
        }
      }
      
      // Also stop hook player (in case it's different)
      if (hookPlayer && hookPlayer !== globalPlayer) {
        try {
          hookPlayer.pause();
          console.log('[useAudioPlayer] Hook player paused');
        } catch (e) {
          console.log('[useAudioPlayer] Hook pause error (ignored):', e);
        }
      }

      // Record listening time for previous station
      if (listeningStartTime && currentPlayingStationId) {
        const duration = Math.floor(
          (new Date().getTime() - listeningStartTime.getTime()) / 1000
        );
        if (duration > 5) {
          userService.recordListening(
            currentPlayingStationId,
            duration,
            listeningStartTime.toISOString()
          ).catch(() => {});
        }
      }

      // Clear previous station tracking
      listeningStartTime = null;

      // ==========================================
      // STEP 2: Update UI immediately
      // ==========================================
      console.log('[useAudioPlayer] STEP 2: Updating UI...');
      setPlaybackState('loading');
      setError(null);
      setCurrentStation(station);
      setMiniPlayerVisible(true);
      
      // Update global tracking
      currentPlayingStationId = station._id;

      // Record click (non-blocking)
      stationService.recordClick(station._id).catch(() => {});

      // ==========================================
      // STEP 3: Resolve stream URL
      // ==========================================
      console.log('[useAudioPlayer] STEP 3: Resolving stream URL...');
      const url = await resolveStreamUrl(station);
      if (!url) {
        throw new Error('Could not resolve stream URL');
      }

      // Check if still current request
      if (globalPlayId !== myPlayId) {
        console.log('[useAudioPlayer] Request stale (playId mismatch), aborting');
        return;
      }

      console.log('[useAudioPlayer] Stream URL:', url.substring(0, 60) + '...');
      setStreamUrl(url);

      // ==========================================
      // STEP 4: Replace audio source and play
      // ==========================================
      console.log('[useAudioPlayer] STEP 4: Loading new audio...');
      
      // Use the global player
      const activePlayer = globalPlayer || hookPlayer;
      globalPlayer = activePlayer; // Ensure global is set
      
      activePlayer.replace({ uri: url });
      
      // Wait for source to load
      await new Promise(resolve => setTimeout(resolve, 300));

      // Check again if still current
      if (globalPlayId !== myPlayId) {
        console.log('[useAudioPlayer] Request stale after load, aborting');
        try { activePlayer.pause(); } catch {}
        return;
      }

      // ==========================================
      // STEP 5: Start playback
      // ==========================================
      console.log('[useAudioPlayer] STEP 5: Starting playback...');
      activePlayer.play();
      
      listeningStartTime = new Date();
      setPlaybackState('playing');

      console.log('[useAudioPlayer] ========== NOW PLAYING ==========');

      // Background tasks
      userService.recordRecentlyPlayed(station._id).catch(() => {});
      fetchNowPlaying(station._id);

    } catch (error) {
      console.error('[useAudioPlayer] Play failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to play');
      setPlaybackState('error');
    }
  }, [hookPlayer, resolveStreamUrl, setCurrentStation, setPlaybackState, setStreamUrl, setError, setMiniPlayerVisible, fetchNowPlaying]);

  // Stop playback completely
  const stopPlayback = useCallback(async () => {
    console.log('[useAudioPlayer] ========== STOP PLAYBACK ==========');
    
    // Record listening time
    if (listeningStartTime && currentPlayingStationId) {
      const duration = Math.floor(
        (new Date().getTime() - listeningStartTime.getTime()) / 1000
      );
      if (duration > 5) {
        userService.recordListening(
          currentPlayingStationId,
          duration,
          listeningStartTime.toISOString()
        ).catch(() => {});
      }
    }

    // Increment play ID to cancel pending operations
    globalPlayId++;
    currentPlayingStationId = null;
    listeningStartTime = null;

    // Stop all players
    if (globalPlayer) {
      try { globalPlayer.pause(); } catch {}
    }
    if (hookPlayer && hookPlayer !== globalPlayer) {
      try { hookPlayer.pause(); } catch {}
    }

    setPlaybackState('idle');
    setMiniPlayerVisible(false);
  }, [hookPlayer, setPlaybackState, setMiniPlayerVisible]);

  // Pause
  const pause = useCallback(() => {
    console.log('[useAudioPlayer] Pause');
    const player = globalPlayer || hookPlayer;
    try {
      player.pause();
      setPlaybackState('paused');
    } catch (e) {
      console.error('[useAudioPlayer] Pause error:', e);
    }
  }, [hookPlayer, setPlaybackState]);

  // Resume
  const resume = useCallback(() => {
    console.log('[useAudioPlayer] Resume');
    const player = globalPlayer || hookPlayer;
    try {
      player.play();
      setPlaybackState('playing');
    } catch (e) {
      console.error('[useAudioPlayer] Resume error:', e);
    }
  }, [hookPlayer, setPlaybackState]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    console.log('[useAudioPlayer] Toggle play/pause');
    const player = globalPlayer || hookPlayer;
    const status = hookStatus;
    
    const isPlaying = status?.playing === true;
    
    if (isPlaying) {
      pause();
    } else if (playbackState === 'paused') {
      resume();
    } else if ((playbackState === 'idle' || playbackState === 'error') && currentStation) {
      playStation(currentStation);
    }
  }, [hookPlayer, hookStatus, playbackState, currentStation, pause, resume, playStation]);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    const player = globalPlayer || hookPlayer;
    try {
      player.volume = Math.max(0, Math.min(1, volume));
    } catch {}
  }, [hookPlayer]);

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

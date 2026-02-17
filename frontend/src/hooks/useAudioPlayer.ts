// useAudioPlayer - Audio playback with expo-audio (Expo SDK 54+)
// STABLE IMPLEMENTATION - Uses a single player instance with replace() for changing sources
// Migrated from deprecated expo-av

import { useCallback, useRef, useEffect } from 'react';
import { 
  useAudioPlayer as useExpoAudioPlayer, 
  useAudioPlayerStatus,
  setAudioModeAsync,
} from 'expo-audio';
import { usePlayerStore } from '../store/playerStore';
import stationService from '../services/stationService';
import userService from '../services/userService';
import type { Station } from '../types';

// Global state to track initialization
let audioModeConfigured = false;

// Global tracking for race condition prevention
let globalPlayId = 0;
let currentPlayingStationId: string | null = null;

// Placeholder silent audio URL - needed to initialize player properly
const SILENT_AUDIO_URL = 'https://themegaradio.com/api/silence.mp3';

export const useAudioPlayer = () => {
  const listeningStartRef = useRef<Date | null>(null);
  const playIdRef = useRef<number>(0);
  
  // Initialize player with a valid URL to avoid Android crashes
  // expo-audio requires a valid source on initialization
  const player = useExpoAudioPlayer(SILENT_AUDIO_URL);
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

  // Set up audio mode ONCE globally
  useEffect(() => {
    const setupAudio = async () => {
      if (audioModeConfigured) {
        return;
      }
      
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
    if (!status) return;
    
    // Only update state based on actual player status
    const isActuallyPlaying = status.playing === true;
    const isBuffering = status.isBuffering === true;
    
    if (isBuffering && playbackState !== 'buffering') {
      setPlaybackState('buffering');
    } else if (isActuallyPlaying && playbackState !== 'playing') {
      setPlaybackState('playing');
    } else if (!isActuallyPlaying && !isBuffering && playbackState === 'playing') {
      // Only switch to paused if we were playing and now stopped
      setPlaybackState('paused');
    }
  }, [status?.playing, status?.isBuffering]);

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

  // Fetch now playing metadata - MUST be defined before playStation
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
      // STEP 1: STOP current playback FIRST
      console.log('[useAudioPlayer] Step 1: Stopping current playback...');
      if (player) {
        try {
          player.pause();
          console.log('[useAudioPlayer] Previous station paused');
        } catch (e) {
          console.log('[useAudioPlayer] Pause error (ignored):', e);
        }
      }
      
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

      // STEP 4: Get play ID for race condition prevention
      const myPlayId = audioManager.incrementPlayId();
      console.log('[useAudioPlayer] PlayID:', myPlayId, '- Starting');

      // STEP 5: Resolve stream URL
      console.log('[useAudioPlayer] Step 3: Resolving stream URL...');
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
      audioManager.setCurrentStation(station._id, url);
      
      // STEP 6: Use player.replace() to change source WITHOUT creating new player
      console.log('[useAudioPlayer] Step 4: Replacing audio source...');
      if (player) {
        player.replace({ uri: url });
        
        // Wait for player to load
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Check again if still current
        if (audioManager.getPlayId() !== myPlayId) {
          console.log('[useAudioPlayer] PlayID', myPlayId, '- STALE after load, aborting');
          return;
        }
        
        // STEP 7: Play
        console.log('[useAudioPlayer] Step 5: Playing...');
        player.play();
        setPlaybackState('playing');
        isPlayingRef.current = true;
        
        listeningStartRef.current = new Date();
        console.log('[useAudioPlayer] ========== NOW PLAYING ==========');
      } else {
        console.error('[useAudioPlayer] No player available');
        throw new Error('No audio player available');
      }

      // Record recently played (non-blocking)
      userService.recordRecentlyPlayed(station._id).catch(() => {});

      // Fetch now playing metadata (non-blocking)
      fetchNowPlaying(station._id);

    } catch (error) {
      console.error('[useAudioPlayer] Failed to play station:', error);
      setError(error instanceof Error ? error.message : 'Failed to play station');
      setPlaybackState('error');
    }
  }, [player, resolveStreamUrl, setCurrentStation, setPlaybackState, setStreamUrl, setError, setMiniPlayerVisible, fetchNowPlaying]);

  // Pause playback
  const pause = useCallback(async () => {
    console.log('[useAudioPlayer] Pause called');
    try {
      // Try audioManager's player first (most reliable)
      const managerPlayer = audioManager.getPlayer();
      if (managerPlayer) {
        managerPlayer.pause();
        setPlaybackState('paused');
        isPlayingRef.current = false;
        console.log('[useAudioPlayer] Paused via audioManager');
        return;
      }
      // Fallback to hook's player
      if (player) {
        player.pause();
        setPlaybackState('paused');
        isPlayingRef.current = false;
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
        isPlayingRef.current = true;
        console.log('[useAudioPlayer] Resumed via audioManager');
        return;
      }
      // Fallback to hook's player
      if (player) {
        player.play();
        setPlaybackState('playing');
        isPlayingRef.current = true;
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

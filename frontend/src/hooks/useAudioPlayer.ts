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

export const useAudioPlayer = () => {
  const listeningStartRef = useRef<Date | null>(null);
  const playIdRef = useRef<number>(0);
  
  // Initialize player - expo-audio SDK 54+ supports null/undefined initialization
  // We use replace() to set the actual audio source when playing
  const player = useExpoAudioPlayer(null as any);
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

  // STOP playback completely
  const stopPlayback = useCallback(async () => {
    console.log('[useAudioPlayer] ========== STOP PLAYBACK ==========');
    
    // Record listening time if there was a previous station
    if (listeningStartRef.current && currentPlayingStationId) {
      const duration = Math.floor(
        (new Date().getTime() - listeningStartRef.current.getTime()) / 1000
      );
      if (duration > 5) {
        try {
          await userService.recordListening(
            currentPlayingStationId,
            duration,
            listeningStartRef.current.toISOString()
          );
        } catch {
          // Non-critical
        }
      }
      listeningStartRef.current = null;
    }

    // Increment play ID to invalidate any pending operations
    globalPlayId++;
    currentPlayingStationId = null;
    
    // Pause the player
    try {
      player.pause();
    } catch (e) {
      console.log('[useAudioPlayer] Pause error (ignored):', e);
    }
    
    setPlaybackState('idle');
    setMiniPlayerVisible(false);
    
    console.log('[useAudioPlayer] ========== STOPPED ==========');
  }, [player, setPlaybackState, setMiniPlayerVisible]);

  // PLAY a station - the core function
  const playStation = useCallback(async (station: Station) => {
    console.log('[useAudioPlayer] ========== PLAY STATION ==========');
    console.log('[useAudioPlayer] Station:', station.name, 'ID:', station._id);
    
    // Check if same station - toggle play/pause instead
    if (currentPlayingStationId === station._id) {
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
      // STEP 1: Stop any current playback FIRST
      console.log('[useAudioPlayer] Step 1: Stopping current playback...');
      try {
        player.pause();
        console.log('[useAudioPlayer] Previous playback paused');
      } catch (e) {
        console.log('[useAudioPlayer] Pause error (ignored):', e);
      }
      
      // STEP 2: Set loading state immediately for UI feedback
      setPlaybackState('loading');
      setError(null);
      setCurrentStation(station);
      setMiniPlayerVisible(true);

      // Record click (non-blocking)
      stationService.recordClick(station._id).catch(() => {});

      // STEP 3: Get unique play ID for race condition prevention
      const myPlayId = ++globalPlayId;
      playIdRef.current = myPlayId;
      console.log('[useAudioPlayer] PlayID:', myPlayId);

      // STEP 4: Resolve stream URL
      console.log('[useAudioPlayer] Step 2: Resolving stream URL...');
      const url = await resolveStreamUrl(station);
      if (!url) {
        throw new Error('Could not resolve stream URL');
      }
      
      // Check if we're still the current play request (user might have clicked another station)
      if (globalPlayId !== myPlayId) {
        console.log('[useAudioPlayer] PlayID', myPlayId, '- STALE, aborting (new request made)');
        return;
      }

      console.log('[useAudioPlayer] Stream URL resolved:', url.substring(0, 60) + '...');
      setStreamUrl(url);
      
      // STEP 5: Replace the audio source and play
      console.log('[useAudioPlayer] Step 3: Replacing audio source...');
      player.replace({ uri: url });
      
      // Small delay to let the player initialize the new source
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check again if still current
      if (globalPlayId !== myPlayId) {
        console.log('[useAudioPlayer] PlayID', myPlayId, '- STALE after replace, aborting');
        return;
      }
      
      // STEP 6: Start playback
      console.log('[useAudioPlayer] Step 4: Starting playback...');
      player.play();
      
      // Update tracking
      currentPlayingStationId = station._id;
      listeningStartRef.current = new Date();
      setPlaybackState('playing');
      
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
  }, [player, status?.playing, resolveStreamUrl, setCurrentStation, setPlaybackState, setStreamUrl, setError, setMiniPlayerVisible, fetchNowPlaying]);

  // Pause playback
  const pause = useCallback(() => {
    console.log('[useAudioPlayer] Pause called');
    try {
      player.pause();
      setPlaybackState('paused');
      console.log('[useAudioPlayer] Paused successfully');
    } catch (error) {
      console.error('[useAudioPlayer] Error pausing:', error);
    }
  }, [player, setPlaybackState]);

  // Resume playback
  const resume = useCallback(() => {
    console.log('[useAudioPlayer] Resume called');
    try {
      player.play();
      setPlaybackState('playing');
      console.log('[useAudioPlayer] Resumed successfully');
    } catch (error) {
      console.error('[useAudioPlayer] Error resuming:', error);
    }
  }, [player, setPlaybackState]);

  // Toggle play/pause - SIMPLE AND DIRECT
  const togglePlayPause = useCallback(() => {
    console.log('[useAudioPlayer] togglePlayPause called');
    console.log('[useAudioPlayer] Current playbackState:', playbackState);
    console.log('[useAudioPlayer] Player status.playing:', status?.playing);
    
    // Use actual player status as source of truth
    const isActuallyPlaying = status?.playing === true;
    
    if (isActuallyPlaying) {
      console.log('[useAudioPlayer] Currently playing -> Pausing');
      pause();
    } else if (playbackState === 'paused' || (currentStation && currentPlayingStationId === currentStation._id)) {
      console.log('[useAudioPlayer] Currently paused -> Resuming');
      resume();
    } else if ((playbackState === 'idle' || playbackState === 'error') && currentStation) {
      // Need to restart playback
      console.log('[useAudioPlayer] Idle/Error state with station -> Replaying');
      playStation(currentStation);
    } else {
      console.log('[useAudioPlayer] No action - state:', playbackState, 'station:', currentStation?.name);
    }
  }, [playbackState, status?.playing, currentStation, pause, resume, playStation]);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    try {
      player.volume = Math.max(0, Math.min(1, volume));
      console.log('[useAudioPlayer] Volume set to:', volume);
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

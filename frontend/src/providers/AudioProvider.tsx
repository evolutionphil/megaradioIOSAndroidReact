// AudioProvider - Single shared audio player for the entire app
// This ensures only ONE native audio player exists across all screens

import React, { createContext, useCallback, useEffect, useRef, useState, ReactNode } from 'react';
import { 
  createAudioPlayer,
  setAudioModeAsync,
  AudioPlayer,
  AudioStatus,
} from 'expo-audio';
import { usePlayerStore } from '../store/playerStore';
import stationService from '../services/stationService';
import userService from '../services/userService';
import type { Station } from '../types';

// ============================================
// TYPES
// ============================================
export interface AudioContextType {
  playStation: (station: Station) => Promise<void>;
  stopPlayback: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  togglePlayPause: () => void;
  setVolume: (volume: number) => void;
  currentStation: Station | null;
  playbackState: string;
  streamUrl: string | null;
  isPlaying: boolean;
}

// ============================================
// CONTEXT - exported for use in useAudioPlayer hook
// ============================================
export const AudioContext = createContext<AudioContextType | null>(null);

// ============================================
// GLOBAL STATE (module level - truly singleton)
// ============================================
let audioModeConfigured = false;
let globalPlayId = 0;
let currentPlayingStationId: string | null = null;
let listeningStartTime: Date | null = null;

// ============================================
// PROVIDER COMPONENT
// ============================================
export const AudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState<AudioStatus | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);

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
  } = usePlayerStore();

  // Configure audio mode and create player ONCE at app start
  useEffect(() => {
    const setupAudio = async () => {
      if (audioModeConfigured) {
        setIsReady(true);
        return;
      }
      
      try {
        console.log('[AudioProvider] Setting up audio mode...');
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
        });
        audioModeConfigured = true;
        console.log('[AudioProvider] Audio mode configured');
      } catch (error) {
        console.error('[AudioProvider] Failed to set audio mode:', error);
        // Continue anyway - audio might still work
      }
      
      // Create player instance using createAudioPlayer (not useAudioPlayer hook)
      try {
        if (!playerRef.current) {
          console.log('[AudioProvider] Creating audio player...');
          const player = createAudioPlayer();
          
          // Set up status listener
          player.addListener('playbackStatusUpdate', (newStatus: AudioStatus) => {
            setStatus(newStatus);
          });
          
          playerRef.current = player;
          console.log('[AudioProvider] Audio player created');
        }
      } catch (error) {
        console.error('[AudioProvider] Failed to create audio player:', error);
      }
      
      setIsReady(true);
    };
    
    setupAudio();
    
    // Cleanup on unmount
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.release();
          playerRef.current = null;
        } catch (e) {
          console.log('[AudioProvider] Cleanup error:', e);
        }
      }
    };
  }, []);

  // Sync playback state with actual player status
  useEffect(() => {
    if (!status) return;
    
    const isPlaying = status.playing === true;
    const isBuffering = status.isBuffering === true;
    
    if (isBuffering && playbackState !== 'buffering') {
      setPlaybackState('buffering');
    } else if (isPlaying && playbackState !== 'playing') {
      setPlaybackState('playing');
    } else if (!isPlaying && !isBuffering && playbackState === 'playing') {
      setPlaybackState('paused');
    }
  }, [status?.playing, status?.isBuffering, playbackState, setPlaybackState]);

  // Resolve stream URL helper
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

  // Fetch now playing helper
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
  // PLAY STATION - THE CORE FUNCTION
  // ============================================
  const playStation = useCallback(async (station: Station) => {
    console.log('[AudioProvider] ========================================');
    console.log('[AudioProvider] PLAY STATION:', station.name);
    console.log('[AudioProvider] Station ID:', station._id);
    console.log('[AudioProvider] Current playing:', currentPlayingStationId);
    console.log('[AudioProvider] ========================================');

    const player = playerRef.current;
    if (!player) {
      console.error('[AudioProvider] No player available');
      setError('Audio player not ready');
      return;
    }

    // Same station? Toggle play/pause
    if (currentPlayingStationId === station._id) {
      console.log('[AudioProvider] Same station - toggling');
      if (status?.playing) {
        player.pause();
        setPlaybackState('paused');
      } else {
        player.play();
        setPlaybackState('playing');
      }
      return;
    }

    // NEW STATION - increment play ID for race condition prevention
    const myPlayId = ++globalPlayId;
    console.log('[AudioProvider] New PlayID:', myPlayId);

    try {
      // STEP 1: STOP CURRENT PLAYBACK IMMEDIATELY
      console.log('[AudioProvider] STEP 1: Stopping current playback...');
      try {
        player.pause();
        console.log('[AudioProvider] Player paused');
      } catch (e) {
        console.log('[AudioProvider] Pause error (ignored):', e);
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
        listeningStartTime = null;
      }

      // STEP 2: Update UI immediately
      console.log('[AudioProvider] STEP 2: Updating UI...');
      setPlaybackState('loading');
      setError(null);
      setCurrentStation(station);
      setMiniPlayerVisible(true);
      currentPlayingStationId = station._id;

      // Record click (non-blocking)
      stationService.recordClick(station._id).catch(() => {});

      // STEP 3: Resolve stream URL
      console.log('[AudioProvider] STEP 3: Resolving stream URL...');
      const url = await resolveStreamUrl(station);
      if (!url) {
        throw new Error('Could not resolve stream URL');
      }

      // Check if still current request
      if (globalPlayId !== myPlayId) {
        console.log('[AudioProvider] Request stale, aborting');
        return;
      }

      console.log('[AudioProvider] Stream URL:', url.substring(0, 60) + '...');
      setStreamUrl(url);

      // STEP 4: Replace audio source and play
      console.log('[AudioProvider] STEP 4: Loading new audio...');
      player.replace({ uri: url });
      
      // Wait for source to load
      await new Promise(resolve => setTimeout(resolve, 300));

      // Check again if still current
      if (globalPlayId !== myPlayId) {
        console.log('[AudioProvider] Request stale after load, aborting');
        try { player.pause(); } catch {}
        return;
      }

      // STEP 5: Start playback
      console.log('[AudioProvider] STEP 5: Starting playback...');
      player.play();
      
      listeningStartTime = new Date();
      setPlaybackState('playing');

      console.log('[AudioProvider] ========== NOW PLAYING ==========');

      // Background tasks
      userService.recordRecentlyPlayed(station._id).catch(() => {});
      fetchNowPlaying(station._id);

    } catch (error) {
      console.error('[AudioProvider] Play failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to play');
      setPlaybackState('error');
    }
  }, [status?.playing, resolveStreamUrl, setCurrentStation, setPlaybackState, setStreamUrl, setError, setMiniPlayerVisible, fetchNowPlaying]);

  // Stop playback completely
  const stopPlayback = useCallback(async () => {
    console.log('[AudioProvider] ========== STOP PLAYBACK ==========');
    
    const player = playerRef.current;
    
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
      listeningStartTime = null;
    }

    globalPlayId++;
    currentPlayingStationId = null;

    try {
      if (player) {
        player.pause();
      }
    } catch {}

    setPlaybackState('idle');
    setMiniPlayerVisible(false);
  }, [setPlaybackState, setMiniPlayerVisible]);

  // Pause
  const pause = useCallback(() => {
    console.log('[AudioProvider] Pause');
    const player = playerRef.current;
    try {
      if (player) {
        player.pause();
        setPlaybackState('paused');
      }
    } catch (e) {
      console.error('[AudioProvider] Pause error:', e);
    }
  }, [setPlaybackState]);

  // Resume
  const resume = useCallback(() => {
    console.log('[AudioProvider] Resume');
    const player = playerRef.current;
    try {
      if (player) {
        player.play();
        setPlaybackState('playing');
      }
    } catch (e) {
      console.error('[AudioProvider] Resume error:', e);
    }
  }, [setPlaybackState]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    console.log('[AudioProvider] Toggle play/pause, status:', status?.playing);
    
    if (status?.playing) {
      pause();
    } else if (playbackState === 'paused') {
      resume();
    } else if ((playbackState === 'idle' || playbackState === 'error') && currentStation) {
      playStation(currentStation);
    }
  }, [status?.playing, playbackState, currentStation, pause, resume, playStation]);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    const player = playerRef.current;
    try {
      if (player) {
        player.volume = Math.max(0, Math.min(1, volume));
      }
    } catch {}
  }, []);

  const value: AudioContextType = {
    playStation,
    stopPlayback,
    pause,
    resume,
    togglePlayPause,
    setVolume,
    currentStation,
    playbackState,
    streamUrl,
    isPlaying: status?.playing === true,
  };

  // Always render children, even if audio isn't ready yet
  // This prevents blank screen on startup
  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};

export default AudioProvider;

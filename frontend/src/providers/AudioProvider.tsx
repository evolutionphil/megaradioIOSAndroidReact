// AudioProvider - Single shared audio player for the entire app
// This ensures only ONE native audio player exists across all screens

import React, { createContext, useCallback, useEffect, useRef, useState, ReactNode } from 'react';
import { 
  useAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
  AudioPlayer,
} from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePlayerStore } from '../store/playerStore';
import stationService from '../services/stationService';
import userService from '../services/userService';
import statsService from '../services/statsService';
import type { Station } from '../types';

// Storage key for last played station
const LAST_PLAYED_STATION_KEY = '@megaradio_last_played_station';

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
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const nowPlayingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use the hook-based API - more compatible with legacy architecture
  // Initialize with undefined/null to avoid playing anything at start
  // showNowPlayingNotification: true enables lock screen controls
  const player = useAudioPlayer(undefined, { showNowPlayingNotification: true });
  const status = useAudioPlayerStatus(player);
  
  const playerRef = useRef<AudioPlayer>(player);
  playerRef.current = player;

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

  // Start stats tracking interval when playing
  const startStatsTracking = useCallback(() => {
    // Clear any existing interval
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }
    
    // Update listening time every minute
    statsIntervalRef.current = setInterval(() => {
      statsService.updateListeningTime().catch(console.error);
      console.log('[AudioProvider] Stats: Updated listening time');
    }, 60000); // Every 60 seconds
    
    console.log('[AudioProvider] Stats: Started tracking interval');
  }, []);

  // Stop stats tracking interval
  const stopStatsTracking = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
      console.log('[AudioProvider] Stats: Stopped tracking interval');
    }
    if (nowPlayingIntervalRef.current) {
      clearInterval(nowPlayingIntervalRef.current);
      nowPlayingIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStatsTracking();
    };
  }, [stopStatsTracking]);

  // Configure audio mode ONCE at app start
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
      }
      
      setIsReady(true);
    };
    
    setupAudio();
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

  // Fetch now playing helper - also updates lock screen metadata
  const fetchNowPlaying = useCallback(async (stationId: string) => {
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || '';
    
    try {
      const response = await fetch(`${backendUrl}/api/now-playing/${stationId}`);
      if (response.ok) {
        const metadata = await response.json();
        if (metadata && (metadata.title || metadata.artist)) {
          setNowPlaying(metadata);
          
          // Update lock screen with current song info
          try {
            const station = usePlayerStore.getState().currentStation;
            if (station && playerRef.current) {
              // Get proper artwork URL
              let artworkUrl = 'https://themegaradio.com/logo.png';
              if (station.logo && station.logo.startsWith('http')) {
                artworkUrl = station.logo;
              } else if (station.favicon && station.favicon.startsWith('http')) {
                artworkUrl = station.favicon;
              } else if (station.logo && station.logo.startsWith('/')) {
                artworkUrl = `https://themegaradio.com${station.logo}`;
              }
              if (artworkUrl.startsWith('http://')) {
                artworkUrl = artworkUrl.replace('http://', 'https://');
              }
              
              // Build display text - show song info if available
              const songTitle = metadata.title || station.name;
              const artistName = metadata.artist || 'MegaRadio';
              
              // Update lock screen with new song info
              playerRef.current.updateLockScreenMetadata({
                title: songTitle,
                artist: artistName,
                album: station.name,
                artworkUrl: artworkUrl,
              });
              console.log('[AudioProvider] Lock screen updated with now playing:', songTitle, '-', artistName);
            }
          } catch (e) {
            console.log('[AudioProvider] Could not update lock screen:', e);
          }
          return;
        }
      }
    } catch {}
    
    try {
      const metadata = await stationService.getNowPlaying(stationId);
      if (metadata) {
        setNowPlaying(metadata);
        
        // Update lock screen with current song info
        try {
          const station = usePlayerStore.getState().currentStation;
          if (station && playerRef.current) {
            let artworkUrl = 'https://themegaradio.com/logo.png';
            if (station.logo && station.logo.startsWith('http')) {
              artworkUrl = station.logo;
            } else if (station.favicon && station.favicon.startsWith('http')) {
              artworkUrl = station.favicon;
            } else if (station.logo && station.logo.startsWith('/')) {
              artworkUrl = `https://themegaradio.com${station.logo}`;
            }
            if (artworkUrl.startsWith('http://')) {
              artworkUrl = artworkUrl.replace('http://', 'https://');
            }
            
            const songTitle = metadata.title || station.name;
            const artistName = metadata.artist || 'MegaRadio';
            
            playerRef.current.updateLockScreenMetadata({
              title: songTitle,
              artist: artistName,
              album: station.name,
              artworkUrl: artworkUrl,
            });
          }
        } catch (e) {}
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

    // Same station? Toggle play/pause
    if (currentPlayingStationId === station._id) {
      console.log('[AudioProvider] Same station - toggling');
      if (status?.playing) {
        playerRef.current.pause();
        setPlaybackState('paused');
      } else {
        playerRef.current.play();
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
        playerRef.current.pause();
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

      // STEP 4: Replace audio source
      console.log('[AudioProvider] STEP 4: Loading new audio...');
      playerRef.current.replace({ uri: url });
      
      // Wait for source to load
      await new Promise(resolve => setTimeout(resolve, 300));

      // Check again if still current
      if (globalPlayId !== myPlayId) {
        console.log('[AudioProvider] Request stale after load, aborting');
        try { playerRef.current.pause(); } catch {}
        return;
      }

      // STEP 5: Setup Lock Screen / Control Center BEFORE starting playback
      console.log('[AudioProvider] STEP 5: Setting up lock screen controls...');
      try {
        // Get station logo URL - ensure it's a valid HTTPS URL
        let artworkUrl = 'https://themegaradio.com/logo.png'; // Default fallback
        
        // Check various logo sources - prioritize high quality images
        if (station.logo && station.logo.startsWith('http')) {
          artworkUrl = station.logo;
        } else if (station.favicon && station.favicon.startsWith('http')) {
          artworkUrl = station.favicon;
        } else if (station.logo && station.logo.startsWith('/')) {
          artworkUrl = `https://themegaradio.com${station.logo}`;
        } else if (station.favicon && station.favicon.startsWith('/')) {
          artworkUrl = `https://themegaradio.com${station.favicon}`;
        }
        
        // Ensure HTTPS for iOS App Transport Security
        if (artworkUrl.startsWith('http://')) {
          artworkUrl = artworkUrl.replace('http://', 'https://');
        }
        
        console.log('[AudioProvider] Lock Screen Artwork URL:', artworkUrl);
        
        // Activate player for lock screen controls BEFORE starting playback
        // This is REQUIRED for iOS Control Center and Android notification bar
        await playerRef.current.setActiveForLockScreen(true, {
          title: station.name,
          artist: 'MegaRadio',
          album: station.country || 'Live Radio',
          artworkUrl: artworkUrl,
        }, {
          // Options for lock screen controls (live radio doesn't need seek)
          showSeekForward: false,
          showSeekBackward: false,
        });
        
        console.log('[AudioProvider] Lock screen ACTIVATED with metadata:', {
          title: station.name,
          artist: 'MegaRadio',
          album: station.country || 'Live Radio',
          artworkUrl: artworkUrl
        });
      } catch (metaError) {
        console.log('[AudioProvider] Could not setup lock screen:', metaError);
      }

      // STEP 6: Start playback AFTER lock screen is setup
      console.log('[AudioProvider] STEP 6: Starting playback...');
      playerRef.current.play();
      
      listeningStartTime = new Date();
      setPlaybackState('playing');
          artworkUrl = `https://themegaradio.com${station.logo}`;
        } else if (station.favicon && station.favicon.startsWith('/')) {
          artworkUrl = `https://themegaradio.com${station.favicon}`;
        }
        
        // Ensure HTTPS for iOS App Transport Security
        if (artworkUrl.startsWith('http://')) {
          artworkUrl = artworkUrl.replace('http://', 'https://');
        }
        
        console.log('[AudioProvider] Lock Screen Artwork URL:', artworkUrl);
        
        // First, activate the player for lock screen controls
        // This is REQUIRED for iOS Control Center and Android notification bar
        await playerRef.current.setActiveForLockScreen(true, {
          title: station.name,
          artist: 'MegaRadio',
          album: station.country || 'Live Radio',
          artworkUrl: artworkUrl,
        });
        
        console.log('[AudioProvider] Lock screen activated with metadata:', {
          title: station.name,
          artist: 'MegaRadio',
          album: station.country || 'Live Radio',
          artworkUrl: artworkUrl
        });
      } catch (metaError) {
        console.log('[AudioProvider] Could not setup lock screen:', metaError);
        // Fallback: try updateLockScreenMetadata only
        try {
          playerRef.current.updateLockScreenMetadata({
            title: station.name,
            artist: 'MegaRadio',
            album: station.country || 'Live Radio',
          });
        } catch (e) {
          console.log('[AudioProvider] Fallback metadata update also failed:', e);
        }
      }

      console.log('[AudioProvider] ========== NOW PLAYING ==========');

      // Background tasks
      userService.recordRecentlyPlayed(station._id).catch(() => {});
      fetchNowPlaying(station._id);

      // Save as last played station for "Play at Login" feature
      try {
        await AsyncStorage.setItem(LAST_PLAYED_STATION_KEY, JSON.stringify(station));
        console.log('[AudioProvider] Saved as last played station');
      } catch (e) {
        console.log('[AudioProvider] Failed to save last played:', e);
      }

      // STEP 7: Start statistics tracking
      console.log('[AudioProvider] STEP 7: Starting statistics tracking...');
      try {
        // End any previous session first
        await statsService.endSession();
        // Start new session
        await statsService.startSession(
          station._id,
          station.name,
          station.favicon || station.logo
        );
        // Start the tracking interval
        startStatsTracking();
        console.log('[AudioProvider] Stats session started for:', station.name);
      } catch (e) {
        console.log('[AudioProvider] Failed to start stats session:', e);
      }

      // STEP 8: Start now playing interval to update lock screen periodically
      console.log('[AudioProvider] STEP 8: Starting now playing interval...');
      if (nowPlayingIntervalRef.current) {
        clearInterval(nowPlayingIntervalRef.current);
      }
      // Update now playing every 30 seconds
      nowPlayingIntervalRef.current = setInterval(() => {
        if (currentPlayingStationId) {
          fetchNowPlaying(currentPlayingStationId);
        }
      }, 30000);

    } catch (error) {
      console.error('[AudioProvider] Play failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to play');
      setPlaybackState('error');
    }
  }, [status?.playing, resolveStreamUrl, setCurrentStation, setPlaybackState, setStreamUrl, setError, setMiniPlayerVisible, fetchNowPlaying, startStatsTracking]);

  // Stop playback completely
  const stopPlayback = useCallback(async () => {
    console.log('[AudioProvider] ========== STOP PLAYBACK ==========');
    
    // Stop stats tracking and end session
    stopStatsTracking();
    try {
      await statsService.endSession();
      console.log('[AudioProvider] Stats session ended');
    } catch (e) {
      console.log('[AudioProvider] Failed to end stats session:', e);
    }
    
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
      // Deactivate lock screen controls
      await playerRef.current.setActiveForLockScreen(false);
      console.log('[AudioProvider] Lock screen deactivated');
    } catch (e) {
      console.log('[AudioProvider] Could not deactivate lock screen:', e);
    }

    try {
      playerRef.current.pause();
    } catch {}

    setPlaybackState('idle');
    setMiniPlayerVisible(false);
  }, [setPlaybackState, setMiniPlayerVisible, stopStatsTracking]);

  // Pause
  const pause = useCallback(() => {
    console.log('[AudioProvider] Pause');
    try {
      playerRef.current.pause();
      setPlaybackState('paused');
    } catch (e) {
      console.error('[AudioProvider] Pause error:', e);
    }
  }, [setPlaybackState]);

  // Resume
  const resume = useCallback(() => {
    console.log('[AudioProvider] Resume');
    try {
      playerRef.current.play();
      setPlaybackState('playing');
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
    try {
      playerRef.current.volume = Math.max(0, Math.min(1, volume));
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

  // Always render children
  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};

export default AudioProvider;

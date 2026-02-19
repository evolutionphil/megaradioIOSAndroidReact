// AudioProvider - Single shared audio player using react-native-track-player
// This provides TRUE background audio and lock screen controls for iOS/Android

import React, { createContext, useCallback, useEffect, useRef, useState, ReactNode } from 'react';
import TrackPlayer, { 
  Capability, 
  State, 
  Event, 
  usePlaybackState, 
  useProgress,
  AppKilledPlaybackBehavior,
  useTrackPlayerEvents,
} from 'react-native-track-player';
import { Platform } from 'react-native';
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
let trackPlayerInitialized = false;
let globalPlayId = 0;
let currentPlayingStationId: string | null = null;
let listeningStartTime: Date | null = null;

// ============================================
// TRACK PLAYER SETUP
// ============================================
async function setupTrackPlayer(): Promise<boolean> {
  if (trackPlayerInitialized) {
    console.log('[AudioProvider] Track Player already initialized');
    return true;
  }

  try {
    console.log('[AudioProvider] Initializing Track Player...');
    
    // Check if already setup (in case of hot reload)
    try {
      const state = await TrackPlayer.getPlaybackState();
      if (state.state !== State.None) {
        console.log('[AudioProvider] Track Player was already setup');
        trackPlayerInitialized = true;
        return true;
      }
    } catch {
      // Not setup yet, continue
    }

    await TrackPlayer.setupPlayer({
      // iOS specific options
      iosCategory: 'playback',
      iosCategoryMode: 'spokenAudio', // or 'default' for music
      iosCategoryOptions: [
        'allowAirPlay',
        'allowBluetooth',
        'allowBluetoothA2DP',
        'duckOthers', // Lower other app's audio instead of stopping
        'interruptSpokenAudioAndMixWithOthers',
      ],
      // Wait for buffer before playing
      waitForBuffer: true,
    });

    // Configure player capabilities (what controls show on lock screen)
    await TrackPlayer.updateOptions({
      // Android specific
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
      },
      // What buttons to show in notification/control center
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
      ],
      // What buttons are shown in compact notification (Android)
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
      ],
      // Not used for live radio
      progressUpdateEventInterval: 0,
    });

    trackPlayerInitialized = true;
    console.log('[AudioProvider] Track Player initialized successfully!');
    return true;
  } catch (error) {
    console.error('[AudioProvider] Failed to initialize Track Player:', error);
    return false;
  }
}

// ============================================
// PROVIDER COMPONENT
// ============================================
export const AudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const nowPlayingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use Track Player hooks for state
  const playbackState = usePlaybackState();
  
  const {
    currentStation,
    playbackState: storePlaybackState,
    streamUrl,
    setCurrentStation,
    setPlaybackState,
    setStreamUrl,
    setNowPlaying,
    setError,
    setMiniPlayerVisible,
  } = usePlayerStore();

  // Listen to Track Player events
  useTrackPlayerEvents([Event.PlaybackState, Event.PlaybackError], async (event) => {
    if (event.type === Event.PlaybackState) {
      console.log('[AudioProvider] Playback state changed:', event.state);
      
      switch (event.state) {
        case State.Playing:
          setPlaybackState('playing');
          break;
        case State.Paused:
          setPlaybackState('paused');
          break;
        case State.Stopped:
          setPlaybackState('idle');
          break;
        case State.Buffering:
        case State.Loading:
          setPlaybackState('buffering');
          break;
        case State.Error:
          setPlaybackState('error');
          break;
        default:
          break;
      }
    }
    
    if (event.type === Event.PlaybackError) {
      console.error('[AudioProvider] Playback error:', event);
      setError('Stream playback error');
      setPlaybackState('error');
    }
  });

  // Start stats tracking interval when playing
  const startStatsTracking = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }
    
    statsIntervalRef.current = setInterval(() => {
      statsService.updateListeningTime().catch(console.error);
      console.log('[AudioProvider] Stats: Updated listening time');
    }, 60000);
    
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

  // Initialize Track Player
  useEffect(() => {
    // Skip on web
    if (Platform.OS === 'web') {
      console.log('[AudioProvider] Web platform - Track Player not available');
      setIsReady(true);
      return;
    }
    
    setupTrackPlayer().then((success) => {
      if (success) {
        console.log('[AudioProvider] Ready to play!');
      }
      setIsReady(true);
    });
  }, []);

  // Resolve stream URL helper
  // CRITICAL: For native apps, we prefer urlResolved (more reliable) over stream/resolve API
  // Native apps don't have mixed content restrictions, so HTTP streams work directly
  const resolveStreamUrl = useCallback(async (station: Station): Promise<string | null> => {
    // Get urlResolved - API returns camelCase "urlResolved", but types use "url_resolved"
    // Handle both cases for compatibility
    const urlResolved = (station as any).urlResolved || station.url_resolved;
    
    // For native apps: prefer urlResolved directly (more reliable than resolve API)
    if (Platform.OS !== 'web' && urlResolved) {
      console.log('[AudioProvider] Native: Using urlResolved directly:', urlResolved.substring(0, 60));
      // Native apps can play HTTP directly - no proxy needed
      return urlResolved;
    }
    
    try {
      const streamData = await stationService.resolveStream(station.url);

      if (streamData.candidates && streamData.candidates.length > 0) {
        let resolvedUrl = streamData.candidates[0];
        
        // For WEB only: use proxy for HTTP streams (mixed content restriction)
        // Native apps can play HTTP directly
        if (Platform.OS === 'web' && resolvedUrl.startsWith('http://')) {
          console.log('[AudioProvider] Web: HTTP stream detected, using proxy');
          resolvedUrl = stationService.getProxyUrl(resolvedUrl);
        } else {
          console.log('[AudioProvider] Stream URL:', resolvedUrl.substring(0, 60));
        }

        return resolvedUrl;
      }

      // Fallback to urlResolved or original url
      let fallbackUrl = urlResolved || station.url;
      
      // For WEB only: proxy HTTP URLs
      if (Platform.OS === 'web' && fallbackUrl.startsWith('http://')) {
        return stationService.getProxyUrl(fallbackUrl);
      }
      
      return fallbackUrl;
    } catch (error) {
      console.log('[AudioProvider] Stream resolution error, using fallback:', error);
      let fallbackUrl = urlResolved || station.url;
      
      // For WEB only: proxy HTTP URLs
      if (Platform.OS === 'web' && fallbackUrl.startsWith('http://')) {
        return stationService.getProxyUrl(fallbackUrl);
      }
      
      return fallbackUrl;
    }
  }, []);

  // Fetch now playing helper - updates both UI state and lock screen
  const fetchNowPlaying = useCallback(async (stationId: string) => {
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || '';
    
    try {
      const response = await fetch(`${backendUrl}/api/now-playing/${stationId}`);
      if (response.ok) {
        const metadata = await response.json();
        console.log('[AudioProvider] Now Playing API response:', metadata);
        
        if (metadata && (metadata.title || metadata.artist || metadata.song)) {
          setNowPlaying(metadata);
          
          // Update lock screen/notification metadata (native only)
          if (Platform.OS !== 'web') {
            try {
              const station = usePlayerStore.getState().currentStation;
              if (station) {
                // Parse song info - API returns "Artist - Song" format in title
                let songTitle = metadata.song || metadata.title || station.name;
                let artistName = metadata.artist || 'MegaRadio';
                
                // Get artwork URL - favicon is more reliable
                let artworkUrl = 'https://themegaradio.com/logo.png';
                if (station.favicon && station.favicon.startsWith('http')) {
                  artworkUrl = station.favicon;
                } else if (station.logo && station.logo.startsWith('http')) {
                  artworkUrl = station.logo;
                } else if (station.favicon && station.favicon.startsWith('/')) {
                  artworkUrl = `https://themegaradio.com${station.favicon}`;
                } else if (station.logo && station.logo.startsWith('/')) {
                  artworkUrl = `https://themegaradio.com${station.logo}`;
                }
                // Ensure HTTPS for lock screen compatibility
                if (artworkUrl.startsWith('http://')) {
                  artworkUrl = artworkUrl.replace('http://', 'https://');
                }
                
                const newMetadata = {
                  title: songTitle,
                  artist: artistName,
                  album: station.name,
                  artwork: artworkUrl,
                };
                
                console.log('[AudioProvider] Updating lock screen metadata:', newMetadata);
                
                // Update NOW PLAYING metadata (for live streams, doesn't change track)
                await TrackPlayer.updateNowPlayingMetadata(newMetadata);
                
                // Also update the track metadata for consistency
                const activeIndex = await TrackPlayer.getActiveTrackIndex();
                if (activeIndex !== null && activeIndex !== undefined) {
                  await TrackPlayer.updateMetadataForTrack(activeIndex, newMetadata);
                }
                
                console.log('[AudioProvider] Lock screen updated:', songTitle, '-', artistName);
              }
            } catch (e) {
              console.log('[AudioProvider] Could not update lock screen:', e);
            }
          }
          return;
        }
      }
    } catch (err) {
      console.log('[AudioProvider] Now playing fetch error:', err);
    }
    
    // Fallback to station service
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

    // Web fallback - just update UI state
    if (Platform.OS === 'web') {
      console.log('[AudioProvider] Web platform - playback not supported');
      setCurrentStation(station);
      setMiniPlayerVisible(true);
      return;
    }

    // Same station? Toggle play/pause
    if (currentPlayingStationId === station._id) {
      console.log('[AudioProvider] Same station - toggling');
      const state = await TrackPlayer.getPlaybackState();
      if (state.state === State.Playing) {
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.play();
      }
      return;
    }

    // NEW STATION - increment play ID for race condition prevention
    const myPlayId = ++globalPlayId;
    console.log('[AudioProvider] New PlayID:', myPlayId);

    try {
      // STEP 1: STOP CURRENT PLAYBACK
      console.log('[AudioProvider] STEP 1: Stopping current playback...');
      await TrackPlayer.reset();

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

      // STEP 4: Get artwork URL - favicon is more reliable
      let artworkUrl = 'https://themegaradio.com/logo.png';
      if (station.favicon && station.favicon.startsWith('http')) {
        artworkUrl = station.favicon;
      } else if (station.logo && station.logo.startsWith('http')) {
        artworkUrl = station.logo;
      } else if (station.favicon && station.favicon.startsWith('/')) {
        artworkUrl = `https://themegaradio.com${station.favicon}`;
      } else if (station.logo && station.logo.startsWith('/')) {
        artworkUrl = `https://themegaradio.com${station.logo}`;
      }
      // Ensure HTTPS for lock screen compatibility
      if (artworkUrl.startsWith('http://')) {
        artworkUrl = artworkUrl.replace('http://', 'https://');
      }
      console.log('[AudioProvider] Artwork URL:', artworkUrl);

      // STEP 5: Add track to player with metadata
      console.log('[AudioProvider] STEP 5: Adding track with metadata...');
      await TrackPlayer.add({
        id: station._id,
        url: url,
        title: station.name,
        artist: 'MegaRadio',
        album: station.country || 'Live Radio',
        artwork: artworkUrl,
        // For live streams
        isLiveStream: true,
      });

      // STEP 6: Start playback
      console.log('[AudioProvider] STEP 6: Starting playback...');
      await TrackPlayer.play();
      
      listeningStartTime = new Date();

      console.log('[AudioProvider] ========== NOW PLAYING ==========');

      // Background tasks
      userService.recordRecentlyPlayed(station._id).catch(() => {});
      fetchNowPlaying(station._id);

      // Save as last played station
      try {
        await AsyncStorage.setItem(LAST_PLAYED_STATION_KEY, JSON.stringify(station));
        console.log('[AudioProvider] Saved as last played station');
      } catch (e) {
        console.log('[AudioProvider] Failed to save last played:', e);
      }

      // STEP 7: Start statistics tracking
      console.log('[AudioProvider] STEP 7: Starting statistics tracking...');
      try {
        await statsService.endSession();
        await statsService.startSession(
          station._id,
          station.name,
          station.favicon || station.logo
        );
        startStatsTracking();
        console.log('[AudioProvider] Stats session started for:', station.name);
      } catch (e) {
        console.log('[AudioProvider] Failed to start stats session:', e);
      }

      // STEP 8: Start now playing interval
      console.log('[AudioProvider] STEP 8: Starting now playing interval...');
      if (nowPlayingIntervalRef.current) {
        clearInterval(nowPlayingIntervalRef.current);
      }
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
  }, [resolveStreamUrl, setCurrentStation, setPlaybackState, setStreamUrl, setError, setMiniPlayerVisible, fetchNowPlaying, startStatsTracking]);

  // Stop playback completely
  const stopPlayback = useCallback(async () => {
    console.log('[AudioProvider] ========== STOP PLAYBACK ==========');
    
    // Stop stats tracking
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

    // Web check
    if (Platform.OS === 'web') {
      setPlaybackState('idle');
      setMiniPlayerVisible(false);
      return;
    }

    try {
      await TrackPlayer.reset();
    } catch {}

    setPlaybackState('idle');
    setMiniPlayerVisible(false);
  }, [setPlaybackState, setMiniPlayerVisible, stopStatsTracking]);

  // Pause
  const pause = useCallback(async () => {
    console.log('[AudioProvider] Pause');
    if (Platform.OS === 'web') {
      setPlaybackState('paused');
      return;
    }
    try {
      await TrackPlayer.pause();
    } catch (e) {
      console.error('[AudioProvider] Pause error:', e);
    }
  }, [setPlaybackState]);

  // Resume
  const resume = useCallback(async () => {
    console.log('[AudioProvider] Resume');
    if (Platform.OS === 'web') {
      setPlaybackState('playing');
      return;
    }
    try {
      await TrackPlayer.play();
    } catch (e) {
      console.error('[AudioProvider] Resume error:', e);
    }
  }, [setPlaybackState]);

  // Toggle play/pause
  const togglePlayPause = useCallback(async () => {
    console.log('[AudioProvider] Toggle play/pause');
    
    if (Platform.OS === 'web') {
      if (storePlaybackState === 'playing') {
        setPlaybackState('paused');
      } else if (currentStation) {
        setPlaybackState('playing');
      }
      return;
    }
    
    try {
      const state = await TrackPlayer.getPlaybackState();
      
      if (state.state === State.Playing) {
        await TrackPlayer.pause();
      } else if (state.state === State.Paused) {
        await TrackPlayer.play();
      } else if (currentStation) {
        // Try to play current station
        await playStation(currentStation);
      }
    } catch (e) {
      console.error('[AudioProvider] Toggle error:', e);
    }
  }, [storePlaybackState, currentStation, playStation, setPlaybackState]);

  // Set volume
  const setVolume = useCallback(async (volume: number) => {
    if (Platform.OS === 'web') return;
    try {
      await TrackPlayer.setVolume(Math.max(0, Math.min(1, volume)));
    } catch {}
  }, []);

  // Determine if playing from playback state
  const isPlaying = playbackState.state === State.Playing;

  const value: AudioContextType = {
    playStation,
    stopPlayback,
    pause,
    resume,
    togglePlayPause,
    setVolume,
    currentStation,
    playbackState: storePlaybackState,
    streamUrl,
    isPlaying,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};

export default AudioProvider;

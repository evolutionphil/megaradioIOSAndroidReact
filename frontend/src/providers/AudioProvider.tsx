// AudioProvider - Single shared audio player using react-native-track-player
// This provides TRUE background audio and lock screen controls for iOS/Android

import React, { createContext, useCallback, useEffect, useRef, useState, ReactNode } from 'react';
import { sendLog } from '../services/remoteLog';
sendLog('AUDIO_PROVIDER_FILE_LOADING');

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
import { useFavoritesStore } from '../store/favoritesStore';
import { useRecentlyPlayedStore } from '../store/recentlyPlayedStore';
import stationService from '../services/stationService';
import userService from '../services/userService';
import statsService from '../services/statsService';
import watchService from '../services/watchService';
import wearOSService from '../services/wearOSService';
import { adMobService } from '../services/adMobService';
import { genreService } from '../services/genreService';
import api from '../services/api';
import { API_ENDPOINTS } from '../constants/api';
import type { Station } from '../types';
sendLog('AUDIO_PROVIDER_IMPORTS_DONE');

// Country name to flag emoji mapping
const COUNTRY_FLAGS: { [key: string]: string } = {
  'Turkey': '\u{1F1F9}\u{1F1F7}', 'Germany': '\u{1F1E9}\u{1F1EA}', 'France': '\u{1F1EB}\u{1F1F7}',
  'Italy': '\u{1F1EE}\u{1F1F9}', 'Spain': '\u{1F1EA}\u{1F1F8}', 'United Kingdom': '\u{1F1EC}\u{1F1E7}',
  'United States': '\u{1F1FA}\u{1F1F8}', 'Brazil': '\u{1F1E7}\u{1F1F7}', 'Japan': '\u{1F1EF}\u{1F1F5}',
  'Russia': '\u{1F1F7}\u{1F1FA}', 'Canada': '\u{1F1E8}\u{1F1E6}', 'Australia': '\u{1F1E6}\u{1F1FA}',
  'Netherlands': '\u{1F1F3}\u{1F1F1}', 'Belgium': '\u{1F1E7}\u{1F1EA}', 'Austria': '\u{1F1E6}\u{1F1F9}',
  'Switzerland': '\u{1F1E8}\u{1F1ED}', 'Poland': '\u{1F1F5}\u{1F1F1}', 'Sweden': '\u{1F1F8}\u{1F1EA}',
  'Norway': '\u{1F1F3}\u{1F1F4}', 'Denmark': '\u{1F1E9}\u{1F1F0}', 'Finland': '\u{1F1EB}\u{1F1EE}',
  'Portugal': '\u{1F1F5}\u{1F1F9}', 'Greece': '\u{1F1EC}\u{1F1F7}', 'Mexico': '\u{1F1F2}\u{1F1FD}',
  'Argentina': '\u{1F1E6}\u{1F1F7}', 'Colombia': '\u{1F1E8}\u{1F1F4}', 'India': '\u{1F1EE}\u{1F1F3}',
  'China': '\u{1F1E8}\u{1F1F3}', 'South Korea': '\u{1F1F0}\u{1F1F7}', 'Indonesia': '\u{1F1EE}\u{1F1E9}',
  'Thailand': '\u{1F1F9}\u{1F1ED}', 'Egypt': '\u{1F1EA}\u{1F1EC}', 'South Africa': '\u{1F1FF}\u{1F1E6}',
  'Nigeria': '\u{1F1F3}\u{1F1EC}', 'Romania': '\u{1F1F7}\u{1F1F4}', 'Czech Republic': '\u{1F1E8}\u{1F1FF}',
  'Hungary': '\u{1F1ED}\u{1F1FA}', 'Ireland': '\u{1F1EE}\u{1F1EA}', 'Israel': '\u{1F1EE}\u{1F1F1}',
  'Ukraine': '\u{1F1FA}\u{1F1E6}', 'Chile': '\u{1F1E8}\u{1F1F1}', 'Peru': '\u{1F1F5}\u{1F1EA}',
  'Philippines': '\u{1F1F5}\u{1F1ED}', 'Malaysia': '\u{1F1F2}\u{1F1FE}', 'Vietnam': '\u{1F1FB}\u{1F1F3}',
  'Pakistan': '\u{1F1F5}\u{1F1F0}', 'Bangladesh': '\u{1F1E7}\u{1F1E9}', 'Saudi Arabia': '\u{1F1F8}\u{1F1E6}',
  'United Arab Emirates': '\u{1F1E6}\u{1F1EA}', 'Azerbaijan': '\u{1F1E6}\u{1F1FF}',
};
const countryNameToFlag = (name: string): string => COUNTRY_FLAGS[name] || '\u{1F30D}';

// Storage keys - MUST match keys in service.js
const LAST_PLAYED_STATION_KEY = '@megaradio_last_played_station';
const CURRENT_STATION_KEY = '@megaradio_current_station';
const SIMILAR_STATIONS_KEY = '@megaradio_similar_stations';
const PLAYBACK_HISTORY_KEY = '@megaradio_playback_history';
const SIMILAR_INDEX_KEY = '@megaradio_similar_index';

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
let lastMetadataTitle: string | null = null; // Track last metadata to detect changes

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
      // IMPORTANT: Only SkipToNext/Previous for radio app (previous/next station)
      // DO NOT include JumpForward/JumpBackward - they show 30s/15s skip icons instead
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],
      // What buttons are shown in compact notification (Android)
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],
      // Not used for live radio - but set to non-zero for iOS to enable skip
      progressUpdateEventInterval: 1,
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
  useTrackPlayerEvents([Event.PlaybackState, Event.PlaybackError, Event.PlaybackMetadataReceived, Event.MetadataCommonReceived], async (event) => {
    if (event.type === Event.PlaybackState) {
      console.log('[AudioProvider] Playback state changed:', event.state);
      
      switch (event.state) {
        case State.Playing:
          setPlaybackState('playing');
          // Reset retry count on successful playback
          failoverRetryCountRef.current = 0;
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
      
      // STREAM FAILOVER: Try next candidate URL automatically
      const currentStation = usePlayerStore.getState().currentStation;
      if (currentStation && streamCandidatesRef.current.length > 0) {
        const candidates = streamCandidatesRef.current;
        const currentIndex = currentCandidateIndexRef.current;
        
        console.log('[AudioProvider] Stream failed, attempting failover...');
        console.log('[AudioProvider] Current candidate:', currentIndex + 1, '/', candidates.length);
        
        // Try next candidate
        if (currentIndex + 1 < candidates.length) {
          currentCandidateIndexRef.current++;
          const nextUrl = candidates[currentCandidateIndexRef.current];
          
          console.log('[AudioProvider] FAILOVER: Trying next URL:', nextUrl.substring(0, 60));
          
          try {
            await TrackPlayer.reset();
            await TrackPlayer.add({
              id: currentStation._id || `station_${Date.now()}`,
              url: nextUrl,
              title: currentStation.name || 'MegaRadio',
              artist: 'MegaRadio',
              album: getStationGenre(currentStation) || 'MegaRadio',
              artwork: getArtworkUrl(currentStation) || 'https://themegaradio.com/logo.png',
              duration: 86400, // Fake duration for skip buttons
            });
            await TrackPlayer.play();
            
            console.log('[AudioProvider] FAILOVER: Successfully switched to candidate', currentCandidateIndexRef.current + 1);
            setStreamUrl(nextUrl);
            setPlaybackState('playing');
            return; // Don't set error state
          } catch (fallbackError) {
            console.error('[AudioProvider] FAILOVER: Candidate also failed:', fallbackError);
          }
        } else {
          console.log('[AudioProvider] FAILOVER: All candidates exhausted');
        }
      }
      
      // All failover attempts failed
      setError('Stream playback error - all URLs failed');
      setPlaybackState('error');
    }
    
    // Handle ICY metadata from stream (live song info)
    if (event.type === Event.PlaybackMetadataReceived || event.type === Event.MetadataCommonReceived) {
      console.log('[AudioProvider] 🎵 Stream metadata received:', event);
      const station = usePlayerStore.getState().currentStation;
      if (station) {
        // Extract metadata from event
        const metadata = (event as any).metadata || event;
        const title = metadata.title || metadata.commonMetadata?.title;
        const artist = metadata.artist || metadata.commonMetadata?.artist;
        
        if (title || artist) {
          console.log('[AudioProvider] 🎵 ICY Metadata:', { title, artist });
          
          // Parse "Artist - Title" format if title contains both
          let songTitle = title || '';
          let artistName = artist || '';
          
          if (songTitle && songTitle.includes(' - ') && !artistName) {
            const parts = songTitle.split(' - ');
            artistName = parts[0].trim();
            songTitle = parts.slice(1).join(' - ').trim();
          }
          
          // Update UI state
          setNowPlaying({
            title: songTitle || station.name,
            artist: artistName,
            song: songTitle,
            station: station.name,
            timestamp: Date.now(),
          });
          
          // Add to Song History from ICY metadata
          if (artistName && songTitle && songTitle !== 'Live Stream' && songTitle !== station.name) {
            try {
              const { useSongHistoryStore } = require('../store/songHistoryStore');
              useSongHistoryStore.getState().addEntry({
                title: songTitle,
                artist: artistName,
                stationName: station.name,
                stationId: station._id || '',
                stationFavicon: station.favicon || station.logo,
              });
            } catch (e) {
              // Non-blocking
            }
          }
          
          // Update lock screen using existing helper functions (DRY principle)
          if (Platform.OS !== 'web') {
            // Use existing getArtworkUrl helper - ensure HTTPS
            let artworkUrl = 'https://themegaradio.com/logo.png';
            if (station.favicon && station.favicon.length > 0) {
              artworkUrl = station.favicon;
            } else if (station.logo && station.logo.length > 0) {
              artworkUrl = station.logo;
            }
            if (artworkUrl.startsWith('http://')) {
              artworkUrl = artworkUrl.replace('http://', 'https://');
            }
            
            // Use getStationGenre helper for album (DRY - function defined below)
            // Note: Can't call getStationGenre here as it's defined after this hook
            // Using inline fallback that matches getStationGenre logic
            let albumName = 'MegaRadio';
            if (station.tags && typeof station.tags === 'string' && station.tags.length > 0) {
              const firstTag = station.tags.split(',')[0].trim();
              if (firstTag && firstTag.length > 0) {
                albumName = firstTag.charAt(0).toUpperCase() + firstTag.slice(1);
              }
            } else if (station.genres && Array.isArray(station.genres) && station.genres.length > 0 && station.genres[0]) {
              albumName = station.genres[0];
            } else if (station.country && typeof station.country === 'string' && station.country.length > 0) {
              albumName = station.country;
            }
            
            // Build metadata object with guaranteed non-null values
            const metadataUpdate = {
              title: (songTitle && songTitle.length > 0) ? songTitle : (station.name || 'MegaRadio'),
              artist: (artistName && artistName.length > 0) ? artistName : 'MegaRadio',
              album: albumName,
              artwork: artworkUrl,
            };
            
            console.log('[AudioProvider] 🎵 Updating lock screen with:', metadataUpdate);
            
            try {
              await TrackPlayer.updateNowPlayingMetadata(metadataUpdate);
              console.log('[AudioProvider] 🎵 Lock screen updated from ICY metadata');
            } catch (e) {
              console.log('[AudioProvider] Could not update lock screen:', e);
            }
          }
        }
      }
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

  // Resolve stream URL helper - returns { url, candidates } for fallback support
  // Backend Developer Recommendation:
  // 1. urlResolved varsa ve boş değilse → urlResolved kullan
  // 2. url .pls/.m3u/.m3u8/.asx ise → /api/stream/resolve kullan
  // 3. Hiçbiri yoksa → url kullan
  // 
  // HTTP streams: Native'de direkt çalışır (usesCleartextTraffic=true)
  // Proxy sadece Web için gerekli (mixed content)
  //
  // HD STREAM GATING:
  // Premium users get urlResolved (typically higher bitrate) or urlHigh
  // Free users get url (standard quality) when available
  
  // Helper to check if URL is a playlist
  const isPlaylistUrl = useCallback((url: string | undefined): boolean => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.endsWith('.pls') || 
           lowerUrl.endsWith('.m3u') || 
           lowerUrl.endsWith('.m3u8') ||
           lowerUrl.endsWith('.asx');
  }, []);
  
  // Store candidates for fallback - IMPROVED with retry count tracking
  const streamCandidatesRef = useRef<string[]>([]);
  const currentCandidateIndexRef = useRef<number>(0);
  const failoverRetryCountRef = useRef<number>(0);
  const MAX_FAILOVER_RETRIES = 3; // Max retries per candidate
  
  const resolveStreamUrl = useCallback(async (station: Station): Promise<string | null> => {
    // Get urlResolved - API returns camelCase "urlResolved"
    const urlResolved = (station as any).urlResolved || station.url_resolved;
    const originalUrl = station.url;
    // Check for backup URLs from station data
    const urlBackup = (station as any).urlBackup || (station as any).url_backup;
    const urlAlternatives = (station as any).urlAlternatives || (station as any).url_alternatives || [];
    
    console.log('[AudioProvider] Resolving stream for:', station.name);
    console.log('[AudioProvider] urlResolved:', urlResolved ? urlResolved.substring(0, 60) : 'EMPTY');
    console.log('[AudioProvider] originalUrl:', originalUrl ? originalUrl.substring(0, 60) : 'EMPTY');
    console.log('[AudioProvider] urlBackup:', urlBackup ? urlBackup.substring(0, 60) : 'NONE');
    
    // Reset candidates and retry count
    streamCandidatesRef.current = [];
    currentCandidateIndexRef.current = 0;
    failoverRetryCountRef.current = 0;
    
    // Determine which URL to use based on premium status (HD gating)
    // Premium users get highest quality (urlResolved), free users get standard (url)
    let streamUrl: string;
    const premiumStore = require('../store/premiumStore').usePremiumStore;
    const hasHD = premiumStore.getState().hasFeature('hd_stream');
    
    // Check for explicit high/low quality URLs
    const urlHigh = (station as any).urlHigh || (station as any).url_high;
    const urlLow = (station as any).urlLow || (station as any).url_low;
    
    if (hasHD) {
      // Premium: prefer highest quality → urlHigh > urlResolved > originalUrl
      streamUrl = urlHigh || ((urlResolved && urlResolved.trim() !== '') ? urlResolved : originalUrl);
      console.log('[AudioProvider] HD Stream: Premium user, using high quality URL');
    } else {
      // Free: prefer standard quality → urlLow > originalUrl > urlResolved
      streamUrl = urlLow || originalUrl || urlResolved;
      console.log('[AudioProvider] Standard Stream: Free user, using standard URL');
    }
    
    if (!streamUrl) {
      console.error('[AudioProvider] No valid URL found for station:', station.name);
      return null;
    }
    
    // NATIVE APPS
    if (Platform.OS !== 'web') {
      // Check if URL is a playlist that needs resolution
      if (isPlaylistUrl(streamUrl)) {
        console.log('[AudioProvider] Native: Playlist detected (.pls/.m3u/.asx), resolving...');
        try {
          const streamData = await stationService.resolveStream(streamUrl);
          if (streamData.candidates && streamData.candidates.length > 0) {
            // Store all candidates for fallback
            streamCandidatesRef.current = streamData.candidates;
            const resolvedUrl = streamData.candidates[0];
            console.log('[AudioProvider] Native: Resolved to:', resolvedUrl.substring(0, 60));
            console.log('[AudioProvider] Native: Total candidates:', streamData.candidates.length);
            return resolvedUrl;
          }
        } catch (error) {
          console.log('[AudioProvider] Native: Resolve failed:', error);
          // Fallback: try original URL if we used urlResolved
          if (urlResolved && originalUrl && !isPlaylistUrl(originalUrl)) {
            console.log('[AudioProvider] Native: Falling back to original URL');
            streamCandidatesRef.current = [originalUrl];
            return originalUrl;
          }
        }
      }
      
      // Direct stream URL - build candidates list for fallback
      // Priority: urlResolved > url > urlBackup > urlAlternatives
      const candidates: string[] = [];
      if (urlResolved && urlResolved.trim() !== '') candidates.push(urlResolved);
      if (originalUrl && originalUrl !== urlResolved) candidates.push(originalUrl);
      if (urlBackup && !candidates.includes(urlBackup)) candidates.push(urlBackup);
      if (Array.isArray(urlAlternatives)) {
        urlAlternatives.forEach((alt: string) => {
          if (alt && !candidates.includes(alt)) candidates.push(alt);
        });
      }
      streamCandidatesRef.current = candidates;
      
      console.log('[AudioProvider] Native: Stream candidates:', candidates.length);
      console.log('[AudioProvider] Native: Using primary URL:', streamUrl.substring(0, 60));
      return streamUrl;
    }
    
    // WEB: Need to handle mixed content (HTTP on HTTPS page)
    try {
      // Check if playlist needs resolution
      if (isPlaylistUrl(streamUrl)) {
        console.log('[AudioProvider] Web: Playlist detected, resolving...');
        const streamData = await stationService.resolveStream(streamUrl);
        if (streamData.candidates && streamData.candidates.length > 0) {
          streamCandidatesRef.current = streamData.candidates;
          streamUrl = streamData.candidates[0];
        }
      }
      
      // Apply proxy for HTTP URLs on web
      if (streamUrl.startsWith('http://')) {
        console.log('[AudioProvider] Web: HTTP stream, using proxy');
        return stationService.getProxyUrl(streamUrl);
      }
      
      console.log('[AudioProvider] Web: Using HTTPS stream directly');
      return streamUrl;
      
    } catch (error) {
      console.log('[AudioProvider] Web: Resolution error:', error);
      
      // Fallback with proxy if needed
      if (streamUrl.startsWith('http://')) {
        return stationService.getProxyUrl(streamUrl);
      }
      return streamUrl;
    }
  }, [isPlaylistUrl]);
  
  // Try next candidate URL when playback fails
  const tryNextCandidate = useCallback(async (): Promise<string | null> => {
    currentCandidateIndexRef.current++;
    const candidates = streamCandidatesRef.current;
    
    if (currentCandidateIndexRef.current < candidates.length) {
      const nextUrl = candidates[currentCandidateIndexRef.current];
      console.log('[AudioProvider] Trying next candidate:', currentCandidateIndexRef.current + 1, '/', candidates.length);
      console.log('[AudioProvider] Next URL:', nextUrl.substring(0, 60));
      return nextUrl;
    }
    
    console.log('[AudioProvider] No more candidates to try');
    return null;
  }, []);

  // Helper to get artwork URL from station
  const getArtworkUrl = useCallback((station: Station): string => {
    const DEFAULT_LOGO = 'https://themegaradio.com/logo.png';
    
    // Helper to check if value is a valid non-empty string
    const isValidUrl = (url: string | undefined | null): boolean => {
      return typeof url === 'string' && url.trim().length > 0;
    };
    
    let artworkUrl = DEFAULT_LOGO;
    
    // Check favicon first, then logo
    if (isValidUrl(station.favicon) && station.favicon!.startsWith('http')) {
      artworkUrl = station.favicon!;
    } else if (isValidUrl(station.logo) && station.logo!.startsWith('http')) {
      artworkUrl = station.logo!;
    } else if (isValidUrl(station.favicon) && station.favicon!.startsWith('/')) {
      artworkUrl = `https://themegaradio.com${station.favicon}`;
    } else if (isValidUrl(station.logo) && station.logo!.startsWith('/')) {
      artworkUrl = `https://themegaradio.com${station.logo}`;
    }
    
    // Ensure HTTPS for lock screen compatibility
    if (artworkUrl.startsWith('http://')) {
      artworkUrl = artworkUrl.replace('http://', 'https://');
    }
    
    // Final fallback check
    if (!isValidUrl(artworkUrl)) {
      return DEFAULT_LOGO;
    }
    
    return artworkUrl;
  }, []);

  // Helper to get genre/album from station (for metadata display) - null-safe
  const getStationGenre = useCallback((station: Station): string => {
    // Priority: tags (first tag) > genres (first genre) > country > 'MegaRadio'
    if (station.tags && typeof station.tags === 'string' && station.tags.length > 0) {
      const firstTag = station.tags.split(',')[0].trim();
      if (firstTag && firstTag.length > 0) {
        return firstTag.charAt(0).toUpperCase() + firstTag.slice(1); // Capitalize
      }
    }
    if (station.genres && Array.isArray(station.genres) && station.genres.length > 0 && station.genres[0]) {
      return station.genres[0];
    }
    if (station.country && typeof station.country === 'string' && station.country.length > 0) {
      return station.country;
    }
    return 'MegaRadio';
  }, []);

  // Update lock screen metadata helper
  const updateLockScreenMetadata = useCallback(async (
    station: Station,
    songTitle: string,
    artistName: string
  ) => {
    if (Platform.OS === 'web') return;
    
    try {
      const artworkUrl = getArtworkUrl(station);
      const albumName = getStationGenre(station);
      
      // Ensure all values are non-null strings
      const newMetadata = {
        title: (songTitle && songTitle.length > 0) ? songTitle : (station.name || 'MegaRadio'),
        artist: (artistName && artistName.length > 0) ? artistName : 'MegaRadio',
        album: (albumName && albumName.length > 0) ? albumName : 'MegaRadio',
        artwork: (artworkUrl && artworkUrl.length > 0) ? artworkUrl : 'https://themegaradio.com/logo.png',
      };
      
      console.log('[AudioProvider] Updating lock screen metadata:', newMetadata);
      
      // Update NOW PLAYING metadata (for live streams)
      await TrackPlayer.updateNowPlayingMetadata(newMetadata);
      
      // Also update track metadata for consistency
      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      if (activeIndex !== null && activeIndex !== undefined) {
        await TrackPlayer.updateMetadataForTrack(activeIndex, newMetadata);
      }
      
      console.log('[AudioProvider] Lock screen updated:', songTitle, '-', artistName);
    } catch (e) {
      console.log('[AudioProvider] Could not update lock screen:', e);
    }
  }, [getArtworkUrl, getStationGenre]);

  // Fetch now playing helper - updates both UI state and lock screen
  // API returns: { station: { id, name, url }, metadata: { title?, artist?, station?, genre? } }
  const fetchNowPlaying = useCallback(async (stationId: string) => {
    const station = usePlayerStore.getState().currentStation;
    if (!station) return;
    
    try {
      // Use the correct metadata API endpoint via stationService
      const response = await stationService.getNowPlaying(stationId);
      console.log('[AudioProvider] Now Playing response:', response);
      
      // API returns { station: {...}, metadata: {...} } format
      const metadataObj = response?.metadata;
      
      // Check if we have valid metadata (title or artist)
      if (metadataObj && (metadataObj.title || metadataObj.artist)) {
        const songTitle = metadataObj.title || station.name;
        const artistName = metadataObj.artist || '';
        const genre = metadataObj.genre || '';
        
        // Build display text based on available data
        let displayText = songTitle;
        if (artistName && songTitle !== station.name) {
          displayText = `${artistName} - ${songTitle}`;
        }
        
        console.log('[AudioProvider] Metadata found:', { title: songTitle, artist: artistName, genre });
        
        // Check if song changed (new metadata) - increment music played count
        const newMetadataKey = `${songTitle}-${artistName}`;
        if (lastMetadataTitle !== newMetadataKey && lastMetadataTitle !== null) {
          console.log('[AudioProvider] New song detected, incrementing music played count');
          statsService.incrementMusicPlayed().catch(console.error);
          
          // Add to Song History (only for actual songs with artist info)
          if (artistName && songTitle && songTitle !== 'Live Stream' && songTitle !== station.name) {
            try {
              const { useSongHistoryStore } = require('../store/songHistoryStore');
              useSongHistoryStore.getState().addEntry({
                title: songTitle,
                artist: artistName,
                stationName: station.name,
                stationId: station._id || '',
                stationFavicon: station.favicon || station.logo,
              });
            } catch (e) {
              // Non-blocking - Song History is a premium feature
            }
          }
        }
        lastMetadataTitle = newMetadataKey;
        
        // Update UI state with full metadata
        setNowPlaying({
          title: songTitle,
          artist: artistName,
          song: songTitle,
          station: station.name,
          album: genre,
          timestamp: Date.now(),
        });
        
        // Update lock screen on native
        await updateLockScreenMetadata(
          station, 
          songTitle, 
          artistName || station.country || 'MegaRadio'
        );
        return;
      }
      
      // No metadata from API - use station info as fallback
      console.log('[AudioProvider] No metadata available, using station info');
      setNowPlaying({
        title: station.name,
        station: station.name,
        timestamp: Date.now(),
      });
      
      // Update lock screen with station info
      await updateLockScreenMetadata(station, station.name, station.country || 'Live Radio');
      
    } catch (err) {
      console.log('[AudioProvider] Now playing fetch error:', err);
      
      // On error, still update with station info
      if (station) {
        setNowPlaying({
          title: station.name,
          station: station.name,
          timestamp: Date.now(),
        });
        await updateLockScreenMetadata(station, station.name, station.country || 'Live Radio');
      }
    }
  }, [setNowPlaying, updateLockScreenMetadata]);

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

    // FIRST STATION PLAY: Show app-open ad on very first station play per session
    // Wait briefly for AdMob to initialize if needed
    const isFirstPlay = !adMobService.firstStationAdShown;
    if (isFirstPlay) {
      adMobService.firstStationAdShown = true;
      // Small delay to allow AdMob to finish loading ads
      setTimeout(() => {
        adMobService.showAppOpenAd().then((shown) => {
          if (shown) {
            console.log('[AudioProvider] First launch ad shown');
          }
        }).catch((e) => {
          console.log('[AudioProvider] First launch ad error (non-blocking):', e);
        });
      }, 2000);
    }

    // Track station change for ads (only for different stations)
    // Shows interstitial ad every 3 station changes (with rewarded fallback)
    // SKIP counting on first play - app open ad already shown/attempted
    if (adMobService.isInitialized && !isFirstPlay) {
      adMobService.onStationChange().then((adShown) => {
        if (adShown) {
          console.log('[AudioProvider] Ad shown on station change');
        }
      }).catch((error) => {
        console.log('[AudioProvider] Ad error (non-blocking):', error);
      });
    } else if (isFirstPlay) {
      console.log('[AudioProvider] First play - skipping station change counter (app open ad handles this)');
    }

    // NEW STATION - increment play ID for race condition prevention
    const myPlayId = ++globalPlayId;
    console.log('[AudioProvider] New PlayID:', myPlayId);

    try {
      // STEP 1: STOP CURRENT PLAYBACK & CLEAR OLD METADATA
      console.log('[AudioProvider] STEP 1: Stopping current playback...');
      await TrackPlayer.reset();
      
      // IMPORTANT: Clear previous station's metadata immediately
      // This prevents showing old station's info while loading new one
      setNowPlaying(null);

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

      // STEP 4: Get artwork URL using helper
      const artworkUrl = getArtworkUrl(station);
      console.log('[AudioProvider] Artwork URL:', artworkUrl);

      // STEP 5: Add track to player with metadata
      // For iOS Control Center Next/Previous to be ENABLED:
      // - DON'T use isLiveStream: true (iOS hides skip buttons for live streams)
      // - Use a very long duration to simulate a long track
      // - Add placeholder tracks before and after
      console.log('[AudioProvider] STEP 5: Adding track with metadata...');
      
      // Long duration (24 hours in seconds) - tricks iOS into showing skip buttons
      const fakeDuration = 86400;
      
      // Ensure all metadata values are non-null
      const safeAlbum = getStationGenre(station) || 'MegaRadio';
      const safeArtwork = artworkUrl || 'https://themegaradio.com/logo.png';
      const safeTitle = station.name || 'MegaRadio';
      const safeId = station._id || `station_${Date.now()}`;
      
      // Add a "previous" placeholder (will be replaced when user presses Previous)
      await TrackPlayer.add({
        id: 'placeholder_previous',
        url: url,
        title: 'Previous Station',
        artist: 'MegaRadio',
        album: safeAlbum,
        artwork: safeArtwork,
        duration: fakeDuration,
      });
      
      // Add the actual current station
      await TrackPlayer.add({
        id: safeId,
        url: url,
        title: safeTitle,
        artist: 'MegaRadio',
        album: safeAlbum,
        artwork: safeArtwork,
        duration: fakeDuration,
      });
      
      // Add a "next" placeholder (will be replaced when user presses Next)
      await TrackPlayer.add({
        id: 'placeholder_next',
        url: url,
        title: 'Next Station',
        artist: 'MegaRadio',
        album: safeAlbum,
        artwork: safeArtwork,
        duration: fakeDuration,
      });
      
      // Skip to the actual track (index 1)
      await TrackPlayer.skip(1);

      // STEP 6: Start playback
      console.log('[AudioProvider] STEP 6: Starting playback...');
      await TrackPlayer.play();
      
      listeningStartTime = new Date();

      console.log('[AudioProvider] ========== NOW PLAYING ==========');

      // Add to recently played store (for CarPlay real-time sync)
      useRecentlyPlayedStore.getState().addStation(station);

      // Background tasks - also record to API
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
        // Track unique station
        await statsService.trackUniqueStation(station._id);
        startStatsTracking();
        console.log('[AudioProvider] Stats session started for:', station.name);
      } catch (e) {
        console.log('[AudioProvider] Failed to start stats session:', e);
      }

      // STEP 8: Start now playing polling (every 15 seconds as per API docs)
      console.log('[AudioProvider] STEP 8: Starting now playing polling (15s interval)...');
      if (nowPlayingIntervalRef.current) {
        clearInterval(nowPlayingIntervalRef.current);
      }
      nowPlayingIntervalRef.current = setInterval(() => {
        if (currentPlayingStationId) {
          fetchNowPlaying(currentPlayingStationId);
        }
      }, 15000); // 15 seconds as recommended by API docs

      // STEP 9: Save current station and fetch similar stations for background service
      // This enables Next/Previous controls in lock screen and Control Center
      console.log('[AudioProvider] STEP 9: Saving station data for background controls...');
      try {
        // Save current station for background service
        await AsyncStorage.setItem(CURRENT_STATION_KEY, JSON.stringify(station));
        
        // Add to playback history for Previous button
        const historyJson = await AsyncStorage.getItem(PLAYBACK_HISTORY_KEY);
        let history = historyJson ? JSON.parse(historyJson) : [];
        history = history.filter((s: Station) => s._id !== station._id);
        history.unshift(station);
        history = history.slice(0, 50);
        await AsyncStorage.setItem(PLAYBACK_HISTORY_KEY, JSON.stringify(history));
        
        // Fetch and save similar stations for Next button (non-blocking)
        // Reset similar index when playing new station
        await AsyncStorage.setItem(SIMILAR_INDEX_KEY, '-1');
        
        stationService.getSimilarStations(station._id, 10).then(async (similarStations) => {
          if (similarStations && similarStations.length > 0) {
            await AsyncStorage.setItem(SIMILAR_STATIONS_KEY, JSON.stringify(similarStations));
            console.log('[AudioProvider] Saved', similarStations.length, 'similar stations for Next button');
          }
        }).catch((e) => {
          console.log('[AudioProvider] Could not fetch similar stations:', e);
        });
        
        console.log('[AudioProvider] Background controls data saved!');
      } catch (e) {
        console.log('[AudioProvider] Failed to save background data:', e);
      }

    } catch (error) {
      console.error('[AudioProvider] Play failed:', error);
      
      // Try next candidate if available (Backend recommendation: fallback to candidates[1], candidates[2], etc.)
      const nextUrl = await tryNextCandidate();
      if (nextUrl) {
        console.log('[AudioProvider] Retrying with next candidate...');
        try {
          await TrackPlayer.reset();
          await TrackPlayer.add({
            id: station._id || `station_${Date.now()}`,
            url: nextUrl,
            title: station.name || 'MegaRadio',
            artist: 'MegaRadio',
            album: getStationGenre(station) || 'MegaRadio',
            artwork: getArtworkUrl(station) || 'https://themegaradio.com/logo.png',
            isLiveStream: true,
          });
          await TrackPlayer.play();
          console.log('[AudioProvider] Fallback playback started successfully');
          
          // Update stream URL and continue
          setStreamUrl(nextUrl);
          listeningStartTime = new Date();
          
          // Background tasks
          userService.recordRecentlyPlayed(station._id).catch(() => {});
          fetchNowPlaying(station._id);
          return;
        } catch (fallbackError) {
          console.error('[AudioProvider] Fallback also failed:', fallbackError);
        }
      }
      
      setError(error instanceof Error ? error.message : 'Failed to play');
      setPlaybackState('error');
    }
  }, [resolveStreamUrl, tryNextCandidate, getArtworkUrl, setCurrentStation, setPlaybackState, setStreamUrl, setError, setMiniPlayerVisible, fetchNowPlaying, startStatsTracking]);

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

  // ============================================
  // APPLE WATCH INTEGRATION
  // ============================================
  
  // Get favorites for Watch
  const { favorites } = useFavoritesStore();
  
  // Load recently played store from storage on mount (for CarPlay cold start)
  useEffect(() => {
    useRecentlyPlayedStore.getState().loadFromAPI();
  }, []);

  // Send favorites to Watch when they change
  useEffect(() => {
    if (Platform.OS === 'ios') {
      watchService.updateFavorites(favorites);
    } else if (Platform.OS === 'android') {
      wearOSService.updateFavorites(favorites);
    }
  }, [favorites]);
  
  // Fetch and send genres to Watch on mount - use precomputed for country-specific data
  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    
    const fetchAndSendGenres = async () => {
      try {
        const { useLocationStore } = await import('../store/locationStore');
        const locState = useLocationStore.getState();
        const countryCode = locState.countryCode;
        
        console.log('[AudioProvider] Fetching genres for Watch, countryCode:', countryCode);
        
        // Use precomputed genres with country code for country-specific data
        const result = await genreService.getPrecomputedGenres(countryCode || undefined, 40);
        
        if (result.success && result.data && result.data.length > 0) {
          const watchGenres = result.data.map((g: any) => ({
            name: g.name || g.title || '',
            slug: g.slug || g.name?.toLowerCase().replace(/\s+/g, '-') || '',
            icon: g.icon || 'radio',
            stationCount: g.stationCount || g.count || 0,
          }));
          if (Platform.OS === 'ios') {
            watchService.updateGenres(watchGenres);
          } else {
            wearOSService.updateGenres(watchGenres);
          }
          console.log('[AudioProvider] Sent', watchGenres.length, 'precomputed genres to Watch');
        } else {
          // Fallback to discoverable genres
          const genres = await genreService.getDiscoverableGenres();
          if (genres && genres.length > 0) {
            const watchGenres = genres.map((g: any) => ({
              name: g.name || g.title || '',
              slug: g.slug || g.name?.toLowerCase().replace(/\s+/g, '-') || '',
              icon: g.icon || 'radio',
              stationCount: g.stationCount || g.count || 0,
            }));
            if (Platform.OS === 'ios') {
              watchService.updateGenres(watchGenres);
            } else {
              wearOSService.updateGenres(watchGenres);
            }
            console.log('[AudioProvider] Sent', watchGenres.length, 'discoverable genres to Watch (fallback)');
          }
        }
      } catch (error) {
        console.log('[AudioProvider] Error fetching genres for Watch:', error);
      }
    };
    
    fetchAndSendGenres();
  }, []);
  
  // Send now playing info to Watch
  useEffect(() => {
    const nowPlayingData = usePlayerStore.getState().nowPlaying;
    
    if (Platform.OS === 'ios') {
      watchService.updateNowPlaying({
        stationId: currentStation?._id || currentStation?.id,
        stationName: currentStation?.name,
        stationLogo: currentStation?.logo || currentStation?.favicon,
        songTitle: nowPlayingData?.title,
        artistName: nowPlayingData?.artist,
        isPlaying: isPlaying,
      });
    } else if (Platform.OS === 'android' && currentStation) {
      wearOSService.updateNowPlaying(
        currentStation,
        isPlaying,
        nowPlayingData?.title || '',
        nowPlayingData?.artist || ''
      );
    }
  }, [currentStation, isPlaying]);
  
  // Update Watch playback state
  useEffect(() => {
    if (Platform.OS === 'ios') {
      watchService.updatePlaybackState(isPlaying);
    } else if (Platform.OS === 'android') {
      const nowPlayingData = usePlayerStore.getState().nowPlaying;
      wearOSService.updatePlaybackState(isPlaying, nowPlayingData?.title, nowPlayingData?.artist);
    }
  }, [isPlaying]);
  
  // Listen to Watch commands (iOS + Android)
  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    
    // Unified command handler for both iOS Watch and Android Wear OS
    const handleWatchCommand = async (command: any) => {
      console.log('[AudioProvider] Watch command received:', command);
      
      switch (command.command) {
        case 'play':
          // Wear OS sends stationId in data field
          if (command.data && Platform.OS === 'android') {
            let station = favorites.find(
              (s: any) => (s._id || s.id) === command.data
            );
            if (!station) {
              try {
                station = await stationService.getStation(command.data);
              } catch (e) {
                console.log('[AudioProvider] Could not fetch station:', e);
              }
            }
            if (station) {
              await playStation(station);
            }
          } else {
            resume();
          }
          break;
        case 'pause':
          pause();
          break;
        case 'resume':
          resume();
          break;
        case 'togglePlayPause':
          togglePlayPause();
          break;
        case 'next':
        case 'nextStation': {
          try {
            const similarJson = await AsyncStorage.getItem(SIMILAR_STATIONS_KEY);
            const similarStations = similarJson ? JSON.parse(similarJson) : [];
            
            if (similarStations.length > 0) {
              const indexJson = await AsyncStorage.getItem(SIMILAR_INDEX_KEY);
              let currentIdx = indexJson ? parseInt(indexJson, 10) : -1;
              currentIdx = (currentIdx + 1) % similarStations.length;
              await AsyncStorage.setItem(SIMILAR_INDEX_KEY, String(currentIdx));
              const nextStation = similarStations[currentIdx];
              if (nextStation) {
                console.log('[AudioProvider] Watch: Playing next similar station:', nextStation.name);
                await playStation(nextStation);
                break;
              }
            }
            const currentIndex = favorites.findIndex(
              (s: any) => (s._id || s.id) === (currentStation?._id || currentStation?.id)
            );
            if (currentIndex >= 0 && currentIndex < favorites.length - 1) {
              await playStation(favorites[currentIndex + 1]);
            } else if (favorites.length > 0) {
              await playStation(favorites[0]);
            }
          } catch (e) {
            console.log('[AudioProvider] Watch nextStation error:', e);
          }
          break;
        }
        case 'previous':
        case 'previousStation': {
          try {
            const historyJson = await AsyncStorage.getItem(PLAYBACK_HISTORY_KEY);
            const history = historyJson ? JSON.parse(historyJson) : [];
            
            if (history.length >= 2) {
              const previousStation = history[1];
              if (previousStation) {
                console.log('[AudioProvider] Watch: Playing previous station from history:', previousStation.name);
                await AsyncStorage.setItem(SIMILAR_INDEX_KEY, '-1');
                await playStation(previousStation);
                break;
              }
            }
            const prevIndex = favorites.findIndex(
              (s: any) => (s._id || s.id) === (currentStation?._id || currentStation?.id)
            );
            if (prevIndex > 0) {
              await playStation(favorites[prevIndex - 1]);
            } else if (favorites.length > 0) {
              await playStation(favorites[favorites.length - 1]);
            }
          } catch (e) {
            console.log('[AudioProvider] Watch previousStation error:', e);
          }
          break;
        }
        case 'toggle_favorite':
          if (command.data) {
            try {
              const { useFavoritesStore } = await import('../store/favoritesStore');
              const store = useFavoritesStore.getState();
              let station = favorites.find(
                (s: any) => (s._id || s.id) === command.data
              );
              if (!station) {
                station = await stationService.getStation(command.data);
              }
              if (station) {
                await store.toggleFavorite(station);
              }
            } catch (e) {
              console.log('[AudioProvider] Watch toggle_favorite error:', e);
            }
          }
          break;
        case 'request_data':
          // Wear OS requests data refresh
          try {
            const data = command.data ? JSON.parse(command.data) : { type: 'all' };
            if (data.type === 'all' || data.type === 'genre_stations') {
              // Handled by genre/country station logic below
            }
          } catch (e) {
            console.log('[AudioProvider] request_data parse error:', e);
          }
          break;
        case 'playStation':
          if (command.stationId) {
            let station = favorites.find(
              (s: any) => (s._id || s.id) === command.stationId
            );
            if (!station) {
              try {
                station = await stationService.getStation(command.stationId);
              } catch (e) {
                console.log('[AudioProvider] Could not fetch station:', e);
              }
            }
            if (station) {
              await playStation(station);
            }
          }
          break;
        case 'requestGenreStations':
          if ((command as any).genreSlug) {
            try {
              const { useLocationStore } = await import('../store/locationStore');
              const locState = useLocationStore.getState();
              const countryEn = locState.countryEnglish || locState.country;
              const countryNative = locState.country;
              
              const result = await genreService.getGenreStations(
                (command as any).genreSlug, 1, 20, countryEn, 'votes', 'desc', countryNative
              );
              
              if (result.stations && result.stations.length > 0) {
                if (Platform.OS === 'ios') {
                  watchService.updateGenreStations(result.stations);
                } else {
                  wearOSService.updateStations(result.stations);
                }
                console.log('[AudioProvider] Sent', result.stations.length, 'genre stations to Watch');
              } else {
                if (Platform.OS === 'ios') {
                  watchService.updateGenreStations([]);
                }
              }
            } catch (e) {
              console.log('[AudioProvider] Error fetching genre stations for Watch:', e);
              if (Platform.OS === 'ios') {
                watchService.updateGenreStations([]);
              }
            }
          }
          break;
        case 'requestCountries':
          try {
            const countriesResponse = await api.get(API_ENDPOINTS.filters.countries);
            const countryNames: string[] = countriesResponse.data || [];
            
            const watchCountries = countryNames
              .filter((name: string) => name && name.length > 0)
              .map((name: string) => ({
                name,
                code: name.substring(0, 2).toUpperCase(),
                flag: countryNameToFlag(name),
                stationCount: 0,
              }));
            
            if (Platform.OS === 'ios') {
              watchService.updateCountries(watchCountries);
            } else {
              wearOSService.updateCountries(watchCountries);
            }
            console.log('[AudioProvider] Sent', watchCountries.length, 'countries to Watch');
          } catch (e) {
            console.log('[AudioProvider] Error fetching countries for Watch:', e);
          }
          break;
        case 'requestCountryStations':
          if ((command as any).countryName) {
            try {
              const countryName = (command as any).countryName;
              const result = await stationService.getPopularStations(countryName, 30);
              
              if (result.stations && result.stations.length > 0) {
                if (Platform.OS === 'ios') {
                  watchService.updateCountryStations(result.stations);
                } else {
                  wearOSService.updateStations(result.stations);
                }
                console.log('[AudioProvider] Sent', result.stations.length, 'country stations to Watch');
              } else {
                if (Platform.OS === 'ios') {
                  watchService.updateCountryStations([]);
                }
              }
            } catch (e) {
              console.log('[AudioProvider] Error fetching country stations for Watch:', e);
              if (Platform.OS === 'ios') {
                watchService.updateCountryStations([]);
              }
            }
          }
          break;
      }
    };
    
    // Register listeners per platform
    let unsubscribeIOS: (() => void) | null = null;
    let unsubscribeAndroid: (() => void) | null = null;
    
    if (Platform.OS === 'ios') {
      unsubscribeIOS = watchService.addCommandListener(handleWatchCommand);
    } else if (Platform.OS === 'android') {
      unsubscribeAndroid = wearOSService.addCommandListener(handleWatchCommand);
    }
    
    return () => {
      unsubscribeIOS?.();
      unsubscribeAndroid?.();
    };
  }, [favorites, currentStation, playStation, pause, resume, togglePlayPause]);

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

  sendLog('AUDIO_PROVIDER_RENDERING');

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};

export default AudioProvider;

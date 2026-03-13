// CarPlayHandler - Initializes CarPlay & Android Auto integration
// Must be rendered inside AudioProvider

import { useEffect, useRef } from 'react';
import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import CarPlayService from '../services/carPlayService';
import stationService from '../services/stationService';
import userService from '../services/userService';
import genreService from '../services/genreService';
import { useFavoritesStore } from '../store/favoritesStore';
import { useLocationStore } from '../store/locationStore';
import useRecentlyPlayedStore from '../store/recentlyPlayedStore';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import type { Station } from '../types';

// Android Auto Native Module
const { AndroidAutoModule } = NativeModules;

// Track last values to detect changes (module-level for persistence)
let lastCountry: string | null = null;
let lastFavoritesCount: number = -1; // -1 to detect first load
let lastRecentCount: number = -1; // -1 to detect first load
let refreshDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let isRefreshing: boolean = false; // Prevent concurrent refreshes (crash fix)
let androidAutoEventEmitter: NativeEventEmitter | null = null;

// API wrapper functions for CarPlay
const getPopularStations = async (): Promise<Station[]> => {
  try {
    // Get selected country from location store
    // Use English country name (e.g., "Austria") for API compatibility
    const { countryEnglish, country } = useLocationStore.getState();
    const selectedCountry = countryEnglish || country || undefined;
    
    console.log('[CarPlayHandler] Fetching popular stations for country:', selectedCountry);
    
    // Use getPopularStations with explicit limit=50 for CarPlay
    const response = await stationService.getPopularStations(selectedCountry, 50);
    
    console.log('[CarPlayHandler] Got', response.stations?.length || 0, 'popular stations for CarPlay');
    
    // Log first few stations for debugging
    if (response.stations && response.stations.length > 0) {
      console.log('[CarPlayHandler] First 3 stations:', 
        response.stations.slice(0, 3).map(s => s.name).join(', '));
    }
    
    return response.stations || [];
  } catch (error) {
    console.error('[CarPlayHandler] Error fetching stations:', error);
    return [];
  }
};

const getFavoriteStations = async (): Promise<Station[]> => {
  try {
    const store = useFavoritesStore.getState();
    
    // PERFORMANCE FIX: Return local favorites immediately, don't block on server sync
    // This prevents CarPlay from waiting for network requests
    if (store.favorites.length > 0) {
      console.log('[CarPlayHandler] Returning cached favorites immediately:', store.favorites.length);
      
      // Sync in background (non-blocking) for next time
      if (!store.isLoaded) {
        store.syncWithServer().catch(() => {
          store.loadLocalFavorites().catch(() => {});
        });
      }
      
      return store.favorites;
    }
    
    // No cached favorites - try local storage first (fast)
    console.log('[CarPlayHandler] No cached favorites, trying local storage...');
    try {
      await store.loadLocalFavorites();
      const localFavorites = useFavoritesStore.getState().favorites;
      if (localFavorites.length > 0) {
        console.log('[CarPlayHandler] Loaded', localFavorites.length, 'favorites from local storage');
        // Background sync for freshness
        store.syncWithServer().catch(() => {});
        return localFavorites;
      }
    } catch (e) {
      console.log('[CarPlayHandler] Local favorites load failed');
    }
    
    // Last resort - quick server sync with timeout
    console.log('[CarPlayHandler] Attempting quick server sync...');
    try {
      // Give server sync max 2 seconds, then return empty
      const timeoutPromise = new Promise<void>((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 2000)
      );
      await Promise.race([store.syncWithServer(), timeoutPromise]);
    } catch (e) {
      console.log('[CarPlayHandler] Server sync timed out or failed');
    }
    
    const favorites = useFavoritesStore.getState().favorites;
    console.log('[CarPlayHandler] Returning', favorites?.length || 0, 'favorites');
    return favorites || [];
  } catch (error) {
    console.error('[CarPlayHandler] Error fetching favorites:', error);
    return [];
  }
};

const getRecentStations = async (): Promise<Station[]> => {
  try {
    // Use userService which has the getRecentlyPlayed method (not stationService!)
    const response = await userService.getRecentlyPlayed();
    console.log('[CarPlayHandler] Got', (response || []).length, 'recently played stations');
    return response || [];
  } catch (error) {
    console.error('[CarPlayHandler] Error fetching recent:', error);
    // Fallback: try from recentlyPlayedStore
    try {
      const recentlyPlayedStore = require('../store/recentlyPlayedStore').default;
      const recentStations = recentlyPlayedStore.getState()?.recentStations || [];
      console.log('[CarPlayHandler] Using local recently played:', recentStations.length);
      return recentStations;
    } catch {
      return [];
    }
  }
};

const getGenresList = async (): Promise<{ name: string; count: number }[]> => {
  try {
    // Get selected country code for filtering genres
    // API expects ISO country code (e.g., "TR", "DE") not country name
    const { countryCode, country } = useLocationStore.getState();
    
    console.log('[CarPlayHandler] Fetching genres for countryCode:', countryCode, 'country:', country);
    
    // Use precomputed genres endpoint - faster and cached, limit=40 for CarPlay
    // Pass countryCode for filtered results (API expects ISO code like "TR")
    // COLD START FIX: If no countryCode available, fetch global genres (no country filter)
    const response = await genreService.getPrecomputedGenres(countryCode || undefined, 40);
    
    // Return top 40 genres for CarPlay list
    const genres = (response.data || []).slice(0, 40).map((g: any) => ({
      name: g.name || g.slug || g,
      count: g.stationCount || g.total_stations || g.count || 0,
    }));
    
    console.log('[CarPlayHandler] Got', genres.length, 'genres for CarPlay (countryCode:', countryCode, ')');
    
    // If no genres returned and we had a country filter, try without country filter
    if (genres.length === 0 && countryCode) {
      console.log('[CarPlayHandler] No genres with country filter, trying global...');
      const globalResponse = await genreService.getPrecomputedGenres(undefined, 40);
      const globalGenres = (globalResponse.data || []).slice(0, 40).map((g: any) => ({
        name: g.name || g.slug || g,
        count: g.stationCount || g.total_stations || g.count || 0,
      }));
      console.log('[CarPlayHandler] Got', globalGenres.length, 'global genres (fallback)');
      return globalGenres;
    }
    
    return genres;
  } catch (error) {
    console.error('[CarPlayHandler] Error fetching genres:', error);
    return [];
  }
};

const getStationsByGenre = async (genre: string): Promise<Station[]> => {
  try {
    // Get selected country for filtering
    // Use countryEnglish for genre stations API (expects English name like "Turkey")
    const { countryEnglish, country } = useLocationStore.getState();
    const selectedCountry = countryEnglish || country || undefined;
    
    // Genre slug should be lowercase with hyphens (e.g., "hip-hop", "rock", "pop")
    // DO NOT convert to lowercase if already in correct format from API
    const genreSlug = genre.toLowerCase().replace(/\s+/g, '-');
    
    console.log('[CarPlayHandler] Fetching stations for genre:', genre, '-> slug:', genreSlug, 'country:', selectedCountry);
    
    // Use genreService for better country filtering
    // Pass countryEnglish (e.g., "Turkey") for genre stations API
    const response = await genreService.getGenreStations(genreSlug, 1, 50, selectedCountry);
    
    console.log('[CarPlayHandler] Got', response.stations?.length || 0, 'stations for genre', genre, '(country:', selectedCountry, ')');
    
    // Log first 3 stations for debugging
    if (response.stations && response.stations.length > 0) {
      console.log('[CarPlayHandler] First 3 genre stations:', 
        response.stations.slice(0, 3).map(s => `${s.name} (${s.country})`).join(', '));
    } else {
      console.warn('[CarPlayHandler] NO STATIONS returned for genre:', genre, 'country:', selectedCountry);
    }
    
    return response.stations || [];
  } catch (error) {
    console.error('[CarPlayHandler] Error fetching genre stations:', error);
    return [];
  }
};

// Search stations API wrapper for CarPlay
const searchStations = async (query: string): Promise<Station[]> => {
  try {
    console.log('[CarPlayHandler] Searching stations for query:', query);
    
    const stations = await stationService.searchStations(query, 20);
    
    console.log('[CarPlayHandler] Search returned', stations?.length || 0, 'stations');
    return stations || [];
  } catch (error) {
    console.error('[CarPlayHandler] Error searching stations:', error);
    return [];
  }
};

export const CarPlayHandler: React.FC = () => {
  const { playStation, isReady: isAudioReady } = useAudioPlayer();
  const queryClient = useQueryClient();
  const initializedRef = useRef(false);
  
  // Watch favorites, location, and recently played changes
  const favorites = useFavoritesStore(state => state.favorites);
  const { country, countryEnglish } = useLocationStore();
  const recentStations = useRecentlyPlayedStore(state => state.stations);
  
  // Send log immediately when component mounts (before useEffect)
  const { sendLog } = require('../services/remoteLog');
  
  // Debounced refresh function to avoid too many refreshes
  const debouncedRefresh = (reason: string) => {
    // CRASH FIX: Prevent concurrent refreshes which can cause 
    // REASwizzledUIManager race condition with RCTUIManager
    if (isRefreshing) {
      console.log(`[CarPlayHandler] Skipping refresh (already refreshing): ${reason}`);
      return;
    }
    
    if (refreshDebounceTimer) {
      clearTimeout(refreshDebounceTimer);
    }
    
    // Increased debounce to 1000ms to prevent rapid updates causing crash
    refreshDebounceTimer = setTimeout(async () => {
      if (CarPlayService.isConnected && !isRefreshing) {
        console.log(`[CarPlayHandler] Triggering CarPlay refresh: ${reason}`);
        sendLog('[CarPlayHandler] Refreshing CarPlay', { reason });
        
        isRefreshing = true;
        try {
          await CarPlayService.refreshTemplates();
          console.log('[CarPlayHandler] CarPlay refresh completed');
        } catch (err) {
          console.error('[CarPlayHandler] CarPlay refresh failed:', err);
        } finally {
          isRefreshing = false;
        }
      }
    }, 1000);
  };

  // COLD START FIX: Initialize CarPlayService IMMEDIATELY when component mounts
  // Don't wait for playStation - create templates without play capability first.
  // This ensures CarPlay shows real data instead of "Loading..." on cold start.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    
    console.log('[CarPlayHandler] Component mounted - initializing CarPlay early (without playStation)');
    sendLog('[CarPlayHandler] EARLY INIT - mounting', { hasPlayStation: !!playStation });

    // Pre-warm the cache in background
    const { country: c, countryEnglish: ce } = useLocationStore.getState();
    Promise.all([
      stationService.getPopularStations(ce || c || undefined, 50).catch(() => {}),
      genreService.getPrecomputedGenres(ce || c || undefined, 40).catch(() => {}),
      useFavoritesStore.getState().loadLocalFavorites().catch(() => {}),
    ]).then(() => {
      console.log('[CarPlayHandler] Cache pre-warmed successfully');
      sendLog('[CarPlayHandler] Cache pre-warmed');
    }).catch(() => {});

    // Initialize with a no-op playStation placeholder
    // Templates will be created and visible, play will work once playStation is available
    const deferredPlayStation = async (station: any) => {
      console.log('[CarPlayHandler] Deferred play - waiting for playStation...');
      sendLog('[CarPlayHandler] Deferred play attempt', { station: station?.name });
      
      // Retry up to 20 times (10 seconds total) for cold start scenarios
      // Check BOTH isAudioReady AND playStationRef to ensure real audio provider is ready
      for (let attempt = 0; attempt < 20; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const currentPlayStation = playStationRef.current;
        const audioReady = isAudioReadyRef.current;
        
        if (audioReady && currentPlayStation) {
          console.log('[CarPlayHandler] playStation + AudioProvider ready after', (attempt + 1) * 500, 'ms');
          sendLog('[CarPlayHandler] Deferred play SUCCESS', { delay: (attempt + 1) * 500 });
          return currentPlayStation(station);
        }
      }
      console.warn('[CarPlayHandler] playStation still not available after 10s - giving up');
      sendLog('[CarPlayHandler] Deferred play FAILED - timeout after 10s');
    };

    try {
      CarPlayService.initialize(
        deferredPlayStation,
        getPopularStations,
        getFavoriteStations,
        getRecentStations,
        getGenresList,
        getStationsByGenre,
        searchStations
      );
      initializedRef.current = true;
      console.log('[CarPlayHandler] CarPlayService.initialize completed (early, deferred play)');
      sendLog('[CarPlayHandler] CarPlayService.initialize COMPLETED (early)');
    } catch (error: any) {
      console.error('[CarPlayHandler] Error initializing:', error);
      sendLog('[CarPlayHandler] ERROR initializing', { error: String(error) });
    }

    return () => {
      console.log('[CarPlayHandler] Cleaning up CarPlay service');
      if (refreshDebounceTimer) {
        clearTimeout(refreshDebounceTimer);
        refreshDebounceTimer = null;
      }
      isRefreshing = false;
      initializedRef.current = false;
      CarPlayService.disconnect();
    };
  }, []);

  // Store ref to latest playStation and isReady for deferred play
  const playStationRef = useRef(playStation);
  playStationRef.current = playStation;
  const isAudioReadyRef = useRef(isAudioReady);
  isAudioReadyRef.current = isAudioReady;
  
  // When playStation becomes available, update the callback in CarPlayService
  // and refresh templates so play actually works
  useEffect(() => {
    if (Platform.OS === 'web' || !playStation || !initializedRef.current) return;
    
    console.log('[CarPlayHandler] playStation NOW AVAILABLE - updating CarPlay callbacks');
    sendLog('[CarPlayHandler] playStation READY - updating callbacks');
    
    // Re-initialize with real playStation to update the callback
    try {
      CarPlayService.initialize(
        playStation,
        getPopularStations,
        getFavoriteStations,
        getRecentStations,
        getGenresList,
        getStationsByGenre,
        searchStations
      );
      console.log('[CarPlayHandler] CarPlayService re-initialized with real playStation');
      sendLog('[CarPlayHandler] CarPlayService RE-INITIALIZED with playStation');
      
      // COLD START FIX: If CarPlay is already connected, force a template refresh
      // This ensures playback works even if templates were created with deferred play
      if (CarPlayService.isConnected) {
        console.log('[CarPlayHandler] CarPlay is connected - forcing template refresh with real playStation');
        sendLog('[CarPlayHandler] Forcing template refresh (connected + playStation ready)');
        setTimeout(() => {
          CarPlayService.refreshTemplates?.().catch((err: any) => {
            console.error('[CarPlayHandler] Template refresh error:', err);
          });
        }, 300);
      }
    } catch (error: any) {
      console.error('[CarPlayHandler] Error re-initializing:', error);
    }
  }, [playStation]);
  
  // Watch for country changes - when user changes country, refresh CarPlay stations
  useEffect(() => {
    if (Platform.OS === 'web') return;
    
    const currentCountry = countryEnglish || country;
    
    // Skip first run and only trigger on actual changes
    if (lastCountry !== null && currentCountry !== lastCountry) {
      console.log('[CarPlayHandler] Country changed from', lastCountry, 'to', currentCountry);
      sendLog('[CarPlayHandler] Country changed', { from: lastCountry, to: currentCountry });
      
      // IMPORTANT: Invalidate React Query cache to prevent showing old country data
      // This fixes the "double loading" issue where global stations appear first
      queryClient.invalidateQueries({ queryKey: ['popularStations'] });
      queryClient.invalidateQueries({ queryKey: ['genres'] });
      console.log('[CarPlayHandler] Invalidated React Query cache for new country');
      
      // Trigger CarPlay template refresh
      debouncedRefresh(`Country changed: ${lastCountry} → ${currentCountry}`);
    }
    
    lastCountry = currentCountry;
  }, [country, countryEnglish, queryClient]);
  
  // Watch for favorites changes - when user adds/removes favorites, update CarPlay
  useEffect(() => {
    if (Platform.OS === 'web') return;
    
    const currentCount = favorites?.length || 0;
    
    // Skip first load (-1), only trigger on actual changes after initial load
    if (lastFavoritesCount >= 0 && currentCount !== lastFavoritesCount) {
      console.log('[CarPlayHandler] Favorites changed from', lastFavoritesCount, 'to', currentCount);
      sendLog('[CarPlayHandler] Favorites changed', { from: lastFavoritesCount, to: currentCount });
      
      // Trigger CarPlay template refresh
      debouncedRefresh(`Favorites changed: ${lastFavoritesCount} → ${currentCount}`);
    }
    
    lastFavoritesCount = currentCount;
  }, [favorites]);
  
  // Watch for recently played changes - when user plays a station, update CarPlay
  useEffect(() => {
    if (Platform.OS === 'web') return;
    
    const currentCount = recentStations?.length || 0;
    
    // Skip first load (-1), only trigger on actual changes after initial load
    if (lastRecentCount >= 0 && currentCount !== lastRecentCount) {
      console.log('[CarPlayHandler] Recently played changed from', lastRecentCount, 'to', currentCount);
      sendLog('[CarPlayHandler] Recently played changed', { from: lastRecentCount, to: currentCount });
      
      // Trigger CarPlay template refresh
      debouncedRefresh(`Recently played changed: ${lastRecentCount} → ${currentCount}`);
    }
    
    lastRecentCount = currentCount;
  }, [recentStations]);

  // ==================== ANDROID AUTO INTEGRATION ====================
  
  // Initialize Android Auto event listeners (Android only)
  useEffect(() => {
    if (Platform.OS !== 'android' || !AndroidAutoModule) {
      return;
    }
    
    console.log('[CarPlayHandler] Initializing Android Auto event listeners');
    
    try {
      // Create event emitter for Android Auto
      androidAutoEventEmitter = new NativeEventEmitter(AndroidAutoModule);
      
      // Listen for play station events from Android Auto
      const playStationSubscription = androidAutoEventEmitter.addListener(
        'AndroidAutoPlayStation',
        async (event: {
          stationId: string;
          stationName: string;
          streamUrl: string;
          logoUrl: string;
          country: string;
          genre: string;
        }) => {
          console.log('[CarPlayHandler] Android Auto play station:', event.stationName);
          sendLog('[CarPlayHandler] Android Auto play station', { station: event.stationName });
          
          // Create station object and play
          const station: Station = {
            _id: event.stationId,
            name: event.stationName,
            url: event.streamUrl,
            url_resolved: event.streamUrl,
            favicon: event.logoUrl,
            country: event.country,
            tags: event.genre,
          } as Station;
          
          if (playStation) {
            try {
              await playStation(station);
              console.log('[CarPlayHandler] Android Auto station playing:', event.stationName);
            } catch (error) {
              console.error('[CarPlayHandler] Android Auto playback error:', error);
            }
          }
        }
      );
      
      // Listen for playback commands from Android Auto
      const commandSubscription = androidAutoEventEmitter.addListener(
        'AndroidAutoPlaybackCommand',
        (event: { command: string }) => {
          console.log('[CarPlayHandler] Android Auto command:', event.command);
          sendLog('[CarPlayHandler] Android Auto command', { command: event.command });
          
          // Handle commands through TrackPlayer
          // Note: These are typically handled by react-native-track-player automatically
          // but we log them for debugging
        }
      );
      
      // Set initial country for Android Auto
      const { countryEnglish, country: currentCountry } = useLocationStore.getState();
      const selectedCountry = countryEnglish || currentCountry || null;
      if (selectedCountry && AndroidAutoModule?.setSelectedCountry) {
        AndroidAutoModule.setSelectedCountry(selectedCountry);
        console.log('[CarPlayHandler] Set Android Auto country:', selectedCountry);
      }
      
      return () => {
        console.log('[CarPlayHandler] Cleaning up Android Auto listeners');
        playStationSubscription.remove();
        commandSubscription.remove();
        androidAutoEventEmitter = null;
      };
    } catch (error) {
      console.error('[CarPlayHandler] Error setting up Android Auto listeners:', error);
    }
  }, [playStation]);
  
  // Sync country changes to Android Auto
  useEffect(() => {
    if (Platform.OS !== 'android' || !AndroidAutoModule?.setSelectedCountry) {
      return;
    }
    
    const selectedCountry = countryEnglish || country || null;
    
    if (selectedCountry) {
      console.log('[CarPlayHandler] Syncing country to Android Auto:', selectedCountry);
      AndroidAutoModule.setSelectedCountry(selectedCountry);
    }
  }, [country, countryEnglish]);

  // This component doesn't render anything
  return null;
};

export default CarPlayHandler;

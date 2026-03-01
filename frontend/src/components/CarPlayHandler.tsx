// CarPlayHandler - Initializes CarPlay & Android Auto integration
// Must be rendered inside AudioProvider

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import CarPlayService from '../services/carPlayService';
import stationService from '../services/stationService';
import genreService from '../services/genreService';
import { useFavoritesStore } from '../store/favoritesStore';
import { useLocationStore } from '../store/locationStore';
import useRecentlyPlayedStore from '../store/recentlyPlayedStore';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import type { Station } from '../types';

// Track last values to detect changes (module-level for persistence)
let lastCountry: string | null = null;
let lastFavoritesCount: number = -1; // -1 to detect first load
let lastRecentCount: number = -1; // -1 to detect first load
let refreshDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let isRefreshing: boolean = false; // Prevent concurrent refreshes (crash fix)

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
    
    // If favorites not loaded yet, try to sync with server first
    if (!store.isLoaded || store.favorites.length === 0) {
      console.log('[CarPlayHandler] Favorites not loaded, attempting to sync...');
      try {
        await store.syncWithServer();
      } catch (syncError) {
        console.log('[CarPlayHandler] Server sync failed, trying local load...');
        await store.loadLocalFavorites();
      }
    }
    
    // Get fresh state after loading
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
    const response = await stationService.getRecentlyPlayed();
    return response || [];
  } catch (error) {
    console.error('[CarPlayHandler] Error fetching recent:', error);
    return [];
  }
};

const getGenresList = async (): Promise<{ name: string; count: number }[]> => {
  try {
    // Get selected country for filtering genres
    const { country } = useLocationStore.getState();
    
    console.log('[CarPlayHandler] Fetching genres for country:', country);
    
    // Use precomputed genres endpoint - faster and cached, limit=40 for CarPlay
    // Pass country for filtered results
    const response = await genreService.getPrecomputedGenres(country || undefined, 40);
    
    // Return top 40 genres for CarPlay list
    const genres = (response.data || []).slice(0, 40).map((g: any) => ({
      name: g.name || g.slug || g,
      count: g.stationCount || g.total_stations || g.count || 0,
    }));
    
    console.log('[CarPlayHandler] Got', genres.length, 'genres for CarPlay');
    return genres;
  } catch (error) {
    console.error('[CarPlayHandler] Error fetching genres:', error);
    return [];
  }
};

const getStationsByGenre = async (genre: string): Promise<Station[]> => {
  try {
    // Get selected country for filtering
    const { countryEnglish, country } = useLocationStore.getState();
    const selectedCountry = countryEnglish || country || undefined;
    
    console.log('[CarPlayHandler] Fetching stations for genre:', genre, 'country:', selectedCountry);
    
    // Use genreService for better country filtering
    const response = await genreService.getGenreStations(genre.toLowerCase(), 1, 50, selectedCountry);
    
    console.log('[CarPlayHandler] Got', response.stations?.length || 0, 'stations for genre', genre);
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
  const { playStation } = useAudioPlayer();
  const queryClient = useQueryClient();
  
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
    }, 1000); // Increased from 500ms to 1000ms for stability
  };
  
  // Log on every render to debug
  console.log('[CarPlayHandler] Component rendering, playStation:', !!playStation);
  sendLog('[CarPlayHandler] Component RENDER', { 
    hasPlayStation: !!playStation,
    platform: Platform.OS 
  });

  useEffect(() => {
    console.log('[CarPlayHandler] useEffect RUNNING');
    sendLog('[CarPlayHandler] useEffect RUNNING', { platform: Platform.OS });
    
    // Only initialize on native platforms
    if (Platform.OS === 'web') {
      console.log('[CarPlayHandler] Skipping on web platform');
      sendLog('[CarPlayHandler] Skipping - web platform');
      return;
    }

    if (!playStation) {
      console.log('[CarPlayHandler] playStation not ready yet');
      sendLog('[CarPlayHandler] playStation NOT READY - waiting');
      return;
    }

    console.log('[CarPlayHandler] ========== INITIALIZING ==========');
    sendLog('[CarPlayHandler] INITIALIZING CarPlayService');

    try {
      CarPlayService.initialize(
        playStation,
        getPopularStations,
        getFavoriteStations,
        getRecentStations,
        getGenresList,
        getStationsByGenre,
        searchStations  // Add search callback
      );
      
      console.log('[CarPlayHandler] CarPlayService.initialize completed');
      sendLog('[CarPlayHandler] CarPlayService.initialize COMPLETED');
    } catch (error: any) {
      console.error('[CarPlayHandler] Error initializing:', error);
      sendLog('[CarPlayHandler] ERROR initializing', { error: String(error) });
    }

    // Cleanup on unmount
    return () => {
      console.log('[CarPlayHandler] Cleaning up CarPlay service');
      if (refreshDebounceTimer) {
        clearTimeout(refreshDebounceTimer);
        refreshDebounceTimer = null;
      }
      isRefreshing = false; // Reset refresh flag
      CarPlayService.disconnect();
    };
  }, [playStation]);
  
  // Watch for country changes - when user changes country, refresh CarPlay stations
  useEffect(() => {
    if (Platform.OS === 'web') return;
    
    const currentCountry = countryEnglish || country;
    
    // Skip first run and only trigger on actual changes
    if (lastCountry !== null && currentCountry !== lastCountry) {
      console.log('[CarPlayHandler] Country changed from', lastCountry, 'to', currentCountry);
      sendLog('[CarPlayHandler] Country changed', { from: lastCountry, to: currentCountry });
      
      // Trigger CarPlay template refresh
      debouncedRefresh(`Country changed: ${lastCountry} → ${currentCountry}`);
    }
    
    lastCountry = currentCountry;
  }, [country, countryEnglish]);
  
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

  // This component doesn't render anything
  return null;
};

export default CarPlayHandler;

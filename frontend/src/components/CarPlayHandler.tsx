// CarPlayHandler - Initializes CarPlay & Android Auto integration
// Must be rendered inside AudioProvider

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import CarPlayService from '../services/carPlayService';
import stationService from '../services/stationService';
import genreService from '../services/genreService';
import { useFavoritesStore } from '../store/favoritesStore';
import { useLocationStore } from '../store/locationStore';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import type { Station } from '../types';

// Track last values to detect changes
let lastCountry: string | null = null;
let lastFavoritesCount: number = 0;

// API wrapper functions for CarPlay
const getPopularStations = async (): Promise<Station[]> => {
  try {
    // Get selected country from location store
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
    // Use precomputed genres endpoint - faster and cached, limit=40 for CarPlay
    const response = await genreService.getPrecomputedGenres(undefined, 40);
    // Return top 40 genres for CarPlay list
    return (response.data || []).slice(0, 40).map((g: any) => ({
      name: g.name || g.slug || g,
      count: g.stationCount || g.total_stations || g.count || 0,
    }));
  } catch (error) {
    console.error('[CarPlayHandler] Error fetching genres:', error);
    return [];
  }
};

const getStationsByGenre = async (genre: string): Promise<Station[]> => {
  try {
    const response = await stationService.getStations({
      tag: genre,
      limit: 50,  // CarPlay: 50 stations per genre
      order: 'votes',
    });
    return response.stations || [];
  } catch (error) {
    console.error('[CarPlayHandler] Error fetching genre stations:', error);
    return [];
  }
};

export const CarPlayHandler: React.FC = () => {
  const { playStation } = useAudioPlayer();
  
  // Watch favorites and location changes
  const favorites = useFavoritesStore(state => state.favorites);
  const { country, countryEnglish } = useLocationStore();
  
  // Send log immediately when component mounts (before useEffect)
  const { sendLog } = require('../services/remoteLog');
  
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
        getStationsByGenre
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
      
      // CarPlay templates will be refreshed via the language change listener
      // or we can manually trigger a refresh here if CarPlay is connected
      if (CarPlayService.isConnected) {
        console.log('[CarPlayHandler] CarPlay connected - templates will use new country on next refresh');
      }
    }
    
    lastCountry = currentCountry;
  }, [country, countryEnglish]);
  
  // Watch for favorites changes - when user adds/removes favorites, update CarPlay
  useEffect(() => {
    if (Platform.OS === 'web') return;
    
    const currentCount = favorites?.length || 0;
    
    // Skip first run and only trigger on actual changes
    if (lastFavoritesCount > 0 && currentCount !== lastFavoritesCount) {
      console.log('[CarPlayHandler] Favorites changed from', lastFavoritesCount, 'to', currentCount);
      sendLog('[CarPlayHandler] Favorites changed', { from: lastFavoritesCount, to: currentCount });
      
      // CarPlay templates will pick up new favorites on next render
      // The favorites tab always calls getFavoriteStations() fresh
    }
    
    lastFavoritesCount = currentCount;
  }, [favorites]);

  // This component doesn't render anything
  return null;
};

export default CarPlayHandler;

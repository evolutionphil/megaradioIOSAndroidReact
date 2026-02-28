// CarPlayHandler - Initializes CarPlay & Android Auto integration
// Must be rendered inside AudioProvider

import { useEffect } from 'react';
import { Platform } from 'react-native';
import CarPlayService from '../services/carPlayService';
import stationService from '../services/stationService';
import genreService from '../services/genreService';
import { useFavoritesStore } from '../store/favoritesStore';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import type { Station } from '../types';

// API wrapper functions for CarPlay
const getPopularStations = async (): Promise<Station[]> => {
  try {
    const response = await stationService.getStations({ 
      limit: 50,  // CarPlay: 50 stations for browse
      order: 'votes' 
    });
    return response.stations || [];
  } catch (error) {
    console.error('[CarPlayHandler] Error fetching stations:', error);
    return [];
  }
};

const getFavoriteStations = async (): Promise<Station[]> => {
  try {
    const favorites = useFavoritesStore.getState().favorites;
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

  // This component doesn't render anything
  return null;
};

export default CarPlayHandler;

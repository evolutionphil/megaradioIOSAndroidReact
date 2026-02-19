// CarPlayHandler - Initializes CarPlay & Android Auto integration
// Must be rendered inside AudioProvider

import { useEffect } from 'react';
import { Platform } from 'react-native';
import CarPlayService from '../services/carPlayService';
import stationService from '../services/stationService';
import { useFavoritesStore } from '../store/favoritesStore';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import type { Station } from '../types';

// API wrapper functions for CarPlay
const getPopularStations = async (): Promise<Station[]> => {
  try {
    const response = await stationService.getStations({ 
      country: 'Turkey', 
      limit: 20,
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
    const response = await stationService.getGenres();
    // Return top 8 genres for CarPlay grid
    return (response || []).slice(0, 8).map((g: any) => ({
      name: g.name || g,
      count: g.count || 0,
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
      limit: 20,
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

  useEffect(() => {
    // Only initialize on native platforms
    if (Platform.OS === 'web') {
      console.log('[CarPlayHandler] Skipping on web platform');
      return;
    }

    console.log('[CarPlayHandler] Initializing CarPlay service...');

    // Initialize CarPlay with callbacks
    CarPlayService.initialize(
      playStation,
      getPopularStations,
      getFavoriteStations,
      getRecentStations,
      getGenresList,
      getStationsByGenre
    );

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

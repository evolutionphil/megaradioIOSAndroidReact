// PlayAtLoginHandler - Handles automatic playback on app start based on user settings
// Must be used inside AudioProvider to access playStation function

import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { useFavoritesStore } from '../store/favoritesStore';
import { useAudio } from '../hooks/useAudioPlayer';
import stationService from '../services/stationService';

const PLAY_AT_LOGIN_KEY = 'play_at_login_setting';
const LAST_PLAYED_STATION_KEY = '@megaradio_last_played_station';

export const PlayAtLoginHandler: React.FC = () => {
  const hasExecuted = useRef(false);
  const { isAuthenticated, isAuthLoaded } = useAuthStore();
  const { favorites, isLoaded: favoritesLoaded } = useFavoritesStore();
  const { playStation } = useAudio();

  useEffect(() => {
    const executePlayAtLogin = async () => {
      // Only execute once per app session
      if (hasExecuted.current) {
        return;
      }

      // Wait for auth to be loaded from storage first
      if (!isAuthLoaded) {
        console.log('[PlayAtLogin] Auth not loaded yet, waiting...');
        return;
      }

      // Check if user is authenticated
      if (!isAuthenticated) {
        console.log('[PlayAtLogin] User not authenticated, skipping');
        hasExecuted.current = true; // Mark as executed to prevent re-running
        return;
      }

      // Wait a bit for app to fully initialize after auth confirmed
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        const setting = await AsyncStorage.getItem(PLAY_AT_LOGIN_KEY);
        console.log('[PlayAtLogin] Setting:', setting);

        // Mark as executed regardless of setting to prevent re-runs
        hasExecuted.current = true;

        if (!setting || setting === 'off') {
          console.log('[PlayAtLogin] Disabled or not set');
          return;
        }

        let stationToPlay = null;

        switch (setting) {
          case 'last_played':
            // Get last played station from storage
            const lastPlayedJson = await AsyncStorage.getItem(LAST_PLAYED_STATION_KEY);
            if (lastPlayedJson) {
              stationToPlay = JSON.parse(lastPlayedJson);
              console.log('[PlayAtLogin] Last played station:', stationToPlay?.name);
            }
            break;

          case 'favorite':
            // Get first favorite station
            if (favorites && favorites.length > 0) {
              stationToPlay = favorites[0];
              console.log('[PlayAtLogin] First favorite station:', stationToPlay?.name);
            }
            break;

          case 'random':
            // Get random station from API
            try {
              const response = await stationService.getStations({ limit: 50 });
              if (response?.stations && response.stations.length > 0) {
                const randomIndex = Math.floor(Math.random() * response.stations.length);
                stationToPlay = response.stations[randomIndex];
                console.log('[PlayAtLogin] Random station:', stationToPlay?.name);
              }
            } catch (error) {
              console.error('[PlayAtLogin] Failed to fetch random station:', error);
            }
            break;
        }

        if (stationToPlay) {
          console.log('[PlayAtLogin] Starting playback:', stationToPlay.name);
          await playStation(stationToPlay);
        }
      } catch (error) {
        console.error('[PlayAtLogin] Error:', error);
      }
    };

    executePlayAtLogin();
  }, [isAuthenticated, isAuthLoaded, favorites, favoritesLoaded, playStation]);

  // This component doesn't render anything
  return null;
};

export default PlayAtLoginHandler;

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './authStore';
import api from '../services/api';
import type { Station } from '../types';

const STORAGE_KEY = 'megaradio_recently_played';
const MAX_RECENT = 12;

interface RecentlyPlayedState {
  stations: Station[];
  loaded: boolean;
  isLoading: boolean;
  addStation: (station: Station) => void;
  loadFromStorage: () => Promise<void>;
  loadFromAPI: () => Promise<void>;
  syncToAPI: (stationId: string) => Promise<void>;
}

// Helper to check if user is authenticated
const isAuthenticated = (): boolean => {
  return useAuthStore.getState().isAuthenticated;
};

export const useRecentlyPlayedStore = create<RecentlyPlayedState>((set, get) => ({
  stations: [],
  loaded: false,
  isLoading: false,

  addStation: (station: Station) => {
    const current = get().stations;
    // Remove if already exists, then prepend
    const filtered = current.filter(s => s._id !== station._id);
    const updated = [station, ...filtered].slice(0, MAX_RECENT);
    set({ stations: updated });
    
    // Persist to local storage
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
    
    // Sync to API if authenticated
    if (isAuthenticated()) {
      get().syncToAPI(station._id);
    }
  },

  loadFromStorage: async () => {
    if (get().loaded) return;
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        set({ stations: JSON.parse(data), loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  // Load recently played from API for authenticated users
  loadFromAPI: async () => {
    if (!isAuthenticated()) {
      console.log('[RecentlyPlayedStore] Not authenticated, loading from local storage');
      await get().loadFromStorage();
      return;
    }

    set({ isLoading: true });

    try {
      console.log('[RecentlyPlayedStore] Loading from API with auth token...');
      
      // Use api instance which automatically adds Authorization header via interceptor
      const response = await api.get('/api/recently-played');
      const data = response.data;
      
      // API returns array of stations with playedAt field
      const stations = Array.isArray(data) ? data : (data.stations || []);
      
      console.log('[RecentlyPlayedStore] API returned', stations.length, 'stations');
      
      // Merge with local storage (API takes priority)
      const localData = await AsyncStorage.getItem(STORAGE_KEY);
      const localStations: Station[] = localData ? JSON.parse(localData) : [];
      
      // Merge: API stations + local-only stations
      const apiIds = new Set(stations.map((s: Station) => s._id));
      const localOnly = localStations.filter(s => !apiIds.has(s._id));
      const merged = [...stations, ...localOnly].slice(0, MAX_RECENT);
      
      set({ stations: merged, loaded: true, isLoading: false });
      
      // Update local storage with merged data
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (error) {
      console.error('[RecentlyPlayedStore] Error loading from API:', error);
      await get().loadFromStorage();
      set({ isLoading: false });
    }
  },

  // Sync a station play to API
  syncToAPI: async (stationId: string) => {
    if (!isAuthenticated()) {
      console.log('[RecentlyPlayedStore] Not authenticated, skipping API sync');
      return;
    }

    try {
      console.log('[RecentlyPlayedStore] Syncing station to API:', stationId);
      
      // Use api instance which automatically adds Authorization header via interceptor
      await api.post('/api/recently-played', { stationId });
      
      console.log('[RecentlyPlayedStore] Successfully synced to API');
    } catch (error) {
      console.error('[RecentlyPlayedStore] Error syncing to API:', error);
    }
  },
}));

export default useRecentlyPlayedStore;

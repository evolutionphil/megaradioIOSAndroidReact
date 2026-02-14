import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './authStore';
import type { Station } from '../types';

const STORAGE_KEY = 'megaradio_recently_played';
const MAX_RECENT = 12;
const API_BASE = 'https://themegaradio.com';
const API_KEY = 'mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw';

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
      await get().loadFromStorage();
      return;
    }

    set({ isLoading: true });

    try {
      const { token } = useAuthStore.getState();
      const headers: Record<string, string> = {
        'X-API-Key': API_KEY,
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/api/recently-played`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        // API returns array of stations with playedAt field
        const stations = Array.isArray(data) ? data : (data.stations || []);
        
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
      } else {
        // Fallback to local storage
        await get().loadFromStorage();
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error loading recently played from API:', error);
      await get().loadFromStorage();
      set({ isLoading: false });
    }
  },

  // Sync a station play to API
  syncToAPI: async (stationId: string) => {
    if (!isAuthenticated()) return;

    try {
      const { token } = useAuthStore.getState();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      await fetch(`${API_BASE}/api/recently-played`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ stationId }),
      });
    } catch (error) {
      console.error('Error syncing recently played to API:', error);
    }
  },
}));

export default useRecentlyPlayedStore;

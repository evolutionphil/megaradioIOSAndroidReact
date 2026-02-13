import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Station } from '../types';

const STORAGE_KEY = 'megaradio_recently_played';
const MAX_RECENT = 12;

interface RecentlyPlayedState {
  stations: Station[];
  loaded: boolean;
  addStation: (station: Station) => void;
  loadFromStorage: () => Promise<void>;
}

export const useRecentlyPlayedStore = create<RecentlyPlayedState>((set, get) => ({
  stations: [],
  loaded: false,

  addStation: (station: Station) => {
    const current = get().stations;
    // Remove if already exists, then prepend
    const filtered = current.filter(s => s._id !== station._id);
    const updated = [station, ...filtered].slice(0, MAX_RECENT);
    set({ stations: updated });
    // Persist async
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
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
}));

export default useRecentlyPlayedStore;

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';
import { userService } from '../services/userService';
import { useAuthStore } from './authStore';
import type { Station } from '../types';

const FAVORITES_KEY = '@megaradio_favorites';
const FAVORITES_ORDER_KEY = '@megaradio_favorites_order';
const ANDROID_AUTO_FAVORITES_KEY = 'megaradio_android_auto_favorites';

export type SortOption = 'newest' | 'oldest' | 'az' | 'za' | 'custom';
export type ViewMode = 'list' | 'grid';

interface FavoritesState {
  favorites: Station[];
  customOrder: string[];
  sortOption: SortOption;
  viewMode: ViewMode;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadFavorites: () => Promise<void>;
  loadFromLocal: () => Promise<void>;
  addFavorite: (station: Station) => Promise<void>;
  removeFavorite: (stationId: string) => Promise<void>;
  isFavorite: (stationId: string) => boolean;
  toggleFavorite: (station: Station) => Promise<void>;
  setSortOption: (option: SortOption) => void;
  setViewMode: (mode: ViewMode) => void;
  updateCustomOrder: (orderedIds: string[]) => Promise<void>;
  getSortedFavorites: () => Station[];
  syncWithServer: () => Promise<void>;
}

// Helper to check if user is authenticated
const isAuthenticated = (): boolean => {
  return useAuthStore.getState().isAuthenticated;
};

// Helper to sync favorites to Android Auto via SharedPreferences
// This is needed because Android Auto's MediaBrowserService runs in native code
const syncToAndroidAuto = async (favorites: Station[]): Promise<void> => {
  if (Platform.OS !== 'android') return;
  
  try {
    // Format favorites for Android Auto consumption
    const autoFavorites = favorites.slice(0, 20).map(station => ({
      id: station._id,
      name: station.name,
      country: station.country || '',
      streamUrl: (station as any).urlResolved || station.url || '',
      favicon: station.favicon || station.logo || '',
    }));
    
    // Store in AsyncStorage with a specific key that Android native code can read
    // SharedPreferences on Android can access the same storage
    await AsyncStorage.setItem(
      ANDROID_AUTO_FAVORITES_KEY, 
      JSON.stringify(autoFavorites)
    );
    
    console.log('[FavoritesStore] Synced', autoFavorites.length, 'favorites to Android Auto');
  } catch (error) {
    console.error('[FavoritesStore] Error syncing to Android Auto:', error);
  }
};

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  customOrder: [],
  sortOption: 'newest',
  viewMode: 'list',
  isLoaded: false,
  isLoading: false,
  error: null,

  loadFavorites: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const { user, token, isAuthenticated: authStatus } = useAuthStore.getState();
      
      console.log('[FavoritesStore] ========== loadFavorites START ==========');
      console.log('[FavoritesStore] isAuthenticated:', authStatus);
      console.log('[FavoritesStore] user:', user?._id);
      console.log('[FavoritesStore] token exists:', !!token);
      console.log('[FavoritesStore] token prefix:', token?.substring(0, 20));
      
      if (authStatus && user?._id && token) {
        // Use authenticated endpoint GET /api/user/favorites (requires token)
        try {
          console.log('[FavoritesStore] Fetching favorites from API with token...');
          
          // Use userService which uses api interceptor with automatic token
          const favoritesResponse = await userService.getFavorites();
          console.log('[FavoritesStore] Raw API response type:', typeof favoritesResponse);
          console.log('[FavoritesStore] Raw API response keys:', Object.keys(favoritesResponse || {}));
          
          // The API might return { favorites: [...] } or just [...]
          let favorites: Station[];
          if (Array.isArray(favoritesResponse)) {
            favorites = favoritesResponse;
          } else if (favoritesResponse?.favorites && Array.isArray(favoritesResponse.favorites)) {
            favorites = favoritesResponse.favorites;
          } else if (favoritesResponse?.stations && Array.isArray(favoritesResponse.stations)) {
            favorites = favoritesResponse.stations;
          } else {
            console.log('[FavoritesStore] Unexpected response format:', JSON.stringify(favoritesResponse).substring(0, 200));
            favorites = [];
          }
          
          console.log('[FavoritesStore] Parsed favorites count:', favorites.length);
          
          // Also load custom order from local storage
          const orderJson = await AsyncStorage.getItem(FAVORITES_ORDER_KEY);
          const customOrder = orderJson ? JSON.parse(orderJson) : [];
          
          set({ favorites, customOrder, isLoaded: true, isLoading: false });
          console.log('[FavoritesStore] ========== loadFavorites SUCCESS ==========');
          
          // Also save to local storage as backup
          await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
          
          // Sync to Android Auto
          syncToAndroidAuto(favorites);
          return;
        } catch (apiError: any) {
          console.log('[FavoritesStore] API favorites failed:', apiError.message);
          console.log('[FavoritesStore] API error status:', apiError.response?.status);
          console.log('[FavoritesStore] API error data:', JSON.stringify(apiError.response?.data || {}).substring(0, 200));
        }
      } else {
        console.log('[FavoritesStore] Not authenticated or missing token, using local storage');
        console.log('[FavoritesStore] - authStatus:', authStatus);
        console.log('[FavoritesStore] - user?._id:', user?._id);
        console.log('[FavoritesStore] - token:', token ? 'exists' : 'missing');
      }
      
      // Fallback to local storage for guests or API failure
      console.log('[FavoritesStore] Falling back to local storage');
      await get().loadFromLocal();
    } catch (error) {
      console.error('[FavoritesStore] Error loading favorites:', error);
      set({ isLoading: false, isLoaded: true, error: 'Failed to load favorites' });
    }
  },

  // Helper to load from local storage
  loadFromLocal: async () => {
    try {
      const [favoritesJson, orderJson] = await Promise.all([
        AsyncStorage.getItem(FAVORITES_KEY),
        AsyncStorage.getItem(FAVORITES_ORDER_KEY),
      ]);
      
      const favorites = favoritesJson ? JSON.parse(favoritesJson) : [];
      const customOrder = orderJson ? JSON.parse(orderJson) : [];
      
      set({ favorites, customOrder, isLoaded: true, isLoading: false });
      
      // Sync to Android Auto
      syncToAndroidAuto(favorites);
    } catch (error) {
      console.error('Error loading from local storage:', error);
      set({ isLoaded: true, isLoading: false });
    }
  },

  addFavorite: async (station: Station) => {
    const { favorites, customOrder } = get();
    
    // Check if already exists
    if (favorites.some(f => f._id === station._id)) {
      console.log('[FavoritesStore] Station already in favorites:', station._id);
      return;
    }

    // Optimistic update
    const updatedFavorites = [
      { ...station, addedAt: new Date().toISOString() } as Station,
      ...favorites,
    ];
    const updatedOrder = [station._id, ...customOrder];
    set({ favorites: updatedFavorites, customOrder: updatedOrder });

    try {
      // First save to local storage
      console.log('[FavoritesStore] Saving to AsyncStorage:', FAVORITES_KEY, 'favorites count:', updatedFavorites.length);
      await Promise.all([
        AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites)),
        AsyncStorage.setItem(FAVORITES_ORDER_KEY, JSON.stringify(updatedOrder)),
      ]);
      console.log('[FavoritesStore] Local save complete');
      
      // Then try to sync with server if authenticated
      if (isAuthenticated()) {
        console.log('[FavoritesStore] User is authenticated, syncing to API...');
        try {
          const result = await userService.addFavorite(station._id);
          console.log('[FavoritesStore] API sync SUCCESS:', result);
        } catch (apiError: any) {
          console.error('[FavoritesStore] API sync FAILED:', apiError?.response?.status, apiError?.response?.data || apiError.message);
          // Don't revert - local storage is the source of truth
          // API sync will happen on next app open
        }
      } else {
        console.log('[FavoritesStore] User not authenticated, skipping API sync');
      }
      
      // Sync to Android Auto
      syncToAndroidAuto(updatedFavorites);
      
      console.log('[FavoritesStore] addFavorite complete');
    } catch (error: any) {
      console.error('[FavoritesStore] Error adding favorite:', error?.message || error);
      // Revert on local storage error
      set({ favorites, customOrder });
    }
  },

  removeFavorite: async (stationId: string) => {
    const { favorites, customOrder } = get();
    
    // Optimistic update
    const updatedFavorites = favorites.filter(f => f._id !== stationId);
    const updatedOrder = customOrder.filter(id => id !== stationId);
    set({ favorites: updatedFavorites, customOrder: updatedOrder });

    try {
      // First save to local storage
      console.log('[FavoritesStore] Removing from AsyncStorage, new count:', updatedFavorites.length);
      await Promise.all([
        AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites)),
        AsyncStorage.setItem(FAVORITES_ORDER_KEY, JSON.stringify(updatedOrder)),
      ]);
      console.log('[FavoritesStore] Local remove complete');
      
      // Then try to sync with server if authenticated
      if (isAuthenticated()) {
        console.log('[FavoritesStore] User is authenticated, syncing remove to API...');
        try {
          const result = await userService.removeFavorite(stationId);
          console.log('[FavoritesStore] API remove SUCCESS:', result);
        } catch (apiError: any) {
          console.error('[FavoritesStore] API remove FAILED:', apiError?.response?.status, apiError?.response?.data || apiError.message);
          // Don't revert - local storage is the source of truth
        }
      } else {
        console.log('[FavoritesStore] User not authenticated, skipping API sync');
      }
      
      // Sync to Android Auto
      syncToAndroidAuto(updatedFavorites);
      
      console.log('[FavoritesStore] removeFavorite complete');
    } catch (error: any) {
      console.error('[FavoritesStore] Error removing favorite:', error?.message || error);
      // Revert on local storage error
      set({ favorites, customOrder });
    }
  },

  isFavorite: (stationId: string) => {
    return get().favorites.some(f => f._id === stationId);
  },

  toggleFavorite: async (station: Station) => {
    const { isFavorite, addFavorite, removeFavorite } = get();
    
    console.log('[FavoritesStore] toggleFavorite called for:', station._id, station.name);
    console.log('[FavoritesStore] isFavorite:', isFavorite(station._id));
    
    if (isFavorite(station._id)) {
      console.log('[FavoritesStore] Removing favorite...');
      await removeFavorite(station._id);
    } else {
      console.log('[FavoritesStore] Adding favorite...');
      await addFavorite(station);
    }
    console.log('[FavoritesStore] toggleFavorite complete');
  },

  setSortOption: (option: SortOption) => {
    set({ sortOption: option });
  },

  setViewMode: (mode: ViewMode) => {
    set({ viewMode: mode });
  },

  updateCustomOrder: async (orderedIds: string[]) => {
    try {
      await AsyncStorage.setItem(FAVORITES_ORDER_KEY, JSON.stringify(orderedIds));
      set({ customOrder: orderedIds });
    } catch (error) {
      console.error('Error updating custom order:', error);
    }
  },

  getSortedFavorites: () => {
    const { favorites, customOrder, sortOption } = get();
    
    switch (sortOption) {
      case 'newest':
        // Sort by addedAt if available, otherwise keep original order (newest first)
        return [...favorites].sort((a, b) => {
          const dateA = (a as any).addedAt || (a as any).createdAt || '';
          const dateB = (b as any).addedAt || (b as any).createdAt || '';
          if (!dateA && !dateB) return 0; // Keep original order
          if (!dateA) return 1;
          if (!dateB) return -1;
          return dateB.localeCompare(dateA);
        });
      
      case 'oldest':
        return [...favorites].sort((a, b) => {
          const dateA = (a as any).addedAt || (a as any).createdAt || '';
          const dateB = (b as any).addedAt || (b as any).createdAt || '';
          if (!dateA && !dateB) return 0; // Keep original order
          if (!dateA) return 1;
          if (!dateB) return -1;
          return dateA.localeCompare(dateB);
        });
      
      case 'az':
        return [...favorites].sort((a, b) => 
          (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())
        );
      
      case 'za':
        return [...favorites].sort((a, b) => 
          (b.name || '').toLowerCase().localeCompare((a.name || '').toLowerCase())
        );
      
      case 'custom':
        return [...favorites].sort((a, b) => {
          const indexA = customOrder.indexOf(a._id);
          const indexB = customOrder.indexOf(b._id);
          
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          
          return indexA - indexB;
        });
      
      default:
        return favorites;
    }
  },

  // Sync local favorites with server (for when user logs in)
  syncWithServer: async () => {
    if (!isAuthenticated()) return;
    
    const { favorites } = get();
    
    try {
      // Get server favorites
      const serverResponse = await userService.getFavorites();
      const serverFavorites = serverResponse.favorites || [];
      
      // Merge: server + local (server takes priority for duplicates)
      const serverIds = new Set(serverFavorites.map(f => f._id));
      const localOnly = favorites.filter(f => !serverIds.has(f._id));
      
      // Add local-only favorites to server
      for (const station of localOnly) {
        try {
          await userService.addFavorite(station._id);
        } catch (e) {
          // Ignore errors for individual stations
        }
      }
      
      // Reload to get merged list
      await get().loadFavorites();
    } catch (error) {
      console.error('Error syncing favorites:', error);
    }
  },
}));

export default useFavoritesStore;

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userService } from '../services/userService';
import { useAuthStore } from './authStore';
import type { Station } from '../types';

const FAVORITES_KEY = '@megaradio_favorites';
const FAVORITES_ORDER_KEY = '@megaradio_favorites_order';

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
      
      console.log('[FavoritesStore] loadFavorites called');
      console.log('[FavoritesStore] isAuthenticated:', authStatus);
      console.log('[FavoritesStore] user:', user?._id);
      console.log('[FavoritesStore] token exists:', !!token);
      console.log('[FavoritesStore] token prefix:', token?.substring(0, 10));
      
      if (authStatus && user?._id && token) {
        // Use authenticated endpoint GET /api/user/favorites (requires token)
        try {
          const headers: Record<string, string> = {
            'X-API-Key': 'mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw',
            'Authorization': `Bearer ${token}`,
          };
          
          console.log('[FavoritesStore] Fetching favorites with token...');
          
          const response = await fetch('https://themegaradio.com/api/user/favorites', {
            headers,
          });
          
          console.log('[FavoritesStore] Response status:', response.status);
          
          if (response.ok) {
            const favorites = await response.json();
            console.log('[FavoritesStore] Favorites loaded:', Array.isArray(favorites) ? favorites.length : 0);
            
            // Also load custom order from local storage
            const orderJson = await AsyncStorage.getItem(FAVORITES_ORDER_KEY);
            const customOrder = orderJson ? JSON.parse(orderJson) : [];
            
            set({ favorites: Array.isArray(favorites) ? favorites : [], customOrder, isLoaded: true, isLoading: false });
            return;
          } else {
            console.log('[FavoritesStore] Response not OK:', response.status, await response.text());
          }
        } catch (apiError: any) {
          console.log('[FavoritesStore] API favorites failed:', apiError.message);
        }
      } else {
        console.log('[FavoritesStore] Not authenticated or missing token, using local storage');
      }
      
      // Fallback to local storage for guests or API failure
      await get().loadFromLocal();
    } catch (error) {
      console.error('Error loading favorites:', error);
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
    } catch (error) {
      console.error('Error loading from local storage:', error);
      set({ isLoaded: true, isLoading: false });
    }
  },

  addFavorite: async (station: Station) => {
    const { favorites, customOrder } = get();
    
    // Check if already exists
    if (favorites.some(f => f._id === station._id)) {
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
      if (isAuthenticated()) {
        // Add to server
        await userService.addFavorite(station._id);
      }
      
      // Always save to local storage as backup
      await Promise.all([
        AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites)),
        AsyncStorage.setItem(FAVORITES_ORDER_KEY, JSON.stringify(updatedOrder)),
      ]);
    } catch (error) {
      console.error('Error adding favorite:', error);
      // Revert on error
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
      if (isAuthenticated()) {
        // Remove from server
        await userService.removeFavorite(stationId);
      }
      
      // Always update local storage
      await Promise.all([
        AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites)),
        AsyncStorage.setItem(FAVORITES_ORDER_KEY, JSON.stringify(updatedOrder)),
      ]);
    } catch (error) {
      console.error('Error removing favorite:', error);
      // Revert on error
      set({ favorites, customOrder });
    }
  },

  isFavorite: (stationId: string) => {
    return get().favorites.some(f => f._id === stationId);
  },

  toggleFavorite: async (station: Station) => {
    const { isFavorite, addFavorite, removeFavorite } = get();
    
    if (isFavorite(station._id)) {
      await removeFavorite(station._id);
    } else {
      await addFavorite(station);
    }
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
        return [...favorites].sort((a, b) => {
          const dateA = (a as any).addedAt || '';
          const dateB = (b as any).addedAt || '';
          return dateB.localeCompare(dateA);
        });
      
      case 'oldest':
        return [...favorites].sort((a, b) => {
          const dateA = (a as any).addedAt || '';
          const dateB = (b as any).addedAt || '';
          return dateA.localeCompare(dateB);
        });
      
      case 'az':
        return [...favorites].sort((a, b) => 
          (a.name || '').localeCompare(b.name || '')
        );
      
      case 'za':
        return [...favorites].sort((a, b) => 
          (b.name || '').localeCompare(a.name || '')
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

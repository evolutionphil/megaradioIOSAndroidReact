import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Station } from '../types';

const FAVORITES_KEY = '@megaradio_favorites';
const FAVORITES_ORDER_KEY = '@megaradio_favorites_order';

export type SortOption = 'newest' | 'oldest' | 'az' | 'za' | 'custom';
export type ViewMode = 'list' | 'grid';

interface FavoritesState {
  favorites: Station[];
  customOrder: string[]; // Array of station IDs for custom ordering
  sortOption: SortOption;
  viewMode: ViewMode;
  isLoaded: boolean;
  
  // Actions
  loadFavorites: () => Promise<void>;
  addFavorite: (station: Station) => Promise<void>;
  removeFavorite: (stationId: string) => Promise<void>;
  isFavorite: (stationId: string) => boolean;
  toggleFavorite: (station: Station) => Promise<void>;
  setSortOption: (option: SortOption) => void;
  setViewMode: (mode: ViewMode) => void;
  updateCustomOrder: (orderedIds: string[]) => Promise<void>;
  getSortedFavorites: () => Station[];
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  customOrder: [],
  sortOption: 'newest',
  viewMode: 'list',
  isLoaded: false,

  loadFavorites: async () => {
    try {
      const [favoritesJson, orderJson] = await Promise.all([
        AsyncStorage.getItem(FAVORITES_KEY),
        AsyncStorage.getItem(FAVORITES_ORDER_KEY),
      ]);
      
      const favorites = favoritesJson ? JSON.parse(favoritesJson) : [];
      const customOrder = orderJson ? JSON.parse(orderJson) : [];
      
      set({ favorites, customOrder, isLoaded: true });
    } catch (error) {
      console.error('Error loading favorites:', error);
      set({ isLoaded: true });
    }
  },

  addFavorite: async (station: Station) => {
    const { favorites, customOrder } = get();
    
    // Check if already exists
    if (favorites.some(f => f._id === station._id)) {
      return;
    }

    const updatedFavorites = [
      { ...station, addedAt: new Date().toISOString() },
      ...favorites,
    ];
    const updatedOrder = [station._id, ...customOrder];

    try {
      await Promise.all([
        AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites)),
        AsyncStorage.setItem(FAVORITES_ORDER_KEY, JSON.stringify(updatedOrder)),
      ]);
      set({ favorites: updatedFavorites, customOrder: updatedOrder });
    } catch (error) {
      console.error('Error adding favorite:', error);
    }
  },

  removeFavorite: async (stationId: string) => {
    const { favorites, customOrder } = get();
    
    const updatedFavorites = favorites.filter(f => f._id !== stationId);
    const updatedOrder = customOrder.filter(id => id !== stationId);

    try {
      await Promise.all([
        AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites)),
        AsyncStorage.setItem(FAVORITES_ORDER_KEY, JSON.stringify(updatedOrder)),
      ]);
      set({ favorites: updatedFavorites, customOrder: updatedOrder });
    } catch (error) {
      console.error('Error removing favorite:', error);
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
        // Sort by custom order
        return [...favorites].sort((a, b) => {
          const indexA = customOrder.indexOf(a._id);
          const indexB = customOrder.indexOf(b._id);
          
          // Items not in customOrder go to the end
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          
          return indexA - indexB;
        });
      
      default:
        return favorites;
    }
  },
}));

export default useFavoritesStore;

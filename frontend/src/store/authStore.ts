import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { User } from '../types';

const TOKEN_KEY = 'megaradio_auth_token';
const USER_KEY = 'megaradio_user_data';

interface AuthState {
  // User data
  user: User | null;
  
  // Authentication token (mobile)
  token: string | null;
  
  // Authentication status
  isAuthenticated: boolean;
  
  // Auth loaded from storage flag
  isAuthLoaded: boolean;
  
  // Loading state
  isLoading: boolean;
  
  // Error message
  error: string | null;
  
  // Device info
  deviceInfo: {
    deviceType: 'mobile' | 'tablet' | 'tv';
    deviceName: string;
  };
  
  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Auth operations
  loadStoredAuth: () => Promise<void>;
  saveAuth: (user: User, token: string) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  clearAuth: () => void;
}

// Secure storage helpers (cross-platform)
const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      // Web fallback - use localStorage
      return localStorage.getItem(key);
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('SecureStore setItem error:', error);
    }
  },
  
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('SecureStore removeItem error:', error);
    }
  },
};

const getDeviceInfo = () => {
  // Basic device detection
  let deviceType: 'mobile' | 'tablet' | 'tv' = 'mobile';
  let deviceName = 'Unknown Device';
  
  if (Platform.OS === 'ios') {
    deviceName = 'iPhone';
    deviceType = 'mobile';
  } else if (Platform.OS === 'android') {
    deviceName = 'Android Device';
    deviceType = 'mobile';
  } else if (Platform.OS === 'web') {
    // Safe check for navigator (SSR compatibility)
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    deviceName = userAgent.includes('Mobile') ? 'Mobile Browser' : 'Desktop Browser';
    deviceType = userAgent.includes('Mobile') ? 'mobile' : 'tablet';
  }
  
  return { deviceType, deviceName };
};

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isAuthLoaded: false,  // Track if auth was loaded from storage
  isLoading: true,
  error: null,
  deviceInfo: getDeviceInfo(),
};

export const useAuthStore = create<AuthState>((set, get) => ({
  ...initialState,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: user !== null,
      error: null,
    }),

  setToken: (token) =>
    set({ token }),

  setAuthenticated: (isAuthenticated) =>
    set({ isAuthenticated }),

  setLoading: (isLoading) =>
    set({ isLoading }),

  setError: (error) =>
    set({ error }),

  // Load stored auth on app startup
  loadStoredAuth: async () => {
    set({ isLoading: true });
    
    try {
      const [storedToken, storedUser] = await Promise.all([
        secureStorage.getItem(TOKEN_KEY),
        secureStorage.getItem(USER_KEY),
      ]);
      
      if (storedToken && storedUser) {
        const user = JSON.parse(storedUser) as User;
        set({
          token: storedToken,
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      set({ isLoading: false });
    }
  },

  // Save auth after successful login
  saveAuth: async (user: User, token: string) => {
    try {
      await Promise.all([
        secureStorage.setItem(TOKEN_KEY, token),
        secureStorage.setItem(USER_KEY, JSON.stringify(user)),
      ]);
      
      set({
        user,
        token,
        isAuthenticated: true,
        error: null,
      });
      
      // Load favorites from server after login
      // Import dynamically to avoid circular dependency
      const { useFavoritesStore } = await import('./favoritesStore');
      
      // First load favorites from server
      console.log('[AuthStore] Login successful, loading favorites from server...');
      setTimeout(async () => {
        try {
          await useFavoritesStore.getState().loadFavorites();
          console.log('[AuthStore] Favorites loaded after login');
        } catch (error) {
          console.error('[AuthStore] Failed to load favorites:', error);
        }
      }, 300);
    } catch (error) {
      console.error('Error saving auth:', error);
    }
  },

  // Update user data (e.g., after avatar upload)
  updateUser: async (user: User) => {
    try {
      await secureStorage.setItem(USER_KEY, JSON.stringify(user));
      set({ user });
    } catch (error) {
      console.error('Error updating user:', error);
    }
  },

  // Logout - clear everything
  logout: async () => {
    try {
      await Promise.all([
        secureStorage.removeItem(TOKEN_KEY),
        secureStorage.removeItem(USER_KEY),
      ]);
      
      // Clear guest favorites on logout to ensure clean state for new users
      // Import dynamically to avoid circular dependency
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      await Promise.all([
        AsyncStorage.default.removeItem('@megaradio_favorites'),
        AsyncStorage.default.removeItem('@megaradio_favorites_order'),
      ]);
      
      // Reset favorites store
      const { useFavoritesStore } = await import('./favoritesStore');
      useFavoritesStore.setState({ favorites: [], customOrder: [], isLoaded: false });
    } catch (error) {
      console.error('Error clearing auth storage:', error);
    }
    
    set({
      ...initialState,
      isLoading: false,
      deviceInfo: get().deviceInfo,
    });
  },

  // Clear auth state (without storage)
  clearAuth: () => {
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },
}));

export default useAuthStore;

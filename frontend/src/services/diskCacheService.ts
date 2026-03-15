// Disk Cache Service using MMKV
// Ultra-fast key-value storage (30x faster than AsyncStorage)
// Used for persisting API data between app launches

import { Platform } from 'react-native';

// Web fallback: use in-memory Map when MMKV isn't available (web preview)
let cacheStorage: any;

if (Platform.OS === 'web') {
  const memStore = new Map<string, string>();
  cacheStorage = {
    set: (key: string, value: string) => memStore.set(key, value),
    getString: (key: string) => memStore.get(key) || null,
    delete: (key: string) => memStore.delete(key),
    getAllKeys: () => Array.from(memStore.keys()),
    clearAll: () => memStore.clear(),
  };
} else {
  const { MMKV } = require('react-native-mmkv');
  cacheStorage = new MMKV({ id: 'megaradio-cache' });
}

// Cache TTL Constants
export const CACHE_TTL = {
  STATIONS_BY_COUNTRY: 7 * 24 * 60 * 60 * 1000,   // 7 days - station lists rarely change
  GENRES: 7 * 24 * 60 * 60 * 1000,                  // 7 days - genres rarely change
  GENRE_STATIONS: 7 * 24 * 60 * 60 * 1000,          // 7 days - genre station mappings
  POPULAR_STATIONS: 1 * 60 * 60 * 1000,              // 1 hour - popularity changes
  COMMUNITY_FAVORITES: 30 * 60 * 1000,               // 30 min - community activity
  USER_PROFILE: 30 * 60 * 1000,                      // 30 min
  PRECOMPUTED_GENRES: 7 * 24 * 60 * 60 * 1000,       // 7 days
  SEARCH: 0,                                          // Never cache search - always fresh
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: number;
}

const CACHE_VERSION = 1;

export const diskCache = {
  /**
   * Set data in disk cache with TTL
   */
  set<T>(key: string, data: T): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        version: CACHE_VERSION,
      };
      cacheStorage.set(key, JSON.stringify(entry));
    } catch (e) {
      console.warn('[DiskCache] Set error:', key, e);
    }
  },

  /**
   * Get data from disk cache if not expired
   */
  get<T>(key: string, ttl: number): T | null {
    try {
      const raw = cacheStorage.getString(key);
      if (!raw) return null;

      const entry: CacheEntry<T> = JSON.parse(raw);

      // Version check - invalidate old cache format
      if (entry.version !== CACHE_VERSION) {
        cacheStorage.delete(key);
        return null;
      }

      // TTL check
      if (ttl > 0 && Date.now() - entry.timestamp > ttl) {
        return null; // Expired - but don't delete, might be used as stale fallback
      }

      return entry.data;
    } catch (e) {
      console.warn('[DiskCache] Get error:', key, e);
      return null;
    }
  },

  /**
   * Get stale data (ignoring TTL) - used as fallback when API fails
   */
  getStale<T>(key: string): T | null {
    try {
      const raw = cacheStorage.getString(key);
      if (!raw) return null;
      const entry: CacheEntry<T> = JSON.parse(raw);
      if (entry.version !== CACHE_VERSION) return null;
      return entry.data;
    } catch (e) {
      return null;
    }
  },

  /**
   * Check if cache entry exists and is fresh
   */
  isFresh(key: string, ttl: number): boolean {
    try {
      const raw = cacheStorage.getString(key);
      if (!raw) return false;
      const entry = JSON.parse(raw);
      if (entry.version !== CACHE_VERSION) return false;
      return Date.now() - entry.timestamp <= ttl;
    } catch {
      return false;
    }
  },

  /**
   * Delete specific cache entry
   */
  delete(key: string): void {
    try {
      cacheStorage.delete(key);
    } catch (e) {
      console.warn('[DiskCache] Delete error:', key, e);
    }
  },

  /**
   * Invalidate all cache entries matching a prefix
   */
  invalidatePrefix(prefix: string): void {
    try {
      const allKeys = cacheStorage.getAllKeys();
      for (const key of allKeys) {
        if (key.startsWith(prefix)) {
          cacheStorage.delete(key);
        }
      }
    } catch (e) {
      console.warn('[DiskCache] InvalidatePrefix error:', prefix, e);
    }
  },

  /**
   * Clear all cache
   */
  clearAll(): void {
    try {
      cacheStorage.clearAll();
      console.log('[DiskCache] All cache cleared');
    } catch (e) {
      console.warn('[DiskCache] ClearAll error:', e);
    }
  },

  /**
   * Get cache stats (for debugging)
   */
  getStats(): { totalKeys: number; sizeEstimate: string } {
    const allKeys = cacheStorage.getAllKeys();
    let totalSize = 0;
    for (const key of allKeys) {
      const val = cacheStorage.getString(key);
      if (val) totalSize += val.length;
    }
    return {
      totalKeys: allKeys.length,
      sizeEstimate: `${(totalSize / 1024).toFixed(1)}KB`,
    };
  },
};

// Cache key generators
export const cacheKeys = {
  popularStations: (country: string) => `popular:${country}`,
  stationsByCountry: (country: string, page: number) => `stations:${country}:p${page}`,
  genres: (country: string) => `genres:${country}`,
  precomputedGenres: (country: string) => `precomputed_genres:${country}`,
  genreStations: (genre: string, country: string, page: number) => `genre_stations:${genre}:${country}:p${page}`,
  communityFavorites: (country: string) => `community_favs:${country}`,
  userProfile: (userId: string) => `user_profile:${userId}`,
  allStations: (country: string, page: number) => `all_stations:${country}:p${page}`,
};

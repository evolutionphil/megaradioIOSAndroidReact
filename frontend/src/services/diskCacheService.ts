// Disk Cache Service using MMKV (Native only)
// Ultra-fast key-value storage (30x faster than AsyncStorage)
// Used for persisting API data between app launches

import { MMKV } from 'react-native-mmkv';

// Separate MMKV instances for different data types
const cacheStorage = new MMKV({ id: 'megaradio-cache' });

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

  get<T>(key: string, ttl: number): T | null {
    try {
      const raw = cacheStorage.getString(key);
      if (!raw) return null;

      const entry: CacheEntry<T> = JSON.parse(raw);

      if (entry.version !== CACHE_VERSION) {
        cacheStorage.delete(key);
        return null;
      }

      if (ttl > 0 && Date.now() - entry.timestamp > ttl) {
        return null;
      }

      return entry.data;
    } catch (e) {
      console.warn('[DiskCache] Get error:', key, e);
      return null;
    }
  },

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

  delete(key: string): void {
    try {
      cacheStorage.delete(key);
    } catch (e) {
      console.warn('[DiskCache] Delete error:', key, e);
    }
  },

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

  clearAll(): void {
    try {
      cacheStorage.clearAll();
      console.log('[DiskCache] All cache cleared');
    } catch (e) {
      console.warn('[DiskCache] ClearAll error:', e);
    }
  },

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

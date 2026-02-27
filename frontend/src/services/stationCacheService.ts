// Station Cache Service
// Provides offline caching for stations using AsyncStorage
// Implements graceful degradation when API is unavailable

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import type { Station } from '../types';

// Cache keys
const CACHE_KEYS = {
  POPULAR_STATIONS: '@megaradio_cache_popular',
  TOP_100: '@megaradio_cache_top100',
  RECENTLY_PLAYED: '@megaradio_cache_recently_played',
  FAVORITES: '@megaradio_cache_favorites',
  SEARCH_RESULTS: '@megaradio_cache_search',
  GENRES: '@megaradio_cache_genres',
  PRECOMPUTED: '@megaradio_cache_precomputed',
  LAST_SYNC: '@megaradio_cache_last_sync',
};

// Cache expiry times (in milliseconds)
const CACHE_EXPIRY = {
  POPULAR: 30 * 60 * 1000,      // 30 minutes
  TOP_100: 60 * 60 * 1000,      // 1 hour
  RECENTLY_PLAYED: 24 * 60 * 60 * 1000, // 24 hours (local data)
  FAVORITES: 7 * 24 * 60 * 60 * 1000,   // 7 days (local data)
  SEARCH: 15 * 60 * 1000,       // 15 minutes
  GENRES: 60 * 60 * 1000,       // 1 hour
  PRECOMPUTED: 30 * 60 * 1000,  // 30 minutes
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  country?: string;
}

class StationCacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private isOnline: boolean = true;

  constructor() {
    // Monitor network status
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? true;
      console.log('[StationCache] Network status:', this.isOnline ? 'Online' : 'Offline');
    });
  }

  // Check if online
  async checkOnline(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      this.isOnline = state.isConnected ?? true;
      return this.isOnline;
    } catch {
      return this.isOnline;
    }
  }

  // Get cache status
  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  // Generic cache get with expiry check
  private async getCache<T>(key: string, maxAge: number): Promise<T | null> {
    try {
      // Check memory cache first
      const memCached = this.memoryCache.get(key);
      if (memCached && Date.now() - memCached.timestamp < maxAge) {
        console.log(`[StationCache] Memory hit: ${key}`);
        return memCached.data;
      }

      // Check AsyncStorage
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        const entry: CacheEntry<T> = JSON.parse(cached);
        const age = Date.now() - entry.timestamp;
        
        // Return cached data if not expired OR if offline
        if (age < maxAge || !this.isOnline) {
          console.log(`[StationCache] Storage hit: ${key} (age: ${Math.round(age / 1000)}s, offline: ${!this.isOnline})`);
          // Update memory cache
          this.memoryCache.set(key, entry);
          return entry.data;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`[StationCache] Get error for ${key}:`, error);
      return null;
    }
  }

  // Generic cache set
  private async setCache<T>(key: string, data: T, country?: string): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        country,
      };
      
      // Update memory cache
      this.memoryCache.set(key, entry);
      
      // Update AsyncStorage
      await AsyncStorage.setItem(key, JSON.stringify(entry));
      console.log(`[StationCache] Cached: ${key}`);
    } catch (error) {
      console.error(`[StationCache] Set error for ${key}:`, error);
    }
  }

  // ============ Popular Stations ============
  async getPopularStations(country?: string): Promise<Station[] | null> {
    const key = country ? `${CACHE_KEYS.POPULAR_STATIONS}_${country}` : CACHE_KEYS.POPULAR_STATIONS;
    return this.getCache<Station[]>(key, CACHE_EXPIRY.POPULAR);
  }

  async setPopularStations(stations: Station[], country?: string): Promise<void> {
    const key = country ? `${CACHE_KEYS.POPULAR_STATIONS}_${country}` : CACHE_KEYS.POPULAR_STATIONS;
    await this.setCache(key, stations, country);
  }

  // ============ Top 100 ============
  async getTop100(country?: string): Promise<Station[] | null> {
    const key = country ? `${CACHE_KEYS.TOP_100}_${country}` : CACHE_KEYS.TOP_100;
    return this.getCache<Station[]>(key, CACHE_EXPIRY.TOP_100);
  }

  async setTop100(stations: Station[], country?: string): Promise<void> {
    const key = country ? `${CACHE_KEYS.TOP_100}_${country}` : CACHE_KEYS.TOP_100;
    await this.setCache(key, stations, country);
  }

  // ============ Recently Played ============
  async getRecentlyPlayed(): Promise<Station[] | null> {
    return this.getCache<Station[]>(CACHE_KEYS.RECENTLY_PLAYED, CACHE_EXPIRY.RECENTLY_PLAYED);
  }

  async setRecentlyPlayed(stations: Station[]): Promise<void> {
    await this.setCache(CACHE_KEYS.RECENTLY_PLAYED, stations);
  }

  async addToRecentlyPlayed(station: Station): Promise<void> {
    try {
      let recent = await this.getRecentlyPlayed() || [];
      
      // Remove if already exists
      recent = recent.filter(s => s._id !== station._id);
      
      // Add to beginning
      recent.unshift(station);
      
      // Keep only last 50
      recent = recent.slice(0, 50);
      
      await this.setRecentlyPlayed(recent);
    } catch (error) {
      console.error('[StationCache] Error adding to recently played:', error);
    }
  }

  // ============ Favorites (Local) ============
  async getFavorites(): Promise<Station[] | null> {
    return this.getCache<Station[]>(CACHE_KEYS.FAVORITES, CACHE_EXPIRY.FAVORITES);
  }

  async setFavorites(stations: Station[]): Promise<void> {
    await this.setCache(CACHE_KEYS.FAVORITES, stations);
  }

  // ============ Search Results ============
  async getSearchResults(query: string): Promise<Station[] | null> {
    const key = `${CACHE_KEYS.SEARCH_RESULTS}_${query.toLowerCase().trim()}`;
    return this.getCache<Station[]>(key, CACHE_EXPIRY.SEARCH);
  }

  async setSearchResults(query: string, stations: Station[]): Promise<void> {
    const key = `${CACHE_KEYS.SEARCH_RESULTS}_${query.toLowerCase().trim()}`;
    await this.setCache(key, stations);
  }

  // ============ Genres ============
  async getGenres(): Promise<any[] | null> {
    return this.getCache<any[]>(CACHE_KEYS.GENRES, CACHE_EXPIRY.GENRES);
  }

  async setGenres(genres: any[]): Promise<void> {
    await this.setCache(CACHE_KEYS.GENRES, genres);
  }

  // ============ Precomputed Stations ============
  async getPrecomputedStations(country?: string, page: number = 1): Promise<any | null> {
    const key = `${CACHE_KEYS.PRECOMPUTED}_${country || 'all'}_${page}`;
    return this.getCache<any>(key, CACHE_EXPIRY.PRECOMPUTED);
  }

  async setPrecomputedStations(data: any, country?: string, page: number = 1): Promise<void> {
    const key = `${CACHE_KEYS.PRECOMPUTED}_${country || 'all'}_${page}`;
    await this.setCache(key, data, country);
  }

  // ============ Utility Methods ============
  
  // Clear all cache
  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith('@megaradio_cache'));
      await AsyncStorage.multiRemove(cacheKeys);
      this.memoryCache.clear();
      console.log('[StationCache] All cache cleared');
    } catch (error) {
      console.error('[StationCache] Clear error:', error);
    }
  }

  // Get cache size (approximate)
  async getCacheSize(): Promise<{ keys: number; sizeKB: number }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith('@megaradio_cache'));
      
      let totalSize = 0;
      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length * 2; // UTF-16 = 2 bytes per char
        }
      }
      
      return {
        keys: cacheKeys.length,
        sizeKB: Math.round(totalSize / 1024),
      };
    } catch {
      return { keys: 0, sizeKB: 0 };
    }
  }

  // Get last sync time
  async getLastSync(): Promise<Date | null> {
    try {
      const timestamp = await AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC);
      return timestamp ? new Date(parseInt(timestamp, 10)) : null;
    } catch {
      return null;
    }
  }

  // Update last sync time
  async updateLastSync(): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, String(Date.now()));
    } catch {
      // Ignore
    }
  }
}

// Export singleton
export const stationCache = new StationCacheService();
export default stationCache;

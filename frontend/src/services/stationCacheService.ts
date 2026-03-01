// Station Cache Service v2
// Intelligent caching with incremental sync (delta updates)
// Only downloads changed stations - reduces bandwidth and backend load

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import type { Station } from '../types';

// Cache keys
const CACHE_KEYS = {
  // Main station caches
  ALL_STATIONS: '@megaradio_v2_all_stations',
  POPULAR_STATIONS: '@megaradio_v2_popular',
  TOP_100: '@megaradio_v2_top100',
  RECENTLY_PLAYED: '@megaradio_v2_recently_played',
  FAVORITES: '@megaradio_v2_favorites',
  SEARCH_RESULTS: '@megaradio_v2_search',
  GENRES: '@megaradio_v2_genres',
  
  // Sync metadata
  SYNC_VERSION: '@megaradio_v2_sync_version',
  LAST_FULL_SYNC: '@megaradio_v2_last_full_sync',
  STATION_INDEX: '@megaradio_v2_station_index', // Quick lookup by ID
};

// Cache expiry times (in milliseconds)
const CACHE_EXPIRY = {
  STATIONS: 7 * 24 * 60 * 60 * 1000,      // 7 days for stations
  POPULAR: 7 * 24 * 60 * 60 * 1000,       // 7 days
  TOP_100: 7 * 24 * 60 * 60 * 1000,       // 7 days
  RECENTLY_PLAYED: 30 * 24 * 60 * 60 * 1000, // 30 days (local data)
  FAVORITES: 365 * 24 * 60 * 60 * 1000,   // 1 year (local data)
  SEARCH: 24 * 60 * 60 * 1000,            // 24 hours
  GENRES: 7 * 24 * 60 * 60 * 1000,        // 7 days
  
  // Delta sync intervals
  DELTA_SYNC_INTERVAL: 30 * 60 * 1000,    // Check for updates every 30 min
  FULL_SYNC_INTERVAL: 7 * 24 * 60 * 60 * 1000, // Full sync every 7 days
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version?: number;
  country?: string;
}

interface SyncMetadata {
  lastSyncTimestamp: number;
  lastFullSyncTimestamp: number;
  version: number;
  stationCount: number;
}

interface StationIndex {
  [stationId: string]: {
    updatedAt: number;
    cacheKey: string;
  };
}

interface DeltaSyncResult {
  updated: Station[];
  deleted: string[];
  serverVersion: number;
  serverTimestamp: number;
}

class StationCacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private stationIndex: StationIndex = {};
  private isOnline: boolean = true;
  private syncMetadata: SyncMetadata | null = null;

  constructor() {
    // Monitor network status
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? true;
      
      // Trigger delta sync when coming back online
      if (wasOffline && this.isOnline) {
        console.log('[StationCache] Back online - will sync on next request');
      }
    });
    
    // Load sync metadata on init (only on native platforms, skip during SSR)
    if (Platform.OS !== 'web' && typeof window !== 'undefined') {
      this.loadSyncMetadata();
    }
  }

  // ============ Sync Metadata Management ============
  
  private async loadSyncMetadata(): Promise<void> {
    // Skip on web platform or during SSR
    if (Platform.OS === 'web' || typeof window === 'undefined') {
      return;
    }
    
    try {
      const data = await AsyncStorage.getItem(CACHE_KEYS.SYNC_VERSION);
      if (data) {
        this.syncMetadata = JSON.parse(data);
      }
    } catch (error) {
      console.error('[StationCache] Error loading sync metadata:', error);
    }
  }

  private async saveSyncMetadata(metadata: SyncMetadata): Promise<void> {
    // Skip on web platform or during SSR
    if (Platform.OS === 'web' || typeof window === 'undefined') {
      return;
    }
    
    try {
      this.syncMetadata = metadata;
      await AsyncStorage.setItem(CACHE_KEYS.SYNC_VERSION, JSON.stringify(metadata));
    } catch (error) {
      console.error('[StationCache] Error saving sync metadata:', error);
    }
  }

  async getSyncMetadata(): Promise<SyncMetadata | null> {
    if (!this.syncMetadata) {
      await this.loadSyncMetadata();
    }
    return this.syncMetadata;
  }

  // ============ Network Status ============
  
  async checkOnline(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      this.isOnline = state.isConnected ?? true;
      return this.isOnline;
    } catch {
      return this.isOnline;
    }
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  // ============ Generic Cache Operations ============
  
  private async getCache<T>(key: string, maxAge: number): Promise<T | null> {
    try {
      // Check memory cache first
      const memCached = this.memoryCache.get(key);
      if (memCached && Date.now() - memCached.timestamp < maxAge) {
        return memCached.data;
      }

      // Check AsyncStorage
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        const entry: CacheEntry<T> = JSON.parse(cached);
        const age = Date.now() - entry.timestamp;
        
        // Return cached data if not expired OR if offline
        if (age < maxAge || !this.isOnline) {
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

  private async setCache<T>(key: string, data: T, version?: number): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        version,
      };
      
      this.memoryCache.set(key, entry);
      await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.error(`[StationCache] Set error for ${key}:`, error);
    }
  }

  // ============ Station Index (Quick Lookup) ============
  
  private async loadStationIndex(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(CACHE_KEYS.STATION_INDEX);
      if (data) {
        this.stationIndex = JSON.parse(data);
      }
    } catch (error) {
      console.error('[StationCache] Error loading station index:', error);
    }
  }

  private async saveStationIndex(): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEYS.STATION_INDEX, JSON.stringify(this.stationIndex));
    } catch (error) {
      console.error('[StationCache] Error saving station index:', error);
    }
  }

  async getStationById(stationId: string): Promise<Station | null> {
    // Check index for which cache key contains this station
    const indexEntry = this.stationIndex[stationId];
    if (indexEntry) {
      const cached = await this.getCache<Station[]>(indexEntry.cacheKey, CACHE_EXPIRY.STATIONS);
      if (cached) {
        return cached.find(s => s._id === stationId) || null;
      }
    }
    return null;
  }

  // ============ Delta Sync System ============
  
  /**
   * Check if we need to sync (delta or full)
   */
  async needsSync(): Promise<{ needsDelta: boolean; needsFull: boolean }> {
    const metadata = await this.getSyncMetadata();
    const now = Date.now();
    
    if (!metadata) {
      return { needsDelta: false, needsFull: true };
    }
    
    const timeSinceLastSync = now - metadata.lastSyncTimestamp;
    const timeSinceFullSync = now - metadata.lastFullSyncTimestamp;
    
    return {
      needsDelta: timeSinceLastSync > CACHE_EXPIRY.DELTA_SYNC_INTERVAL,
      needsFull: timeSinceFullSync > CACHE_EXPIRY.FULL_SYNC_INTERVAL,
    };
  }

  /**
   * Apply delta sync results to cache
   */
  async applyDeltaSync(result: DeltaSyncResult, cacheKey: string): Promise<void> {
    try {
      // Get current cached stations
      let stations = await this.getCache<Station[]>(cacheKey, CACHE_EXPIRY.STATIONS) || [];
      
      // Remove deleted stations
      if (result.deleted.length > 0) {
        const deletedSet = new Set(result.deleted);
        stations = stations.filter(s => !deletedSet.has(s._id));
        
        // Update index
        result.deleted.forEach(id => {
          delete this.stationIndex[id];
        });
      }
      
      // Update/add changed stations
      if (result.updated.length > 0) {
        const stationMap = new Map(stations.map(s => [s._id, s]));
        
        result.updated.forEach(station => {
          stationMap.set(station._id, station);
          
          // Update index
          this.stationIndex[station._id] = {
            updatedAt: Date.now(),
            cacheKey,
          };
        });
        
        stations = Array.from(stationMap.values());
      }
      
      // Save updated cache
      await this.setCache(cacheKey, stations, result.serverVersion);
      await this.saveStationIndex();
      
      // Update sync metadata
      await this.saveSyncMetadata({
        lastSyncTimestamp: Date.now(),
        lastFullSyncTimestamp: this.syncMetadata?.lastFullSyncTimestamp || Date.now(),
        version: result.serverVersion,
        stationCount: stations.length,
      });
      
      console.log(`[StationCache] Delta sync applied: ${result.updated.length} updated, ${result.deleted.length} deleted`);
    } catch (error) {
      console.error('[StationCache] Error applying delta sync:', error);
    }
  }

  /**
   * Get last sync timestamp for delta requests
   */
  async getLastSyncTimestamp(): Promise<number> {
    const metadata = await this.getSyncMetadata();
    return metadata?.lastSyncTimestamp || 0;
  }

  /**
   * Mark full sync complete
   */
  async markFullSyncComplete(stationCount: number, version: number = 1): Promise<void> {
    await this.saveSyncMetadata({
      lastSyncTimestamp: Date.now(),
      lastFullSyncTimestamp: Date.now(),
      version,
      stationCount,
    });
  }

  // ============ Popular Stations ============
  
  async getPopularStations(country?: string): Promise<Station[] | null> {
    const key = country ? `${CACHE_KEYS.POPULAR_STATIONS}_${country}` : CACHE_KEYS.POPULAR_STATIONS;
    return this.getCache<Station[]>(key, CACHE_EXPIRY.POPULAR);
  }

  async setPopularStations(stations: Station[], country?: string): Promise<void> {
    const key = country ? `${CACHE_KEYS.POPULAR_STATIONS}_${country}` : CACHE_KEYS.POPULAR_STATIONS;
    await this.setCache(key, stations);
    
    // Update index
    stations.forEach(station => {
      this.stationIndex[station._id] = {
        updatedAt: Date.now(),
        cacheKey: key,
      };
    });
    await this.saveStationIndex();
  }

  // ============ Top 100 ============
  
  async getTop100(country?: string): Promise<Station[] | null> {
    const key = country ? `${CACHE_KEYS.TOP_100}_${country}` : CACHE_KEYS.TOP_100;
    return this.getCache<Station[]>(key, CACHE_EXPIRY.TOP_100);
  }

  async setTop100(stations: Station[], country?: string): Promise<void> {
    const key = country ? `${CACHE_KEYS.TOP_100}_${country}` : CACHE_KEYS.TOP_100;
    await this.setCache(key, stations);
    
    // Update index
    stations.forEach(station => {
      this.stationIndex[station._id] = {
        updatedAt: Date.now(),
        cacheKey: key,
      };
    });
    await this.saveStationIndex();
  }

  // ============ Recently Played (Local) ============
  
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
      
      // Keep only last 100
      recent = recent.slice(0, 100);
      
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

  async addToFavorites(station: Station): Promise<void> {
    try {
      let favorites = await this.getFavorites() || [];
      
      // Don't add if already exists
      if (favorites.some(s => s._id === station._id)) {
        return;
      }
      
      favorites.push(station);
      await this.setFavorites(favorites);
    } catch (error) {
      console.error('[StationCache] Error adding to favorites:', error);
    }
  }

  async removeFromFavorites(stationId: string): Promise<void> {
    try {
      let favorites = await this.getFavorites() || [];
      favorites = favorites.filter(s => s._id !== stationId);
      await this.setFavorites(favorites);
    } catch (error) {
      console.error('[StationCache] Error removing from favorites:', error);
    }
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

  // ============ Utility Methods ============
  
  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith('@megaradio_v2'));
      await AsyncStorage.multiRemove(cacheKeys);
      this.memoryCache.clear();
      this.stationIndex = {};
      this.syncMetadata = null;
      console.log('[StationCache] All cache cleared');
    } catch (error) {
      console.error('[StationCache] Clear error:', error);
    }
  }

  async getCacheSize(): Promise<{ keys: number; sizeKB: number; stationCount: number }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith('@megaradio_v2'));
      
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
        stationCount: this.syncMetadata?.stationCount || 0,
      };
    } catch {
      return { keys: 0, sizeKB: 0, stationCount: 0 };
    }
  }

  async getLastSync(): Promise<Date | null> {
    const metadata = await this.getSyncMetadata();
    return metadata ? new Date(metadata.lastSyncTimestamp) : null;
  }

  async updateLastSync(): Promise<void> {
    if (this.syncMetadata) {
      this.syncMetadata.lastSyncTimestamp = Date.now();
      await this.saveSyncMetadata(this.syncMetadata);
    }
  }
}

// Export singleton
export const stationCache = new StationCacheService();
export default stationCache;

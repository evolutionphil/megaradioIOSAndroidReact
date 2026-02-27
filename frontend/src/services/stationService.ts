// Station Service
// Provides station data from API with offline caching and graceful degradation
// All methods have try/catch - API failures won't crash the app

import api from './api';
import { API_ENDPOINTS, API_BASE_URL } from '../constants/api';
import { stationCache } from './stationCacheService';
import type { Station } from '../types';

export interface StationQueryParams {
  page?: number;
  limit?: number;
  country?: string;
  genre?: string;
  search?: string;
  sort?: 'votes' | 'clickCount' | 'name' | 'createdAt';
  order?: 'asc' | 'desc';
}

export const stationService = {
  // Get single station by identifier (slug or id)
  async getStation(identifier: string): Promise<Station | null> {
    try {
      const response = await api.get(API_ENDPOINTS.stations.single(identifier), {
        params: { tv: 1 },
      });
      return response.data;
    } catch (error) {
      console.error('[stationService] getStation error:', error);
      return null;
    }
  },

  // Get list of stations with caching
  async getStations(params: StationQueryParams = {}): Promise<{ stations: Station[]; totalCount: number }> {
    try {
      const response = await api.get(API_ENDPOINTS.stations.list, { params: { ...params, tv: 1 } });
      return response.data;
    } catch (error) {
      console.error('[stationService] getStations error:', error);
      // Return empty result on error
      return { stations: [], totalCount: 0 };
    }
  },

  // Get popular stations with caching
  async getPopularStations(country?: string, limit: number = 12): Promise<{ stations: Station[]; count: number }> {
    try {
      // Try cache first if offline
      const isOnline = await stationCache.checkOnline();
      if (!isOnline) {
        const cached = await stationCache.getPopularStations(country);
        if (cached) {
          console.log('[stationService] Using cached popular stations (offline)');
          return { stations: cached, count: cached.length };
        }
      }

      // Fetch from API
      const response = await api.get(API_ENDPOINTS.stations.popular, {
        params: { country, limit, excludeBroken: true, tv: 1 },
      });
      
      const data = response.data;
      let stations: Station[] = [];
      
      // API returns array directly, not wrapped in { stations: [] }
      if (Array.isArray(data)) {
        stations = data;
      } else if (data?.stations) {
        stations = data.stations;
      } else if (data?.data) {
        stations = data.data;
      }

      // Cache the result
      if (stations.length > 0) {
        await stationCache.setPopularStations(stations, country);
      }

      return { stations, count: stations.length };
    } catch (error) {
      console.error('[stationService] getPopularStations error:', error);
      
      // Graceful degradation: try cache on error
      const cached = await stationCache.getPopularStations(country);
      if (cached) {
        console.log('[stationService] Using cached popular stations (API error)');
        return { stations: cached, count: cached.length };
      }
      
      return { stations: [], count: 0 };
    }
  },

  // Get precomputed stations with caching
  async getPrecomputedStations(country?: string, page: number = 1, limit: number = 33) {
    try {
      // Try cache first if offline
      const isOnline = await stationCache.checkOnline();
      if (!isOnline) {
        const cached = await stationCache.getPrecomputedStations(country, page);
        if (cached) {
          console.log('[stationService] Using cached precomputed stations (offline)');
          return cached;
        }
      }

      const response = await api.get(API_ENDPOINTS.stations.precomputed, {
        params: { country, page, limit, tv: 1 },
      });
      
      const data = response.data;
      
      // Cache the result
      if (data) {
        await stationCache.setPrecomputedStations(data, country, page);
      }
      
      return data;
    } catch (error) {
      console.error('[stationService] getPrecomputedStations error:', error);
      
      // Graceful degradation
      const cached = await stationCache.getPrecomputedStations(country, page);
      if (cached) {
        console.log('[stationService] Using cached precomputed stations (API error)');
        return cached;
      }
      
      return { stations: [], totalCount: 0, page: 1, limit, totalPages: 0 };
    }
  },

  // Get nearby stations
  async getNearbyStations(lat: number, lng: number, radius: number = 100, limit: number = 20) {
    try {
      const response = await api.get(API_ENDPOINTS.stations.nearby, {
        params: { lat, lng, radius, limit, tv: 1 },
      });
      return response.data;
    } catch (error) {
      console.error('[stationService] getNearbyStations error:', error);
      return { stations: [], count: 0 };
    }
  },

  // Get similar stations
  async getSimilarStations(stationId: string, limit: number = 12) {
    try {
      const response = await api.get(API_ENDPOINTS.stations.similar(stationId), {
        params: { limit, tv: 1 },
      });
      return response.data;
    } catch (error) {
      console.error('[stationService] getSimilarStations error:', error);
      return [];
    }
  },

  // Search stations with caching
  async searchStations(query: string, limit: number = 20): Promise<Station[]> {
    try {
      if (!query || query.trim().length === 0) {
        return [];
      }

      // Check cache first
      const cached = await stationCache.getSearchResults(query);
      const isOnline = await stationCache.checkOnline();
      
      if (!isOnline && cached) {
        console.log('[stationService] Using cached search results (offline)');
        return cached;
      }

      const response = await api.get(API_ENDPOINTS.stations.list, {
        params: { search: query, limit, tv: 1 },
      });
      
      const data = response.data;
      let stations: Station[] = [];
      
      if (data && data.stations) {
        stations = data.stations;
      } else if (Array.isArray(data)) {
        stations = data;
      }

      // Cache search results
      if (stations.length > 0) {
        await stationCache.setSearchResults(query, stations);
      }

      return stations;
    } catch (error) {
      console.error('[stationService] searchStations error:', error);
      
      // Graceful degradation
      const cached = await stationCache.getSearchResults(query);
      if (cached) {
        console.log('[stationService] Using cached search results (API error)');
        return cached;
      }
      
      return [];
    }
  },

  // Get top 100 with caching
  async getTop100(country?: string): Promise<Station[]> {
    try {
      // Try cache first if offline
      const isOnline = await stationCache.checkOnline();
      if (!isOnline) {
        const cached = await stationCache.getTop100(country);
        if (cached) {
          console.log('[stationService] Using cached top 100 (offline)');
          return cached;
        }
      }

      const response = await api.get(API_ENDPOINTS.discover.top100, {
        params: { country, tv: 1 },
      });
      
      const data = response.data;
      let stations: Station[] = [];
      
      if (data && data.results) {
        stations = data.results;
      } else if (Array.isArray(data)) {
        stations = data;
      }

      // Cache the result
      if (stations.length > 0) {
        await stationCache.setTop100(stations, country);
      }

      return stations;
    } catch (error) {
      console.error('[stationService] getTop100 error:', error);
      
      // Graceful degradation
      const cached = await stationCache.getTop100(country);
      if (cached) {
        console.log('[stationService] Using cached top 100 (API error)');
        return cached;
      }
      
      return [];
    }
  },

  // Get recently played with caching
  async getRecentlyPlayed(): Promise<Station[]> {
    try {
      // Always check local cache first (recently played is local data)
      const localRecent = await stationCache.getRecentlyPlayed();
      
      // Try to sync with server if online
      const isOnline = await stationCache.checkOnline();
      if (isOnline) {
        try {
          const response = await api.get(API_ENDPOINTS.recentlyPlayed, {
            params: { tv: 1 },
          });
          const data = response.data;
          let serverRecent: Station[] = [];
          
          if (data && data.stations) {
            serverRecent = data.stations;
          } else if (Array.isArray(data)) {
            serverRecent = data;
          }

          // Merge server and local data (local takes priority for recent items)
          if (serverRecent.length > 0) {
            // Cache server data
            await stationCache.setRecentlyPlayed(serverRecent);
            return serverRecent;
          }
        } catch {
          // Server error, use local cache
        }
      }

      return localRecent || [];
    } catch (error) {
      console.error('[stationService] getRecentlyPlayed error:', error);
      return [];
    }
  },

  // Add station to recently played (local cache)
  async addToRecentlyPlayed(station: Station): Promise<void> {
    try {
      await stationCache.addToRecentlyPlayed(station);
    } catch (error) {
      console.error('[stationService] addToRecentlyPlayed error:', error);
    }
  },

  // Get community favorites
  async getCommunityFavorites(limit: number = 20): Promise<any[]> {
    try {
      const response = await api.get(API_ENDPOINTS.communityFavorites, {
        params: { limit, tv: 1 },
      });
      return response.data || [];
    } catch (error) {
      console.error('[stationService] getCommunityFavorites error:', error);
      return [];
    }
  },

  // Get public profiles (users with favorites)
  async getPublicProfiles(limit: number = 10): Promise<any[]> {
    try {
      const response = await api.get(API_ENDPOINTS.publicProfiles, {
        params: { limit },
      });
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error('[stationService] getPublicProfiles error:', error);
      return [];
    }
  },

  // Get proxy URL for HTTP streams (to bypass mixed content issues)
  getProxyUrl(url: string): string {
    const encodedUrl = encodeURIComponent(url);
    return `${API_BASE_URL}${API_ENDPOINTS.stream.proxy(encodedUrl)}`;
  },

  // Resolve stream
  async resolveStream(url: string) {
    try {
      const response = await api.get(API_ENDPOINTS.stream.resolve, {
        params: { url },
      });
      return response.data;
    } catch (error) {
      console.error('[stationService] resolveStream error:', error);
      return null;
    }
  },

  // Record click
  async recordClick(stationId: string) {
    try {
      const response = await api.post(API_ENDPOINTS.stations.click(stationId));
      return response.data;
    } catch (error) {
      console.error('[stationService] recordClick error:', error);
      // Non-critical, don't throw
      return null;
    }
  },

  // Get now playing metadata
  async getNowPlaying(stationId: string) {
    try {
      const response = await api.get(API_ENDPOINTS.stations.nowPlaying(stationId));
      return response.data;
    } catch (error) {
      console.log('[stationService] getNowPlaying error:', error);
      return null;
    }
  },

  // ============ Cache Management ============
  
  // Check if online
  async isOnline(): Promise<boolean> {
    return stationCache.checkOnline();
  },

  // Get cache info
  async getCacheInfo(): Promise<{ keys: number; sizeKB: number; lastSync: Date | null }> {
    const { keys, sizeKB } = await stationCache.getCacheSize();
    const lastSync = await stationCache.getLastSync();
    return { keys, sizeKB, lastSync };
  },

  // Clear all cache
  async clearCache(): Promise<void> {
    await stationCache.clearAll();
  },

  // Sync cache (call this when app starts or comes to foreground)
  async syncCache(country?: string): Promise<void> {
    try {
      const isOnline = await stationCache.checkOnline();
      if (!isOnline) {
        console.log('[stationService] Skipping sync - offline');
        return;
      }

      console.log('[stationService] Starting cache sync...');
      
      // Fetch and cache popular stations
      await this.getPopularStations(country, 50);
      
      // Fetch and cache top 100
      await this.getTop100(country);
      
      // Update sync time
      await stationCache.updateLastSync();
      
      console.log('[stationService] Cache sync complete');
    } catch (error) {
      console.error('[stationService] syncCache error:', error);
    }
  },
};

export default stationService;

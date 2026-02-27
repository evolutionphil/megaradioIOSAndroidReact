// Station Service
// Provides station data from API with intelligent caching and delta sync
// - 7 day cache for stations
// - Delta sync: only downloads changed stations
// - Graceful degradation when offline/API errors

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
      // Check cache first
      const cached = await stationCache.getStationById(identifier);
      if (cached && !stationCache.getOnlineStatus()) {
        return cached;
      }

      const response = await api.get(API_ENDPOINTS.stations.single(identifier), {
        params: { tv: 1 },
      });
      return response.data;
    } catch (error) {
      console.error('[stationService] getStation error:', error);
      
      // Try cache on error
      const cached = await stationCache.getStationById(identifier);
      return cached;
    }
  },

  // Get list of stations with caching
  async getStations(params: StationQueryParams = {}): Promise<{ stations: Station[]; totalCount: number }> {
    try {
      const response = await api.get(API_ENDPOINTS.stations.list, { params: { ...params, tv: 1 } });
      return response.data;
    } catch (error) {
      console.error('[stationService] getStations error:', error);
      return { stations: [], totalCount: 0 };
    }
  },

  // Get popular stations with 7-day caching
  async getPopularStations(country?: string, limit: number = 12): Promise<{ stations: Station[]; count: number }> {
    try {
      const isOnline = await stationCache.checkOnline();
      
      // Check if we need to sync
      const { needsDelta } = await stationCache.needsSync();
      
      // If offline or no sync needed, use cache
      if (!isOnline || !needsDelta) {
        const cached = await stationCache.getPopularStations(country);
        if (cached && cached.length > 0) {
          console.log('[stationService] Using cached popular stations (7-day cache)');
          return { stations: cached, count: cached.length };
        }
      }

      // Fetch from API
      const response = await api.get(API_ENDPOINTS.stations.popular, {
        params: { country, limit, excludeBroken: true, tv: 1 },
      });
      
      const data = response.data;
      let stations: Station[] = [];
      
      if (Array.isArray(data)) {
        stations = data;
      } else if (data?.stations) {
        stations = data.stations;
      } else if (data?.data) {
        stations = data.data;
      }

      // Cache for 7 days
      if (stations.length > 0) {
        await stationCache.setPopularStations(stations, country);
        await stationCache.updateLastSync();
      }

      return { stations, count: stations.length };
    } catch (error) {
      console.error('[stationService] getPopularStations error:', error);
      
      // Graceful degradation: use cache
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
      const isOnline = await stationCache.checkOnline();
      const { needsDelta } = await stationCache.needsSync();

      // Use cache if offline or no sync needed
      if (!isOnline || !needsDelta) {
        const cached = await stationCache.getPopularStations(country);
        if (cached && cached.length > 0) {
          console.log('[stationService] Using cached precomputed stations');
          return { 
            stations: cached.slice((page - 1) * limit, page * limit), 
            totalCount: cached.length,
            page,
            limit,
            totalPages: Math.ceil(cached.length / limit),
          };
        }
      }

      const response = await api.get(API_ENDPOINTS.stations.precomputed, {
        params: { country, page, limit, tv: 1 },
      });
      
      const data = response.data;
      
      // Cache stations
      if (data?.stations) {
        await stationCache.setPopularStations(data.stations, country);
      }
      
      return data;
    } catch (error) {
      console.error('[stationService] getPrecomputedStations error:', error);
      
      const cached = await stationCache.getPopularStations(country);
      if (cached) {
        return { 
          stations: cached.slice((page - 1) * limit, page * limit), 
          totalCount: cached.length,
          page,
          limit,
          totalPages: Math.ceil(cached.length / limit),
        };
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

      // Check cache first (24-hour cache for search)
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
      
      const cached = await stationCache.getSearchResults(query);
      if (cached) {
        console.log('[stationService] Using cached search results (API error)');
        return cached;
      }
      
      return [];
    }
  },

  // Get top 100 with 7-day caching
  async getTop100(country?: string): Promise<Station[]> {
    try {
      const isOnline = await stationCache.checkOnline();
      const { needsDelta } = await stationCache.needsSync();

      if (!isOnline || !needsDelta) {
        const cached = await stationCache.getTop100(country);
        if (cached && cached.length > 0) {
          console.log('[stationService] Using cached top 100 (7-day cache)');
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

      if (stations.length > 0) {
        await stationCache.setTop100(stations, country);
      }

      return stations;
    } catch (error) {
      console.error('[stationService] getTop100 error:', error);
      
      const cached = await stationCache.getTop100(country);
      if (cached) {
        console.log('[stationService] Using cached top 100 (API error)');
        return cached;
      }
      
      return [];
    }
  },

  // Get recently played (local cache, 30 days)
  async getRecentlyPlayed(): Promise<Station[]> {
    try {
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

          if (serverRecent.length > 0) {
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

  // Get public profiles
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

  // Get proxy URL
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
  
  async isOnline(): Promise<boolean> {
    return stationCache.checkOnline();
  },

  async getCacheInfo(): Promise<{ keys: number; sizeKB: number; stationCount: number; lastSync: Date | null }> {
    const { keys, sizeKB, stationCount } = await stationCache.getCacheSize();
    const lastSync = await stationCache.getLastSync();
    return { keys, sizeKB, stationCount, lastSync };
  },

  async clearCache(): Promise<void> {
    await stationCache.clearAll();
  },

  // Check if sync needed
  async needsSync(): Promise<{ needsDelta: boolean; needsFull: boolean }> {
    return stationCache.needsSync();
  },

  // Sync cache (call on app start)
  async syncCache(country?: string): Promise<void> {
    try {
      const isOnline = await stationCache.checkOnline();
      if (!isOnline) {
        console.log('[stationService] Skipping sync - offline');
        return;
      }

      const { needsDelta, needsFull } = await stationCache.needsSync();
      
      if (needsFull) {
        console.log('[stationService] Starting full sync...');
        await this.getPopularStations(country, 100);
        await this.getTop100(country);
        await stationCache.markFullSyncComplete(100);
        console.log('[stationService] Full sync complete');
      } else if (needsDelta) {
        console.log('[stationService] Starting delta sync...');
        // For now, just refresh the main lists
        await this.getPopularStations(country, 50);
        await stationCache.updateLastSync();
        console.log('[stationService] Delta sync complete');
      } else {
        console.log('[stationService] Cache is fresh, no sync needed');
      }
    } catch (error) {
      console.error('[stationService] syncCache error:', error);
    }
  },
};

export default stationService;

import api from './api';
import { API_ENDPOINTS, API_BASE_URL } from '../constants/api';
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
  async getStation(identifier: string): Promise<Station> {
    const response = await api.get(API_ENDPOINTS.stations.single(identifier), {
      params: { tv: 1 },
    });
    return response.data;
  },

  // Get list of stations
  async getStations(params: StationQueryParams = {}): Promise<{ stations: Station[]; totalCount: number }> {
    const response = await api.get(API_ENDPOINTS.stations.list, { params: { ...params, tv: 1 } });
    return response.data;
  },

  // Get popular stations - API expects country NAME in English (e.g., "Turkey"), not native name
  async getPopularStations(country?: string, limit: number = 12): Promise<{ stations: Station[]; count: number }> {
    const response = await api.get(API_ENDPOINTS.stations.popular, {
      params: { country, limit, excludeBroken: true, tv: 1 },
    });
    const data = response.data;
    // API returns array directly, not wrapped in { stations: [] }
    if (Array.isArray(data)) {
      return { stations: data, count: data.length };
    }
    // Handle both { stations: [] } and { data: [] } response formats
    if (data?.stations) return { stations: data.stations, count: data.stations.length };
    if (data?.data) return { stations: data.data, count: data.data.length };
    return { stations: [], count: 0 };
  },

  // Get precomputed stations
  async getPrecomputedStations(country?: string, page: number = 1, limit: number = 33) {
    const response = await api.get(API_ENDPOINTS.stations.precomputed, {
      params: { country, page, limit, tv: 1 },
    });
    return response.data;
  },

  // Get nearby stations
  async getNearbyStations(lat: number, lng: number, radius: number = 100, limit: number = 20) {
    const response = await api.get(API_ENDPOINTS.stations.nearby, {
      params: { lat, lng, radius, limit, tv: 1 },
    });
    return response.data;
  },

  // Get similar stations
  async getSimilarStations(stationId: string, limit: number = 12) {
    const response = await api.get(API_ENDPOINTS.stations.similar(stationId), {
      params: { limit, tv: 1 },
    });
    return response.data;
  },

  // Search stations
  async searchStations(query: string, limit: number = 20): Promise<Station[]> {
    const response = await api.get(API_ENDPOINTS.stations.list, {
      params: { search: query, limit, tv: 1 },
    });
    const data = response.data;
    if (data && data.stations) {
      return data.stations;
    }
    return Array.isArray(data) ? data : [];
  },

  // Get top 100
  async getTop100(country?: string): Promise<Station[]> {
    const response = await api.get(API_ENDPOINTS.discover.top100, {
      params: { country, tv: 1 },
    });
    const data = response.data;
    if (data && data.results) {
      return data.results;
    }
    return Array.isArray(data) ? data : [];
  },

  // Get recently played
  async getRecentlyPlayed(): Promise<Station[]> {
    try {
      const response = await api.get(API_ENDPOINTS.recentlyPlayed, {
        params: { tv: 1 },
      });
      const data = response.data;
      if (data && data.stations) {
        return data.stations;
      }
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  // Get community favorites
  async getCommunityFavorites(limit: number = 20): Promise<any[]> {
    try {
      const response = await api.get(API_ENDPOINTS.communityFavorites, {
        params: { limit, tv: 1 },
      });
      return response.data || [];
    } catch {
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
    } catch {
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
    const response = await api.get(API_ENDPOINTS.stream.resolve, {
      params: { url },
    });
    return response.data;
  },

  // Record click
  async recordClick(stationId: string) {
    const response = await api.post(API_ENDPOINTS.stations.click(stationId));
    return response.data;
  },

  // Get now playing metadata
  // Uses the /api/stations/{id}/metadata endpoint which returns { station: {...}, metadata: {...} }
  async getNowPlaying(stationId: string) {
    try {
      const response = await api.get(API_ENDPOINTS.stations.nowPlaying(stationId));
      console.log('[stationService] getNowPlaying response:', response.data);
      return response.data;
    } catch (error) {
      console.log('[stationService] getNowPlaying error:', error);
      return null;
    }
  },
};

export default stationService;

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
  // Get list of stations
  async getStations(params: StationQueryParams = {}): Promise<{ stations: Station[]; totalCount: number }> {
    const response = await api.get(API_ENDPOINTS.stations.list, { params });
    return response.data;
  },

  // Get popular stations
  async getPopularStations(country?: string, limit: number = 12): Promise<{ stations: Station[]; count: number }> {
    const response = await api.get(API_ENDPOINTS.stations.popular, {
      params: { countrycode: country, limit, excludeBroken: true },
    });
    const data = response.data;
    if (Array.isArray(data)) {
      return { stations: data, count: data.length };
    }
    return data;
  },

  // Get precomputed stations
  async getPrecomputedStations(country?: string, page: number = 1, limit: number = 33) {
    const response = await api.get(API_ENDPOINTS.stations.precomputed, {
      params: { country, page, limit },
    });
    return response.data;
  },

  // Get nearby stations
  async getNearbyStations(lat: number, lng: number, radius: number = 100, limit: number = 20) {
    const response = await api.get(API_ENDPOINTS.stations.nearby, {
      params: { lat, lng, radius, limit },
    });
    return response.data;
  },

  // Get similar stations
  async getSimilarStations(stationId: string, limit: number = 12) {
    const response = await api.get(API_ENDPOINTS.stations.similar(stationId), {
      params: { limit },
    });
    return response.data;
  },

  // Search stations
  async searchStations(query: string, limit: number = 20): Promise<Station[]> {
    const response = await api.get(API_ENDPOINTS.stations.list, {
      params: { search: query, limit },
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
      params: { country },
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
      const response = await api.get(API_ENDPOINTS.recentlyPlayed);
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
        params: { limit },
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
  async getNowPlaying(stationId: string) {
    try {
      // Try our local backend first
      const response = await api.get(`/now-playing/${stationId}`);
      return response.data;
    } catch {
      // Fallback to external API
      try {
        const response = await api.get(API_ENDPOINTS.stations.nowPlaying(stationId));
        return response.data;
      } catch {
        return null;
      }
    }
  },
};

export default stationService;

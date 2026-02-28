// Genre Service
// Provides genre data from API with caching and error handling
// All methods have try/catch - API failures won't crash the app

import api from './api';
import { API_ENDPOINTS } from '../constants/api';
import { stationCache } from './stationCacheService';
import type { Genre, GenreResponse, Station } from '../types';

export const genreService = {
  // Get all genres with error handling
  async getGenres(page: number = 1, limit: number = 50, country?: string, lang?: string): Promise<GenreResponse> {
    try {
      const response = await api.get(API_ENDPOINTS.genres.list, {
        params: { page, limit, country, lang },
      });
      return response.data;
    } catch (error) {
      console.error('[genreService] getGenres error:', error);
      return { genres: [], totalCount: 0, page, limit, totalPages: 0 };
    }
  },

  // Get precomputed genres (faster, cached) with error handling
  async getPrecomputedGenres(country?: string): Promise<{ success: boolean; data: Genre[] }> {
    try {
      // Check cache first
      const cached = await stationCache.getGenres();
      const isOnline = stationCache.getOnlineStatus();
      
      if (!isOnline && cached) {
        console.log('[genreService] Using cached genres (offline)');
        return { success: true, data: cached };
      }

      const response = await api.get(API_ENDPOINTS.genres.precomputed, {
        params: { countrycode: country, tv: 1 },
      });
      
      const data = response.data;
      
      // Cache genres
      if (data?.data && data.data.length > 0) {
        await stationCache.setGenres(data.data);
      }
      
      return data;
    } catch (error) {
      console.error('[genreService] getPrecomputedGenres error:', error);
      
      // Graceful degradation
      const cached = await stationCache.getGenres();
      if (cached) {
        console.log('[genreService] Using cached genres (API error)');
        return { success: true, data: cached };
      }
      
      return { success: false, data: [] };
    }
  },

  // Get discoverable/featured genres with error handling
  async getDiscoverableGenres(): Promise<Genre[]> {
    try {
      // Check cache first
      const cached = await stationCache.getGenres();
      const isOnline = stationCache.getOnlineStatus();
      
      if (!isOnline && cached) {
        console.log('[genreService] Using cached discoverable genres (offline)');
        return cached;
      }

      const response = await api.get(API_ENDPOINTS.genres.discoverable);
      const data = response.data;
      
      // Cache genres
      if (Array.isArray(data) && data.length > 0) {
        await stationCache.setGenres(data);
      }
      
      return data || [];
    } catch (error) {
      console.error('[genreService] getDiscoverableGenres error:', error);
      
      // Graceful degradation
      const cached = await stationCache.getGenres();
      if (cached) {
        console.log('[genreService] Using cached discoverable genres (API error)');
        return cached;
      }
      
      return [];
    }
  },

  // Get genre by slug with error handling
  async getGenreBySlug(slug: string): Promise<Genre | null> {
    try {
      const response = await api.get(API_ENDPOINTS.genres.bySlug(slug));
      return response.data;
    } catch (error) {
      console.error('[genreService] getGenreBySlug error:', error);
      return null;
    }
  },

  // Get stations within a genre with error handling
  async getGenreStations(
    slug: string,
    page: number = 1,
    limit: number = 25,
    country?: string,
    sort?: 'votes' | 'name' | 'createdAt',
    order?: 'asc' | 'desc'
  ): Promise<{ stations: Station[]; pagination: any }> {
    try {
      const response = await api.get(API_ENDPOINTS.genres.stations(slug), {
        params: { page, limit, country, sort, order },
      });
      return response.data;
    } catch (error) {
      console.error('[genreService] getGenreStations error:', error);
      return { 
        stations: [], 
        pagination: { page, limit, total: 0, totalPages: 0 } 
      };
    }
  },
};

export default genreService;

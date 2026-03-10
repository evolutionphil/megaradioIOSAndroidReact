// Genre Service - Direct API calls without local caching
// All data is fetched fresh from API

import api from './api';
import { API_ENDPOINTS } from '../constants/api';
import type { Genre, GenreResponse, Station } from '../types';

export const genreService = {
  // Get all genres - direct API call
  async getGenres(page: number = 1, limit: number = 50, country?: string, lang?: string): Promise<GenreResponse> {
    try {
      console.log('[genreService] getGenres - page:', page, 'country:', country);
      const response = await api.get(API_ENDPOINTS.genres.list, {
        params: { page, limit, country, lang },
      });
      return response.data;
    } catch (error) {
      console.error('[genreService] getGenres error:', error);
      return { genres: [], totalCount: 0, page, limit, totalPages: 0 };
    }
  },

  // Get precomputed genres - direct API call
  async getPrecomputedGenres(country?: string, limit: number = 40): Promise<{ success: boolean; data: Genre[] }> {
    try {
      console.log('[genreService] getPrecomputedGenres - country:', country, 'limit:', limit);
      const response = await api.get(API_ENDPOINTS.genres.precomputed, {
        params: { countrycode: country, tv: 1, limit },
      });
      console.log('[genreService] getPrecomputedGenres result:', response.data?.data?.length || 0, 'genres');
      return response.data;
    } catch (error) {
      console.error('[genreService] getPrecomputedGenres error:', error);
      return { success: false, data: [] };
    }
  },

  // Get discoverable/featured genres - direct API call
  async getDiscoverableGenres(): Promise<Genre[]> {
    try {
      console.log('[genreService] getDiscoverableGenres - fetching from API');
      const response = await api.get(API_ENDPOINTS.genres.discoverable);
      const data = response.data;
      console.log('[genreService] getDiscoverableGenres result:', Array.isArray(data) ? data.length : 0, 'genres');
      return data || [];
    } catch (error) {
      console.error('[genreService] getDiscoverableGenres error:', error);
      return [];
    }
  },

  // Get genre by slug - direct API call
  async getGenreBySlug(slug: string): Promise<Genre | null> {
    try {
      console.log('[genreService] getGenreBySlug - slug:', slug);
      const response = await api.get(API_ENDPOINTS.genres.bySlug(slug));
      return response.data;
    } catch (error) {
      console.error('[genreService] getGenreBySlug error:', error);
      return null;
    }
  },

  // Get stations within a genre - direct API call
  // IMPORTANT: This API requires `countryCode` (ISO code like "TR", "AT"), NOT country name!
  async getGenreStations(
    slug: string,
    page: number = 1,
    limit: number = 25,
    countryCode?: string,
    sort?: 'votes' | 'name' | 'createdAt',
    order?: 'asc' | 'desc'
  ): Promise<{ stations: Station[]; pagination: any }> {
    try {
      console.log('[genreService] getGenreStations - slug:', slug, 'countryCode:', countryCode);
      const response = await api.get(API_ENDPOINTS.genres.stations(slug), {
        // API expects `countryCode` parameter (ISO code), not `country` (name)
        params: { page, limit, countryCode, sort, order },
      });
      console.log('[genreService] getGenreStations result - stations:', response.data?.stations?.length || 0);
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

// Genre Service
// Provides genre data from API with CACHE-FIRST pattern
// All methods have try/catch - API failures won't crash the app
// Pattern: Return cache immediately → Refresh in background

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

  // Get precomputed genres (faster, cached) with CACHE-FIRST pattern
  async getPrecomputedGenres(country?: string, limit: number = 40): Promise<{ success: boolean; data: Genre[] }> {
    // CACHE-FIRST: Check cache immediately for instant data
    const cached = await stationCache.getGenres();
    if (cached && cached.length > 0) {
      console.log('[genreService] CACHE-FIRST: Returning cached genres, count:', cached.length);
      
      // Refresh in background (don't await)
      this.refreshGenresInBackground(country, limit);
      
      return { success: true, data: cached.slice(0, limit) };
    }
    
    // No cache - must fetch from API
    console.log('[genreService] No cache - fetching genres from API');
    return this.fetchPrecomputedGenresFromAPI(country, limit);
  },
  
  // Background refresh for stale-while-revalidate pattern
  async refreshGenresInBackground(country?: string, limit: number = 40): Promise<void> {
    try {
      const isOnline = stationCache.getOnlineStatus();
      if (!isOnline) {
        console.log('[genreService] OFFLINE - skipping background genre refresh');
        return;
      }
      
      console.log('[genreService] Background refresh - fetching genres');
      await this.fetchPrecomputedGenresFromAPI(country, limit);
    } catch (error) {
      console.log('[genreService] Background genre refresh failed (non-blocking):', error);
    }
  },
  
  // Actual API fetch for precomputed genres
  async fetchPrecomputedGenresFromAPI(country?: string, limit: number = 40): Promise<{ success: boolean; data: Genre[] }> {
    try {
      const response = await api.get(API_ENDPOINTS.genres.precomputed, {
        params: { countrycode: country, tv: 1, limit },
      });
      
      const data = response.data;
      
      // Cache genres
      if (data?.data && data.data.length > 0) {
        await stationCache.setGenres(data.data);
        console.log('[genreService] Cached', data.data.length, 'genres');
      }
      
      return data;
    } catch (error) {
      console.error('[genreService] fetchPrecomputedGenresFromAPI error:', error);
      
      // Graceful degradation
      const cached = await stationCache.getGenres();
      if (cached && cached.length > 0) {
        console.log('[genreService] Using cached genres (API error)');
        return { success: true, data: cached.slice(0, limit) };
      }
      
      return { success: false, data: [] };
    }
  },

  // Get discoverable/featured genres with CACHE-FIRST pattern
  async getDiscoverableGenres(): Promise<Genre[]> {
    // CACHE-FIRST: Check cache immediately for instant data
    const cached = await stationCache.getGenres();
    if (cached && cached.length > 0) {
      console.log('[genreService] CACHE-FIRST: Returning cached discoverable genres, count:', cached.length);
      
      // Refresh in background (don't await)
      this.refreshDiscoverableGenresInBackground();
      
      return cached;
    }
    
    // No cache - must fetch from API
    console.log('[genreService] No cache - fetching discoverable genres from API');
    return this.fetchDiscoverableGenresFromAPI();
  },
  
  // Background refresh for discoverable genres
  async refreshDiscoverableGenresInBackground(): Promise<void> {
    try {
      const isOnline = stationCache.getOnlineStatus();
      if (!isOnline) {
        console.log('[genreService] OFFLINE - skipping background discoverable refresh');
        return;
      }
      
      console.log('[genreService] Background refresh - fetching discoverable genres');
      await this.fetchDiscoverableGenresFromAPI();
    } catch (error) {
      console.log('[genreService] Background discoverable refresh failed (non-blocking):', error);
    }
  },
  
  // Actual API fetch for discoverable genres
  async fetchDiscoverableGenresFromAPI(): Promise<Genre[]> {
    try {
      const response = await api.get(API_ENDPOINTS.genres.discoverable);
      const data = response.data;
      
      // Cache genres
      if (Array.isArray(data) && data.length > 0) {
        await stationCache.setGenres(data);
        console.log('[genreService] Cached', data.length, 'discoverable genres');
      }
      
      return data || [];
    } catch (error) {
      console.error('[genreService] fetchDiscoverableGenresFromAPI error:', error);
      
      // Graceful degradation
      const cached = await stationCache.getGenres();
      if (cached && cached.length > 0) {
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

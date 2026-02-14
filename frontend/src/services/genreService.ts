import api from './api';
import { API_ENDPOINTS } from '../constants/api';
import type { Genre, GenreResponse, Station } from '../types';

export const genreService = {
  // Get all genres
  async getGenres(page: number = 1, limit: number = 50): Promise<GenreResponse> {
    const response = await api.get(API_ENDPOINTS.genres.list, {
      params: { page, limit },
    });
    return response.data;
  },

  // Get precomputed genres (faster, cached)
  async getPrecomputedGenres(country?: string): Promise<{ success: boolean; data: Genre[] }> {
    const response = await api.get(API_ENDPOINTS.genres.precomputed, {
      params: { countrycode: country, tv: 1 },
    });
    return response.data;
  },

  // Get discoverable/featured genres
  async getDiscoverableGenres(): Promise<Genre[]> {
    const response = await api.get(API_ENDPOINTS.genres.discoverable);
    return response.data;
  },

  // Get genre by slug
  async getGenreBySlug(slug: string): Promise<Genre> {
    const response = await api.get(API_ENDPOINTS.genres.bySlug(slug));
    return response.data;
  },

  // Get stations within a genre
  async getGenreStations(
    slug: string,
    page: number = 1,
    limit: number = 25,
    country?: string,
    sort?: 'votes' | 'name' | 'createdAt',
    order?: 'asc' | 'desc'
  ): Promise<{ stations: Station[]; pagination: any }> {
    const response = await api.get(API_ENDPOINTS.genres.stations(slug), {
      params: { page, limit, country, sort, order },
    });
    return response.data;
  },
};

export default genreService;

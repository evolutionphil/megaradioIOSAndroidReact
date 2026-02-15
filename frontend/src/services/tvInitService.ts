// TV Init Service - Fetches all essential data in one request
// Endpoint: GET /api/tv/init?country=TR&lang=tr
// Returns: countries, genres, translations, popularStations

import api from './api';
import { QueryClient } from '@tanstack/react-query';
import i18n from './i18nService';

export interface TvInitGenre {
  name: string;
  slug: string;
  stationCount: number;
}

export interface TvInitStation {
  _id: string;
  name: string;
  slug: string;
  favicon?: string;
  url: string;
  url_resolved?: string;
  country?: string;
  tags?: string;
  votes?: number;
}

export interface TvInitResponse {
  countries: string[];           // 219 countries
  genres: TvInitGenre[];         // 13 genres (slim)
  translations: Record<string, string>;  // 724 translation keys
  popularStations: TvInitStation[];      // 21 popular stations (slim format)
  responseTime: number;
  cacheAge: number;
}

// In-memory cache for init data
let cachedInitData: TvInitResponse | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours (matches server cache)

/**
 * Fetch all initial app data in one request
 * @param country - Country name or ISO code (Turkey, TR, Germany, DE)
 * @param lang - Language code (tr, en, de, ar)
 */
export const fetchTvInit = async (
  country?: string,
  lang?: string
): Promise<TvInitResponse> => {
  // Return cached data if still fresh
  const now = Date.now();
  if (cachedInitData && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('[TvInit] Returning cached data');
    return cachedInitData;
  }

  console.log('[TvInit] Fetching init data...', { country, lang });
  
  try {
    // Note: This endpoint is already optimized, no need for tv=1 param
    const response = await api.get<TvInitResponse>('/api/tv/init', {
      params: {
        country: country || undefined,
        lang: lang || 'tr',
      },
    });

    cachedInitData = response.data;
    cacheTimestamp = now;

    console.log('[TvInit] Data fetched successfully:', {
      countries: response.data.countries?.length || 0,
      genres: response.data.genres?.length || 0,
      translations: Object.keys(response.data.translations || {}).length,
      popularStations: response.data.popularStations?.length || 0,
      responseTime: response.data.responseTime,
    });

    return response.data;
  } catch (error) {
    console.error('[TvInit] Error fetching init data:', error);
    throw error;
  }
};

/**
 * Initialize app with TV init data
 * - Loads translations into i18n
 * - Caches genres and popular stations in React Query
 * - Returns countries list for picker
 */
export const initializeApp = async (
  queryClient: QueryClient,
  country?: string,
  lang?: string
): Promise<TvInitResponse | null> => {
  try {
    const data = await fetchTvInit(country, lang);

    // 1. Load translations into i18n
    if (data.translations && Object.keys(data.translations).length > 0) {
      const currentLang = lang || i18n.language || 'tr';
      
      // Add translations as a resource bundle
      i18n.addResourceBundle(currentLang, 'translation', data.translations, true, true);
      console.log('[TvInit] Loaded', Object.keys(data.translations).length, 'translations for', currentLang);
    }

    // 2. Cache genres in React Query
    if (data.genres && data.genres.length > 0) {
      queryClient.setQueryData(['discoverableGenres'], data.genres);
      queryClient.setQueryData(['precomputedGenres'], data.genres);
      console.log('[TvInit] Cached', data.genres.length, 'genres');
    }

    // 3. Cache popular stations in React Query
    if (data.popularStations && data.popularStations.length > 0) {
      // Cache with country key for consistency with existing queries
      queryClient.setQueryData(['popularStations', country || 'global', 8], data.popularStations.slice(0, 8));
      queryClient.setQueryData(['popularStations', country || 'global', 21], data.popularStations);
      console.log('[TvInit] Cached', data.popularStations.length, 'popular stations');
    }

    // 4. Cache countries list
    if (data.countries && data.countries.length > 0) {
      queryClient.setQueryData(['countries'], data.countries);
      console.log('[TvInit] Cached', data.countries.length, 'countries');
    }

    return data;
  } catch (error) {
    console.error('[TvInit] Failed to initialize app:', error);
    return null;
  }
};

/**
 * Get cached init data (if available)
 */
export const getCachedInitData = (): TvInitResponse | null => {
  const now = Date.now();
  if (cachedInitData && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedInitData;
  }
  return null;
};

/**
 * Clear cached init data
 */
export const clearInitCache = (): void => {
  cachedInitData = null;
  cacheTimestamp = 0;
};

/**
 * Get popular stations from cache (instant, no API call)
 */
export const getCachedPopularStations = (limit?: number): TvInitStation[] => {
  if (!cachedInitData?.popularStations) return [];
  if (limit) {
    return cachedInitData.popularStations.slice(0, limit);
  }
  return cachedInitData.popularStations;
};

/**
 * Get genres from cache (instant, no API call)
 */
export const getCachedGenres = (): TvInitGenre[] => {
  return cachedInitData?.genres || [];
};

/**
 * Get countries from cache (instant, no API call)
 */
export const getCachedCountries = (): string[] => {
  return cachedInitData?.countries || [];
};

export default {
  fetchTvInit,
  initializeApp,
  getCachedInitData,
  clearInitCache,
  getCachedPopularStations,
  getCachedGenres,
  getCachedCountries,
};

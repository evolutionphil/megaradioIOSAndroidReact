// TV Init Service - Fetches all essential data in one request
// Endpoint: GET /api/tv/init?country=TR&lang=tr
// Returns: countries, genres, translations, popularStations
// 
// Implements stale-while-revalidate pattern with AsyncStorage for instant app startup

import api from './api';
import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from './i18nService';

// AsyncStorage keys
const TV_INIT_CACHE_KEY = '@megaradio_tv_init_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export interface TvInitGenre {
  _id: string;
  name: string;
  slug: string;
  stationCount: number;
  posterImage?: string;
  discoverableImage?: string;
}

export interface TvInitStation {
  _id: string;
  name: string;
  slug: string;
  favicon?: string;
  logo?: string;
  url: string;
  urlResolved?: string;
  url_resolved?: string;
  country?: string;
  countrycode?: string;
  state?: string;
  tags?: string;
  votes?: number;
  clickCount?: number;
  codec?: string;
  bitrate?: number;
  hls?: boolean;
  language?: string;
  logoAssets?: {
    folder?: string;
    webp96?: string;
  };
}

export interface TvInitResponse {
  countries: string[];           // 219 countries
  genres: TvInitGenre[];         // 13 genres (slim)
  translations: Record<string, string>;  // 724 translation keys
  popularStations: TvInitStation[];      // 21 popular stations (slim format)
  responseTime: number;
  cacheAge: number;
}

interface CachedData {
  data: TvInitResponse;
  timestamp: number;
  country?: string;
  lang?: string;
}

// In-memory cache for init data (fast access)
let cachedInitData: TvInitResponse | null = null;
let cacheTimestamp: number = 0;
let cachedCountry: string | null = null;
let cachedLang: string | null = null;
const CACHE_DURATION = CACHE_TTL;

/**
 * Load cached data from AsyncStorage (persistent)
 */
const loadFromAsyncStorage = async (): Promise<CachedData | null> => {
  try {
    const cached = await AsyncStorage.getItem(TV_INIT_CACHE_KEY);
    if (cached) {
      const parsed: CachedData = JSON.parse(cached);
      return parsed;
    }
  } catch (error) {
    console.log('[TvInit] Error loading from AsyncStorage:', error);
  }
  return null;
};

/**
 * Save data to AsyncStorage (persistent)
 */
const saveToAsyncStorage = async (data: TvInitResponse, country?: string, lang?: string): Promise<void> => {
  try {
    const cacheData: CachedData = {
      data,
      timestamp: Date.now(),
      country,
      lang,
    };
    await AsyncStorage.setItem(TV_INIT_CACHE_KEY, JSON.stringify(cacheData));
    console.log('[TvInit] Saved to AsyncStorage');
  } catch (error) {
    console.log('[TvInit] Error saving to AsyncStorage:', error);
  }
};

/**
 * Fetch data from API and cache it
 */
const fetchAndCache = async (country?: string, lang?: string): Promise<TvInitResponse> => {
  console.log('[TvInit] Fetching from API...', { country, lang });
  
  const response = await api.get<TvInitResponse>('/api/tv/init', {
    params: {
      country: country || undefined,
      lang: lang || 'tr',
    },
  });

  const data = response.data;
  
  // Update in-memory cache
  cachedInitData = data;
  cacheTimestamp = Date.now();
  cachedCountry = country || null;
  cachedLang = lang || null;

  // Save to persistent storage (async, non-blocking)
  saveToAsyncStorage(data, country, lang).catch(() => {});

  console.log('[TvInit] Data fetched successfully:', {
    countries: data.countries?.length || 0,
    genres: data.genres?.length || 0,
    translations: Object.keys(data.translations || {}).length,
    popularStations: data.popularStations?.length || 0,
    responseTime: data.responseTime,
  });

  return data;
};

/**
 * Refresh data in background without blocking UI
 */
const refreshInBackground = (country?: string, lang?: string): void => {
  console.log('[TvInit] Starting background refresh...');
  fetchAndCache(country, lang).catch((error) => {
    console.log('[TvInit] Background refresh failed:', error);
  });
};

/**
 * Fetch all initial app data in one request
 * Implements stale-while-revalidate pattern:
 * 1. Return cached data immediately (if available)
 * 2. Refresh in background if cache is stale
 * 
 * @param country - Country name or ISO code (Turkey, TR, Germany, DE)
 * @param lang - Language code (tr, en, de, ar)
 */
export const fetchTvInit = async (
  country?: string,
  lang?: string
): Promise<TvInitResponse> => {
  const now = Date.now();

  // 1. Check in-memory cache first (fastest)
  if (cachedInitData && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('[TvInit] Returning in-memory cached data');
    return cachedInitData;
  }

  // 2. Check AsyncStorage cache (persistent, survives app restart)
  try {
    const persistedCache = await loadFromAsyncStorage();
    if (persistedCache) {
      const isExpired = (now - persistedCache.timestamp) > CACHE_TTL;
      
      // Update in-memory cache from persisted data
      cachedInitData = persistedCache.data;
      cacheTimestamp = persistedCache.timestamp;
      cachedCountry = persistedCache.country || null;
      cachedLang = persistedCache.lang || null;
      
      if (!isExpired) {
        console.log('[TvInit] Cache valid, returning persisted data (age:', Math.round((now - persistedCache.timestamp) / 1000 / 60), 'minutes)');
        // Optionally refresh in background if cache is more than 12 hours old
        if ((now - persistedCache.timestamp) > CACHE_TTL / 2) {
          refreshInBackground(country, lang);
        }
        return persistedCache.data;
      } else {
        console.log('[TvInit] Cache expired, returning stale data and refreshing...');
        // Return stale data immediately, refresh in background
        refreshInBackground(country, lang);
        return persistedCache.data;
      }
    }
  } catch (error) {
    console.log('[TvInit] Error checking persistent cache:', error);
  }

  // 3. No cache available, fetch from API (blocking)
  console.log('[TvInit] No cache, fetching fresh data...');
  return await fetchAndCache(country, lang);
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

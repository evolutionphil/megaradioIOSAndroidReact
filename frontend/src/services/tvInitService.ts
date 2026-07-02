// TV Init Service - Fetches all essential data in one request
// Endpoint: GET /api/tv/init?country=TR&lang=tr
// Returns: countries, genres, translations, popularStations
// NO LOCAL CACHING - Always fetch fresh from API

import api from './api';
import i18n from './i18nService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  countries: any[];
  genres: TvInitGenre[];
  translations: Record<string, string>;
  popularStations: TvInitStation[];
  trendingStations?: TvInitStation[];
  meta?: {
    country: string;
    countryCode: string;
    timestamp: string;
    genreLimit: number;
    stationsLimit: number;
    totalGenres: number;
    totalCountries: number;
    generatedAt: string;
  };
}

/**
 * Fetch TV init data from API
 * Always fetches fresh data, no caching
 */
export const fetchTvInit = async (
  country?: string,
  limit?: number,
  lang?: string
): Promise<TvInitResponse> => {
  const params: Record<string, any> = {};
  if (country) params.country = country;
  if (limit) params.limit = limit;
  if (lang) params.lang = lang;

  console.log('[TvInit] Fetching from API with country:', country || 'global');
  const response = await api.get('/api/tv/init', { params });
  
  console.log('[TvInit] Data fetched successfully:', {
    popularStations: response.data?.popularStations?.length || 0,
    trendingStations: response.data?.trendingStations?.length || 0,
    genres: response.data?.genres?.length || 0,
    countries: response.data?.countries?.length || 0,
    translations: Object.keys(response.data?.translations || {}).length,
  });

  return response.data;
};

/**
 * Initialize app with TV init data — CACHE-FIRST, fully non-blocking:
 * - If a cached response exists: apply it instantly and refresh from network in the BACKGROUND
 * - If not: fetch from network (first launch only) and cache the result
 */
export const initializeApp = async (
  country?: string,
  lang?: string
): Promise<TvInitResponse | null> => {
  const effectiveLang = lang || i18n.language || 'tr';
  const cacheKey = `@megaradio_tv_init:${country || 'global'}:${effectiveLang}`;

  const applyTranslations = (data: TvInitResponse) => {
    if (data.translations && Object.keys(data.translations).length > 0) {
      i18n.addResourceBundle(effectiveLang, 'translation', data.translations, true, true);
      console.log('[TvInit] Loaded', Object.keys(data.translations).length, 'translations for', effectiveLang);
    }
  };

  const refreshFromNetwork = async (): Promise<TvInitResponse> => {
    const data = await fetchTvInit(country, undefined, lang);
    applyTranslations(data);
    AsyncStorage.setItem(cacheKey, JSON.stringify(data)).catch(() => {});
    return data;
  };

  try {
    console.log('[TvInit] initializeApp called with country:', country, 'lang:', lang);

    let cached: TvInitResponse | null = null;
    try {
      const raw = await AsyncStorage.getItem(cacheKey);
      if (raw) cached = JSON.parse(raw);
    } catch {}

    if (cached) {
      console.log('[TvInit] Cache HIT - applying instantly, refreshing in background');
      applyTranslations(cached);
      refreshFromNetwork().catch((e) =>
        console.log('[TvInit] Background refresh failed (non-blocking):', e?.message || e)
      );
      return cached;
    }

    console.log('[TvInit] Cache MISS - fetching from network (first launch)');
    return await refreshFromNetwork();
  } catch (error) {
    console.error('[TvInit] Failed to initialize app:', error);
    return null;
  }
};

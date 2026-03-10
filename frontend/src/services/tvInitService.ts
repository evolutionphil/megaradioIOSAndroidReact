// TV Init Service - Fetches all essential data in one request
// Endpoint: GET /api/tv/init?country=TR&lang=tr
// Returns: countries, genres, translations, popularStations
// NO LOCAL CACHING - Always fetch fresh from API

import api from './api';
import i18n from './i18nService';

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
 * Initialize app with TV init data
 * - Loads translations into i18n
 */
export const initializeApp = async (
  country?: string,
  lang?: string
): Promise<TvInitResponse | null> => {
  try {
    console.log('[TvInit] initializeApp called with country:', country, 'lang:', lang);
    const data = await fetchTvInit(country, undefined, lang);

    // Load translations into i18n
    if (data.translations && Object.keys(data.translations).length > 0) {
      const currentLang = lang || i18n.language || 'tr';
      i18n.addResourceBundle(currentLang, 'translation', data.translations, true, true);
      console.log('[TvInit] Loaded', Object.keys(data.translations).length, 'translations for', currentLang);
    }

    return data;
  } catch (error) {
    console.error('[TvInit] Failed to initialize app:', error);
    return null;
  }
};

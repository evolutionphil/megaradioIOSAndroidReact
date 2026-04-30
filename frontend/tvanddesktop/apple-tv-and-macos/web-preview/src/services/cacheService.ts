// TV-optimized localStorage Cache Service
// Designed for Samsung Tizen (Chromium 76) and LG webOS compatibility

import { Station, Genre } from './megaRadioApi';

// Cache TTLs in milliseconds
const TTL = {
  COUNTRIES: 30 * 24 * 60 * 60 * 1000,  // 30 days
  GENRES: 7 * 24 * 60 * 60 * 1000,       // 7 days
  POPULAR_STATIONS: 24 * 60 * 60 * 1000, // 24 hours
  STATIONS: 7 * 24 * 60 * 60 * 1000,     // 7 days
  TRANSLATIONS: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Cache keys
const KEYS = {
  COUNTRIES: 'cache_countries',
  GENRES: (country: string) => `cache_genres_${country}`,
  POPULAR_STATIONS: (country: string) => `cache_popular_${country}`,
  INITIAL_STATIONS: (country: string) => `cache_stations_${country}`,
  GENRE_STATIONS: (genre: string, country: string) => `cache_genre_${genre}_${country}`,
  TRANSLATIONS: (lang: string) => `cache_translations_${lang}`,
  BROKEN_IMAGES: 'cache_broken_images',
};

// Minimal station data to reduce storage size
interface MinimalStation {
  _id: string;
  name: string;
  url: string;
  favicon?: string;
  tags?: string | string[];
  country?: string;
  countrycode?: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Convert full station to minimal for storage
function minimizeStation(station: Station): MinimalStation {
  return {
    _id: station._id,
    name: station.name,
    url: station.url,
    favicon: station.favicon,
    tags: station.tags,
    country: station.country,
    countrycode: station.countrycode || station.countryCode,
  };
}

// Restore minimal station to full station format
function restoreStation(minimal: MinimalStation): Station {
  return {
    ...minimal,
    countryCode: minimal.countrycode,
  } as Station;
}

// Safe localStorage access (TV-compatible)
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    // localStorage full or unavailable - try to clear old cache
    try {
      clearOldCache();
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}

function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore errors
  }
}

// Maximum number of countries to cache (to prevent localStorage bloat on TVs)
const MAX_CACHED_COUNTRIES = 5;
const COUNTRY_ACCESS_KEY = 'cache_country_access_order';

// Track country access order for LRU eviction
function trackCountryAccess(countryCode: string): void {
  try {
    const raw = localStorage.getItem(COUNTRY_ACCESS_KEY);
    let order: string[] = raw ? JSON.parse(raw) : [];
    
    // Remove if exists, add to end (most recent)
    order = order.filter(c => c !== countryCode);
    order.push(countryCode);
    
    // If over limit, remove oldest country's cache
    while (order.length > MAX_CACHED_COUNTRIES) {
      const oldest = order.shift();
      if (oldest) {
        safeRemoveItem(KEYS.GENRES(oldest));
        safeRemoveItem(KEYS.POPULAR_STATIONS(oldest));
        safeRemoveItem(KEYS.INITIAL_STATIONS(oldest));
      }
    }
    
    localStorage.setItem(COUNTRY_ACCESS_KEY, JSON.stringify(order));
  } catch {
    // Ignore errors
  }
}

// Clear oldest cache entries when storage is full
function clearOldCache(): void {
  const keysToCheck: string[] = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache_')) {
        keysToCheck.push(key);
      }
    }
    
    // Sort by timestamp (oldest first) and remove half
    const entries: { key: string; timestamp: number }[] = [];
    for (const key of keysToCheck) {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          entries.push({ key, timestamp: parsed.timestamp || 0 });
        }
      } catch {
        // Remove corrupt entries
        safeRemoveItem(key);
      }
    }
    
    entries.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = entries.slice(0, Math.ceil(entries.length / 2));
    for (const entry of toRemove) {
      safeRemoveItem(entry.key);
    }
  } catch {
    // Ignore errors
  }
}

// Check if cache entry is valid
function isCacheValid<T>(entry: CacheEntry<T> | null): boolean {
  if (!entry) return false;
  const now = Date.now();
  return now - entry.timestamp < entry.ttl;
}

// Get cache entry (returns data even if expired for background refresh pattern)
function getCacheEntry<T>(key: string): { data: T | null; isExpired: boolean } {
  const raw = safeGetItem(key);
  if (!raw) return { data: null, isExpired: true };
  
  try {
    const entry: CacheEntry<T> = JSON.parse(raw);
    const isExpired = !isCacheValid(entry);
    return { data: entry.data, isExpired };
  } catch {
    safeRemoveItem(key);
    return { data: null, isExpired: true };
  }
}

// Set cache entry
function setCacheEntry<T>(key: string, data: T, ttl: number): void {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl,
  };
  safeSetItem(key, JSON.stringify(entry));
}

// Public API
export const cacheService = {
  // Countries
  getCountries: (): { data: string[] | null; isExpired: boolean } => {
    return getCacheEntry<string[]>(KEYS.COUNTRIES);
  },
  
  setCountries: (countries: string[]): void => {
    setCacheEntry(KEYS.COUNTRIES, countries, TTL.COUNTRIES);
  },
  
  // Genres (per country)
  getGenres: (countryCode: string): { data: Genre[] | null; isExpired: boolean } => {
    return getCacheEntry<Genre[]>(KEYS.GENRES(countryCode));
  },
  
  setGenres: (countryCode: string, genres: Genre[]): void => {
    setCacheEntry(KEYS.GENRES(countryCode), genres, TTL.GENRES);
  },
  
  // Popular Stations (per country)
  getPopularStations: (countryCode: string): { data: Station[] | null; isExpired: boolean } => {
    const result = getCacheEntry<MinimalStation[]>(KEYS.POPULAR_STATIONS(countryCode));
    if (result.data) {
      return { data: result.data.map(restoreStation), isExpired: result.isExpired };
    }
    return { data: null, isExpired: true };
  },
  
  setPopularStations: (countryCode: string, stations: Station[]): void => {
    const minimal = stations.map(minimizeStation);
    setCacheEntry(KEYS.POPULAR_STATIONS(countryCode), minimal, TTL.POPULAR_STATIONS);
  },
  
  // Initial Stations for country (first 100-200)
  getInitialStations: (countryCode: string): { data: Station[] | null; isExpired: boolean } => {
    const result = getCacheEntry<MinimalStation[]>(KEYS.INITIAL_STATIONS(countryCode));
    if (result.data) {
      return { data: result.data.map(restoreStation), isExpired: result.isExpired };
    }
    return { data: null, isExpired: true };
  },
  
  setInitialStations: (countryCode: string, stations: Station[]): void => {
    // Limit to 200 stations to save space
    const limited = stations.slice(0, 200);
    const minimal = limited.map(minimizeStation);
    setCacheEntry(KEYS.INITIAL_STATIONS(countryCode), minimal, TTL.STATIONS);
    // Track country access for LRU eviction
    trackCountryAccess(countryCode);
  },
  
  // Genre Stations (per genre + country)
  getGenreStations: (genre: string, countryCode: string): { data: Station[] | null; isExpired: boolean } => {
    const result = getCacheEntry<MinimalStation[]>(KEYS.GENRE_STATIONS(genre, countryCode));
    if (result.data) {
      return { data: result.data.map(restoreStation), isExpired: result.isExpired };
    }
    return { data: null, isExpired: true };
  },
  
  setGenreStations: (genre: string, countryCode: string, stations: Station[]): void => {
    const limited = stations.slice(0, 56);
    const minimal = limited.map(minimizeStation);
    setCacheEntry(KEYS.GENRE_STATIONS(genre, countryCode), minimal, TTL.STATIONS);
  },

  // Translations
  getTranslations: (lang: string): { data: Record<string, string> | null; isExpired: boolean } => {
    return getCacheEntry<Record<string, string>>(KEYS.TRANSLATIONS(lang));
  },
  
  setTranslations: (lang: string, translations: Record<string, string>): void => {
    setCacheEntry(KEYS.TRANSLATIONS(lang), translations, TTL.TRANSLATIONS);
  },
  
  // Broken image tracking (to avoid refetching broken images)
  getBrokenImages: (): Set<string> => {
    const result = getCacheEntry<string[]>(KEYS.BROKEN_IMAGES);
    return new Set(result.data || []);
  },
  
  addBrokenImage: (url: string): void => {
    const current = cacheService.getBrokenImages();
    current.add(url);
    // Limit to 500 entries
    const limited = Array.from(current).slice(-500);
    setCacheEntry(KEYS.BROKEN_IMAGES, limited, TTL.STATIONS);
  },
  
  // Clear all cache
  clearAll: (): void => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('cache_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(safeRemoveItem);
    } catch {
      // Ignore errors
    }
  },
  
  // Prefetch data for a country (call when country changes)
  prefetchCountryData: async (
    countryCode: string,
    fetchGenres: () => Promise<Genre[]>,
    fetchPopular: () => Promise<Station[]>,
    fetchStations: () => Promise<Station[]>
  ): Promise<void> => {
    // Fire all requests in parallel, don't await - let them complete in background
    Promise.all([
      fetchGenres().then(genres => cacheService.setGenres(countryCode, genres)).catch(() => {}),
      fetchPopular().then(stations => cacheService.setPopularStations(countryCode, stations)).catch(() => {}),
      fetchStations().then(stations => cacheService.setInitialStations(countryCode, stations)).catch(() => {}),
    ]);
  },
};

export default cacheService;

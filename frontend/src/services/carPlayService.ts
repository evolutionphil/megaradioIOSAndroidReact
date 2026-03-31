// CarPlay & Android Auto Service
// Handles connection events and template management for in-car displays

import { Platform, NativeModules } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import CarPlayLogger from './carPlayLogService';
import i18n, { addLanguageChangeListener } from './i18nService';
import { getStationLogoUrl as centralGetStationLogoUrl, DEFAULT_STATION_LOGO_URL } from '../utils/stationLogoHelper';
import { getCarPlayImagePath, cacheStationImages } from './carPlayImageCache';

// Native module for cache bridge (iOS only)
const CarPlayCacheModule = NativeModules.CarPlayCacheModule;

// Helper to save stations to native cache (iOS only)
const saveToNativeCache = (stations: any[], key: string = 'popular') => {
  if (Platform.OS === 'ios' && CarPlayCacheModule?.saveStations) {
    try {
      // Convert to simple format for native cache
      const cacheData = stations.map(s => ({
        id: s._id || s.id,
        name: s.name,
        country: s.country || '',
        favicon: s.favicon || s.logo || '',
        url: s.url || s.streamUrl || '',
        genre: s.genre || s.tags?.split(',')[0] || '',
      }));
      CarPlayCacheModule.saveStations(cacheData, key);
      console.log(`[CarPlay] Saved ${cacheData.length} stations to native cache for key: ${key}`);
    } catch (e) {
      console.log('[CarPlay] Native cache save failed (module may not be available):', e);
    }
  }
};

// LOCAL ASSETS for CarPlay - NO backend dependency
// These ensure CarPlay works even when offline
const LOCAL_FALLBACK_LOGO = require('../../assets/images/default-station-logo.png');

// Genre-specific icons for CarPlay
const GENRE_ICONS: { [key: string]: any } = {
  pop: require('../../assets/images/genres/genre-pop.png'),
  rock: require('../../assets/images/genres/genre-rock.png'),
  jazz: require('../../assets/images/genres/genre-jazz.png'),
  classical: require('../../assets/images/genres/genre-classical.png'),
  dance: require('../../assets/images/genres/genre-dance.png'),
  electronic: require('../../assets/images/genres/genre-dance.png'),
  hiphop: require('../../assets/images/genres/genre-hiphop.png'),
  'hip-hop': require('../../assets/images/genres/genre-hiphop.png'),
  rap: require('../../assets/images/genres/genre-hiphop.png'),
  country: require('../../assets/images/genres/genre-country.png'),
  news: require('../../assets/images/genres/genre-news.png'),
  talk: require('../../assets/images/genres/genre-news.png'),
  sports: require('../../assets/images/genres/genre-sports.png'),
  world: require('../../assets/images/genres/genre-world.png'),
  rnb: require('../../assets/images/genres/genre-rnb.png'),
  'r&b': require('../../assets/images/genres/genre-rnb.png'),
  soul: require('../../assets/images/genres/genre-rnb.png'),
  metal: require('../../assets/images/genres/genre-metal.png'),
  blues: require('../../assets/images/genres/genre-blues.png'),
  default: require('../../assets/images/genres/genre-default.png'),
};

// Get genre icon by name (case-insensitive, with fallback)
const getGenreIcon = (genreName: string): any => {
  const key = genreName.toLowerCase().replace(/[\s_]/g, '-').replace(/[^a-z-]/g, '');
  return GENRE_ICONS[key] || GENRE_ICONS.default;
};

// URL fallback for when local asset can't be used (legacy compatibility)
const FALLBACK_LOGO_URL = 'https://themegaradio.com/logo.png';

// Helper function to get translated CarPlay strings - always use current i18n state
const t = (key: string, fallback: string): string => {
  try {
    const translation = i18n.t(key);
    // If translation equals key, it means no translation found - use fallback
    return translation !== key ? translation : fallback;
  } catch {
    return fallback;
  }
};

// Track if we need to refresh templates when language/country changes
let needsTemplateRefresh = false;
let languageListenerUnsubscribe: (() => void) | null = null;

// Only import CarPlay on native platforms
let CarPlay: any = null;
let ListTemplate: any = null;
let TabBarTemplate: any = null;
let NowPlayingTemplate: any = null;
let GridTemplate: any = null;
let SearchTemplate: any = null;
let VoiceControlTemplate: any = null;

// Track if we've already registered handlers (prevent duplicates)
let handlersRegistered = false;

// Queue for pending operations when CarPlay connects before service is initialized
let pendingConnection = false;

// Cold-start retry mechanism - more aggressive polling for race condition fix
let coldStartRetryCount = 0;
const MAX_COLD_START_RETRIES = 30; // Increased to 30 attempts
const COLD_START_RETRY_INTERVAL = 500; // Reduced to 500ms for faster response
let coldStartRetryTimer: ReturnType<typeof setInterval> | null = null;

// Mutex to prevent concurrent template creation (crash fix)
let isCreatingTemplate = false;
// Flag to indicate callbacks were updated while template was being created
let pendingCallbackRefresh = false;

if (Platform.OS !== 'web') {
  try {
    const carplayModule = require('@g4rb4g3/react-native-carplay');
    CarPlay = carplayModule.CarPlay;
    ListTemplate = carplayModule.ListTemplate;
    TabBarTemplate = carplayModule.TabBarTemplate;
    NowPlayingTemplate = carplayModule.NowPlayingTemplate;
    GridTemplate = carplayModule.GridTemplate;
    SearchTemplate = carplayModule.SearchTemplate;
    VoiceControlTemplate = carplayModule.VoiceControlTemplate;
    
    CarPlayLogger.moduleLoaded('react-native-carplay', true);
    CarPlayLogger.info('CarPlay modules loaded', {
      CarPlay: !!CarPlay,
      ListTemplate: !!ListTemplate,
      TabBarTemplate: !!TabBarTemplate,
      NowPlayingTemplate: !!NowPlayingTemplate,
      GridTemplate: !!GridTemplate,
      SearchTemplate: !!SearchTemplate,
      VoiceControlTemplate: !!VoiceControlTemplate,
    });
    
    // CRITICAL: Register handlers IMMEDIATELY when module loads
    // This ensures we catch connection events even if they fire before initialize()
    if (CarPlay && !handlersRegistered) {
      CarPlayLogger.info('[RN] EARLY REGISTRATION - Registering connection handlers at module load');
      
      CarPlay.registerOnConnect(() => {
        CarPlayLogger.info('[RN] EARLY onConnect callback FIRED (before initialize)', {
          timestamp: new Date().toISOString(),
          hasCallbacks: !!playStationCallback,
        });
        pendingConnection = true;
      });
      
      CarPlay.registerOnDisconnect(() => {
        CarPlayLogger.info('[RN] EARLY onDisconnect callback FIRED');
        pendingConnection = false;
      });
      
      // Check if already connected at module load time
      if (CarPlay.connected) {
        CarPlayLogger.info('[RN] CarPlay ALREADY CONNECTED at module load time!');
        pendingConnection = true;
      }
      
      handlersRegistered = true;
    }
  } catch (e: any) {
    console.log('[CarPlayService] CarPlay module not available:', e);
    CarPlayLogger.moduleError('react-native-carplay', e);
  }
}

// Types
interface Station {
  _id: string;
  name: string;
  logo?: string;
  favicon?: string;
  country?: string;
  tags?: string;
  url: string;
  url_resolved?: string;
}

interface CarPlayServiceType {
  isConnected: boolean;
  initialize: (
    playStation: (station: Station) => Promise<void>,
    getStations: () => Promise<Station[]>,
    getFavorites: () => Promise<Station[]>,
    getRecentlyPlayed: () => Promise<Station[]>,
    getGenres: () => Promise<{ name: string; count: number }[]>,
    getStationsByGenre: (genre: string) => Promise<Station[]>,
    searchStations?: (query: string) => Promise<Station[]>,
    toggleFavorite?: (station: Station) => Promise<void>,
    isFavorite?: (stationId: string) => boolean,
    getNextStation?: () => Promise<Station | null>,
    getPreviousStation?: () => Promise<Station | null>
  ) => void;
  updateNowPlaying: (station: Station, songTitle?: string, artistName?: string) => void;
  disconnect: () => void;
  openSearch?: () => void;
  refreshTemplates?: () => Promise<void>;
  refreshFavorites?: () => Promise<void>;
  refreshRecentlyPlayed?: () => Promise<void>;
}

// Global state
let isCarPlayConnected = false;
let playStationCallback: ((station: Station) => Promise<void>) | null = null;
let getStationsCallback: (() => Promise<Station[]>) | null = null;
let getFavoritesCallback: (() => Promise<Station[]>) | null = null;
let getRecentlyPlayedCallback: (() => Promise<Station[]>) | null = null;
let getGenresCallback: (() => Promise<{ name: string; count: number }[]>) | null = null;
let getStationsByGenreCallback: ((genre: string) => Promise<Station[]>) | null = null;
let searchStationsCallback: ((query: string) => Promise<Station[]>) | null = null;
let toggleFavoriteCallback: ((station: Station) => Promise<void>) | null = null;
let isFavoriteCallback: ((stationId: string) => boolean) | null = null;
let getNextStationCallback: (() => Promise<Station | null>) | null = null;
let getPreviousStationCallback: (() => Promise<Station | null>) | null = null;
// Track the currently playing station for NowPlaying button callbacks
let currentNowPlayingStation: Station | null = null;

// Helper to get station artwork as ImageSourcePropType
// For CarPlay: Downloads and caches image locally, returns local file path
// CarPlay does NOT support remote URLs!
const getStationImage = async (station: Station): Promise<{ uri: string } | null> => {
  try {
    // Try to get cached local path first
    const localPath = await getCarPlayImagePath(station as any);
    
    if (localPath && localPath.length > 0) {
      return { uri: localPath };
    }
    
    // Fallback: return null (template will show without image)
    // This is better than crashing CarPlay with remote URL
    return null;
  } catch (error) {
    console.error('[CarPlayService] getStationImage error:', error);
    return null;
  }
};

// Pre-download images for a list of stations and return a map of stationId -> local image source
// CRITICAL: CPListItem image is IMMUTABLE after creation on iOS!
// We MUST download images BEFORE creating template items, not after.
const preloadStationImages = async (stations: Station[]): Promise<Map<string, any>> => {
  const imageMap = new Map<string, any>();
  
  try {
    // Use batch download from carPlayImageCache
    const cachedPaths = await cacheStationImages(stations as any[]);
    
    // Convert local paths to ImageSourcePropType
    cachedPaths.forEach((localPath, stationId) => {
      if (localPath && localPath.length > 0) {
        imageMap.set(stationId, { uri: localPath });
      }
    });
    
    console.log(`[CarPlay] Pre-loaded ${imageMap.size}/${stations.length} station images`);
  } catch (error) {
    console.error('[CarPlay] Error pre-loading station images:', error);
  }
  
  return imageMap;
};

// Get the correct image for a station: pre-downloaded local image or fallback
const getStationImageFromMap = (station: Station, imageMap: Map<string, any>): any => {
  const id = station._id || (station as any).id || '';
  if (imageMap.has(id)) {
    return imageMap.get(id);
  }
  return LOCAL_FALLBACK_LOGO;
};

// Synchronous helper for immediate use - delegates to centralized stationLogoHelper
const getStationImageSync = (station: Station): { uri: string } => {
  const url = centralGetStationLogoUrl(station);
  return { uri: url || FALLBACK_LOGO_URL };
};

// Legacy helper (string version) for backward compatibility and CarPlay imgUrl
const getArtworkUrl = (station: Station): string => {
  return centralGetStationLogoUrl(station) || FALLBACK_LOGO_URL;
};

// Create Favorites List Template
const createFavoritesTemplate = async (): Promise<any> => {
  CarPlayLogger.templateCreating('Favorites');
  
  if (!ListTemplate || !getFavoritesCallback) {
    CarPlayLogger.templateFailed('Favorites', 'ListTemplate or callback not available');
    return null;
  }
  
  try {
    CarPlayLogger.dataLoading('favorites');
    
    // COLD START FIX: Increased timeout to 10s for cold start scenarios
    // JS bundle initialization and API calls can take longer on first launch
    const TIMEOUT_MS = 10000;
    const timeoutPromise = new Promise<Station[]>((resolve) => 
      setTimeout(() => {
        console.log('[CarPlay] Favorites timeout - returning empty');
        resolve([]);
      }, TIMEOUT_MS)
    );
    
    const favorites = await Promise.race([getFavoritesCallback(), timeoutPromise]);
    CarPlayLogger.dataLoaded('favorites', favorites.length);
    
    // Build items with imgUrl for async native image loading
    // Native iOS downloads images asynchronously via imgUrl during item creation
    const items = favorites.map(station => {
      const imgUrl = getArtworkUrl(station);
      return {
        text: station.name,
        detailText: station.country || station.tags?.split(',')[0] || 'Radio',
        image: LOCAL_FALLBACK_LOGO,
        imgUrl: imgUrl,
      };
    });
    
    const template = new ListTemplate({
      title: t('carplay_favorites', 'Favorites'),
      sections: [{
        header: `${t('carplay_favorite_stations', 'Favorite Stations')} (${favorites.length})`,
        items,
      }],
      onItemSelect: async ({ index }: { index: number }) => {
        const station = favorites[index];
        if (station && playStationCallback) {
          CarPlayLogger.stationSelected(station.name, station._id);
          console.log('[CarPlay] Playing favorite:', station.name);
          try {
            await playStationCallback(station);
            CarPlayLogger.playbackStarted(station.name, station.url_resolved || station.url);
            showNowPlayingTemplate(station);
          } catch (e: any) {
            CarPlayLogger.playbackError(e, station.name);
          }
        }
      },
    });
    
    CarPlayLogger.templateCreated('Favorites', { itemCount: favorites.length });
    return template;
  } catch (error: any) {
    CarPlayLogger.templateError('Favorites', error);
    console.error('[CarPlay] Error creating favorites template:', error);
    return null;
  }
};

// Create Recently Played List Template
const createRecentlyPlayedTemplate = async (): Promise<any> => {
  CarPlayLogger.templateCreating('RecentlyPlayed');
  
  if (!ListTemplate || !getRecentlyPlayedCallback) {
    CarPlayLogger.templateFailed('RecentlyPlayed', 'ListTemplate or callback not available');
    return null;
  }
  
  try {
    CarPlayLogger.dataLoading('recentlyPlayed');
    
    // COLD START FIX: Increased timeout to 10s for cold start scenarios
    const TIMEOUT_MS = 10000;
    const timeoutPromise = new Promise<Station[]>((resolve) => 
      setTimeout(() => {
        console.log('[CarPlay] RecentlyPlayed timeout - returning empty');
        resolve([]);
      }, TIMEOUT_MS)
    );
    
    const recentStations = await Promise.race([getRecentlyPlayedCallback(), timeoutPromise]);
    CarPlayLogger.dataLoaded('recentlyPlayed', recentStations.length);
    
    // Use ListTemplate for Recently Played - supports imgUrl for remote logos
    // (GridTemplate does NOT support imgUrl, only local images)
    console.log('[CarPlay] Using ListTemplate for Recently Played (Zuletzt gespielt)');
    
    const stationsSlice = recentStations.slice(0, 24);
    const items = stationsSlice.map(station => {
      const imgUrl = getArtworkUrl(station);
      return {
        text: station.name,
        detailText: station.country || station.tags?.split(',')[0] || 'Radio',
        image: LOCAL_FALLBACK_LOGO,
        imgUrl: imgUrl,
      };
    });
    
    const template = new ListTemplate({
      title: t('carplay_recently_played', 'Zuletzt gespielt'),
      sections: [{
        header: `${t('carplay_recent_stations', 'Recent Stations')} (${stationsSlice.length})`,
        items,
      }],
      onItemSelect: async ({ index }: { index: number }) => {
        const station = stationsSlice[index];
        if (station && playStationCallback) {
          CarPlayLogger.stationSelected(station.name, station._id);
          console.log('[CarPlay] Playing recent:', station.name);
          try {
            await playStationCallback(station);
            CarPlayLogger.playbackStarted(station.name, station.url_resolved || station.url);
            showNowPlayingTemplate(station);
          } catch (e: any) {
            CarPlayLogger.playbackError(e, station.name);
          }
        }
      },
    });
    
    CarPlayLogger.templateCreated('RecentlyPlayed', { itemCount: stationsSlice.length });
    return template;
  } catch (error: any) {
    CarPlayLogger.templateError('RecentlyPlayed', error);
    console.error('[CarPlay] Error creating recently played template:', error);
    return null;
  }
};

// Create Genres Grid Template (40 genres in grid layout)
const createGenresTemplate = async (): Promise<any> => {
  CarPlayLogger.templateCreating('Genres');
  
  // Try GridTemplate first, fallback to ListTemplate
  const TemplateClass = GridTemplate || ListTemplate;
  
  if (!TemplateClass || !getGenresCallback) {
    CarPlayLogger.templateFailed('Genres', 'Template or callback not available');
    return null;
  }
  
  // SF Symbol mapping for CarPlay genre icons
  // These are native iOS system symbols that display properly in CarPlay
  const genreSFSymbols: Record<string, string> = {
    pop: 'star.fill',
    rock: 'bolt.fill',
    jazz: 'music.note.list',
    classical: 'leaf.fill',
    electronic: 'waveform.path',
    'hip-hop': 'mic.fill',
    hiphop: 'mic.fill',
    country: 'sun.max.fill',
    world: 'globe',
    news: 'newspaper.fill',
    talk: 'bubble.left.and.bubble.right.fill',
    sports: 'sportscourt.fill',
    oldies: 'clock.fill',
    alternative: 'flame.fill',
    reggae: 'leaf.fill',
    metal: 'guitars.fill',
    folk: 'cup.and.saucer.fill',
    dance: 'figure.dance',
    rnb: 'heart.fill',
    'r&b': 'heart.fill',
    soul: 'heart.fill',
    blues: 'music.quarternote.3',
    christian: 'cross.fill',
    religious: 'cross.fill',
    latin: 'music.mic',
    indie: 'guitars',
    ambient: 'cloud.fill',
    chillout: 'moon.fill',
    lounge: 'sofa.fill',
    '80s': 'sparkles',
    '90s': 'sparkles',
    '70s': 'sparkles',
    '60s': 'sparkles',
    hits: 'chart.line.uptrend.xyaxis',
    top40: 'chart.bar.fill',
    default: 'radio.fill',
  };
  
  const getGenreSFSymbol = (genreName: string): string => {
    const key = genreName.toLowerCase().replace(/[\s_]/g, '-');
    return genreSFSymbols[key] || genreSFSymbols.default;
  };
  
  try {
    CarPlayLogger.dataLoading('genres');
    
    // COLD START FIX: Increased timeout to 10s for cold start scenarios
    const TIMEOUT_MS = 10000;
    const timeoutPromise = new Promise<{ name: string; count: number }[]>((resolve) => 
      setTimeout(() => {
        console.log('[CarPlay] Genres timeout - returning empty');
        resolve([]);
      }, TIMEOUT_MS)
    );
    
    const genres = await Promise.race([getGenresCallback(), timeoutPromise]);
    CarPlayLogger.dataLoaded('genres', genres.length);
    
    // Using ListTemplate with genre-specific LOCAL icons - no backend dependency
    // Each genre gets its own icon (rock guitar, jazz sax, pop mic, etc.)
    
    console.log('[CarPlay] Using ListTemplate for genres with GENRE-SPECIFIC icons');
    
    const template = new ListTemplate({
      title: t('carplay_genres', 'Genres'),
      sections: [{
        header: `${t('carplay_music_genres', 'Music Genres')} (${Math.min(genres.length, 40)})`,
        items: genres.slice(0, 40).map(genre => {
          // Get genre-specific icon (rock, pop, jazz, etc.) or default
          const genreIcon = getGenreIcon(genre.name);
          
          return {
            text: genre.name,
            // Don't show global count - it's misleading since genre detail shows filtered/local count
            detailText: t('carplay_stations', 'Sender'),
            // Use genre-specific LOCAL icon - works offline, no backend dependency
            image: genreIcon,
          };
        }),
      }],
      onItemSelect: async ({ index }: { index: number }) => {
        const genre = genres[index];
        if (genre) {
          CarPlayLogger.info('Genre selected', { genre: genre.name });
          console.log('[CarPlay] Genre selected:', genre.name);
          await showGenreStationsTemplate(genre.name);
        }
      },
    });
    
    CarPlayLogger.templateCreated('Genres (List)', { genreCount: Math.min(genres.length, 40) });
    return template;
  } catch (error: any) {
    CarPlayLogger.templateError('Genres', error);
    console.error('[CarPlay] Error creating genres template:', error);
    return null;
  }
};

// Create Genre Stations List Template
const showGenreStationsTemplate = async (genre: string): Promise<void> => {
  CarPlayLogger.templateCreating(`GenreStations-${genre}`);
  
  if (!ListTemplate || !CarPlay || !getStationsByGenreCallback) {
    CarPlayLogger.templateFailed(`GenreStations-${genre}`, 'Dependencies not available');
    console.error('[CarPlay] showGenreStationsTemplate failed - missing dependencies:', {
      ListTemplate: !!ListTemplate,
      CarPlay: !!CarPlay,
      getStationsByGenreCallback: !!getStationsByGenreCallback,
    });
    return;
  }
  
  try {
    CarPlayLogger.dataLoading(`genreStations-${genre}`);
    console.log('[CarPlay] Fetching stations for genre:', genre);
    
    // Add timeout for genre station fetch (max 15 seconds)
    const TIMEOUT_MS = 15000;
    const timeoutPromise = new Promise<Station[]>((resolve) => 
      setTimeout(() => {
        console.warn('[CarPlay] Genre stations timeout for:', genre);
        resolve([]);
      }, TIMEOUT_MS)
    );
    
    const stations = await Promise.race([getStationsByGenreCallback(genre), timeoutPromise]);
    CarPlayLogger.dataLoaded(`genreStations-${genre}`, stations.length);
    
    console.log('[CarPlay] Got', stations.length, 'stations for genre:', genre);
    
    // If no stations found, show an informative message
    if (!stations || stations.length === 0) {
      console.warn('[CarPlay] No stations found for genre:', genre);
      CarPlayLogger.warn(`[RN] No stations found for genre: ${genre}`);
      
      // Show empty state template
      const emptyTemplate = new ListTemplate({
        title: genre,
        sections: [{
          header: genre,
          items: [{
            text: t('carplay_no_stations', 'No stations found'),
            detailText: t('carplay_try_another_genre', 'Try another genre'),
          }],
        }],
      });
      
      CarPlay.pushTemplate(emptyTemplate, true);
      return;
    }
    
    // Build items with imgUrl for async native image loading (max 50)
    const stationsSlice = stations.slice(0, 50);
    const items = stationsSlice.map(station => {
      const imgUrl = getArtworkUrl(station);
      return {
        text: station.name,
        detailText: station.country || 'Radio',
        image: LOCAL_FALLBACK_LOGO,
        imgUrl: imgUrl,
      };
    });
    
    const template = new ListTemplate({
      title: genre,
      sections: [{
        header: `${genre} (${stationsSlice.length})`,
        items,
      }],
      onItemSelect: async ({ index }: { index: number }) => {
        const station = stationsSlice[index];
        if (station && playStationCallback) {
          CarPlayLogger.stationSelected(station.name, station._id);
          console.log('[CarPlay] Playing from genre:', station.name);
          try {
            await playStationCallback(station);
            CarPlayLogger.playbackStarted(station.name, station.url_resolved || station.url);
            showNowPlayingTemplate(station);
          } catch (e: any) {
            CarPlayLogger.playbackError(e, station.name);
          }
        }
      },
    });
    
    CarPlay.pushTemplate(template, true);
    CarPlayLogger.templateCreated(`GenreStations-${genre}`, { stationCount: Math.min(stations.length, 50) });
  } catch (error: any) {
    CarPlayLogger.templateError(`GenreStations-${genre}`, error);
    console.error('[CarPlay] Error showing genre stations:', error);
  }
};

// Create Browse/Popular Stations List Template (50 stations with logos)
const createBrowseTemplate = async (): Promise<any> => {
  CarPlayLogger.templateCreating('Browse');
  
  if (!ListTemplate || !getStationsCallback) {
    CarPlayLogger.templateFailed('Browse', 'ListTemplate or callback not available');
    return null;
  }
  
  try {
    CarPlayLogger.dataLoading('popularStations');
    
    // COLD START FIX: Increased timeout to 10s for cold start scenarios
    const TIMEOUT_MS = 10000;
    const timeoutPromise = new Promise<Station[]>((resolve) => 
      setTimeout(() => {
        console.log('[CarPlay] Browse/Popular timeout - returning empty');
        resolve([]);
      }, TIMEOUT_MS)
    );
    
    const stations = await Promise.race([getStationsCallback(), timeoutPromise]);
    CarPlayLogger.dataLoaded('popularStations', stations.length);
    
    // Build items with imgUrl for async native image loading (max 50)
    const stationsSlice = stations.slice(0, 50);
    
    // SAVE TO NATIVE CACHE for next cold start
    if (stations.length > 0) {
      saveToNativeCache(stations, 'popular');
    }
    
    const items = stationsSlice.map(station => {
      const imgUrl = getArtworkUrl(station);
      return {
        text: station.name,
        detailText: station.country || station.tags?.split(',')[0] || 'Radio',
        image: LOCAL_FALLBACK_LOGO,
        imgUrl: imgUrl,
      };
    });
    
    const template = new ListTemplate({
      title: t('carplay_discover', 'Discover'),
      sections: [{
        header: `${t('carplay_popular_stations', 'Popular Stations')} (${Math.min(stations.length, 50)})`,
        items,
      }],
      onItemSelect: async ({ index }: { index: number }) => {
        const station = stationsSlice[index];
        if (station && playStationCallback) {
          CarPlayLogger.stationSelected(station.name, station._id);
          console.log('[CarPlay] Playing from browse:', station.name);
          try {
            await playStationCallback(station);
            CarPlayLogger.playbackStarted(station.name, station.url_resolved || station.url);
            showNowPlayingTemplate(station);
          } catch (e: any) {
            CarPlayLogger.playbackError(e, station.name);
          }
        }
      },
    });
    
    CarPlayLogger.templateCreated('Browse', { stationCount: Math.min(stations.length, 50) });
    return template;
  } catch (error: any) {
    CarPlayLogger.templateError('Browse', error);
    console.error('[CarPlay] Error creating browse template:', error);
    return null;
  }
};

// Show Now Playing Template - Enhanced with favorite button, Up Next, and proper callbacks
const showNowPlayingTemplate = (station: Station, songTitle?: string, artistName?: string): void => {
  if (!NowPlayingTemplate || !CarPlay) return;
  
  // ANDROID AUTO GUARD: Skip if carContext may not be ready
  if (Platform.OS === 'android' && !isCarPlayConnected) {
    console.log('[CarPlay] Android: skipping NowPlaying - not connected');
    return;
  }
  
  // Track the current station for button callbacks
  currentNowPlayingStation = station;
  
  try {
    // Build buttons array for NowPlaying controls
    // These appear as circular buttons below the main play/pause/skip controls
    const buttons: any[] = [];
    
    // 1. Add-to-library button (heart/favorite toggle) - uses iOS system icon
    buttons.push({
      id: 'toggle-favorite',
      type: 'add-to-library',
    });
    
    // 2. More button - for additional options
    buttons.push({
      id: 'more-options',
      type: 'more',
    });
    
    const nowPlayingTemplate = new NowPlayingTemplate({
      // Enable Up Next button - shows next similar station
      upNextButtonEnabled: true,
      upNextButtonTitle: t('carplay_up_next', 'Up Next'),
      // Disable album artist button - not needed for radio
      albumArtistButtonEnabled: false,
      // Custom buttons
      buttons: buttons,
      // Handle custom button presses
      onButtonPressed: async (e: { id: string; templateId: string }) => {
        console.log('[CarPlay NowPlaying] Button pressed:', e.id);
        CarPlayLogger.info('[RN] NowPlaying button pressed', { buttonId: e.id });
        
        if (e.id === 'toggle-favorite' && currentNowPlayingStation) {
          // Toggle favorite for current station
          if (toggleFavoriteCallback) {
            try {
              await toggleFavoriteCallback(currentNowPlayingStation);
              const stationId = currentNowPlayingStation._id || (currentNowPlayingStation as any).id;
              const isNowFavorite = isFavoriteCallback ? isFavoriteCallback(stationId) : false;
              console.log('[CarPlay NowPlaying] Favorite toggled:', currentNowPlayingStation.name, '-> isFavorite:', isNowFavorite);
              CarPlayLogger.info('[RN] Favorite toggled', { 
                station: currentNowPlayingStation.name, 
                isFavorite: isNowFavorite 
              });
            } catch (err) {
              console.error('[CarPlay NowPlaying] Toggle favorite error:', err);
              CarPlayLogger.error('[RN] Toggle favorite error', { error: String(err) });
            }
          }
        } else if (e.id === 'more-options') {
          console.log('[CarPlay NowPlaying] More options pressed for:', currentNowPlayingStation?.name);
          CarPlayLogger.info('[RN] More options pressed', { station: currentNowPlayingStation?.name });
        }
      },
      // Handle Up Next button press - play next similar station
      onUpNextButtonPressed: async () => {
        console.log('[CarPlay NowPlaying] Up Next pressed');
        CarPlayLogger.info('[RN] Up Next button pressed');
        
        if (getNextStationCallback && playStationCallback) {
          try {
            const nextStation = await getNextStationCallback();
            if (nextStation) {
              console.log('[CarPlay NowPlaying] Playing next station:', nextStation.name);
              CarPlayLogger.info('[RN] Playing next station from Up Next', { station: nextStation.name });
              await playStationCallback(nextStation);
              // Update NowPlaying with new station
              showNowPlayingTemplate(nextStation);
            } else {
              console.log('[CarPlay NowPlaying] No next station available');
              CarPlayLogger.info('[RN] No next station available');
            }
          } catch (err) {
            console.error('[CarPlay NowPlaying] Up Next error:', err);
            CarPlayLogger.error('[RN] Up Next error', { error: String(err) });
          }
        }
      },
    });
    
    CarPlay.pushTemplate(nowPlayingTemplate, true);
    console.log('[CarPlay] Showing enhanced NowPlaying for:', station.name, 
      '| buttons:', buttons.length, 
      '| upNext: enabled');
    CarPlayLogger.info('[RN] NowPlaying template shown', { 
      station: station.name, 
      buttonCount: buttons.length,
      upNextEnabled: true,
    });
  } catch (error) {
    console.error('[CarPlay] Error showing now playing:', error);
    CarPlayLogger.error('[RN] Error showing NowPlaying', { error: String(error) });
  }
};

// Create Search Template for CarPlay
const createSearchTemplate = async (): Promise<any> => {
  if (!SearchTemplate || !ListTemplate) {
    CarPlayLogger.warn('[RN] SearchTemplate or ListTemplate not available');
    return null;
  }
  
  try {
    CarPlayLogger.info('[RN] Creating Search Template');
    
    // Track search results for item selection
    let searchResults: Station[] = [];
    
    const searchTemplate = new SearchTemplate({
      // Called when user types in search field
      onSearch: async (query: string) => {
        CarPlayLogger.info('[RN] Search query received', { query });
        console.log('[CarPlay Search] Query:', query);
        
        if (!query || query.length < 2) {
          searchResults = [];
          return [];
        }
        
        try {
          if (searchStationsCallback) {
            searchResults = await searchStationsCallback(query);
            CarPlayLogger.info('[RN] Search results', { count: searchResults.length, query });
            console.log('[CarPlay Search] Found', searchResults.length, 'stations');
            
            // Return results for display - each item needs text and detailText
            return searchResults.slice(0, 20).map((station: Station) => ({
              text: station.name,
              detailText: station.country || station.tags?.split(',')[0] || 'Radio',
            }));
          } else {
            CarPlayLogger.warn('[RN] searchStationsCallback not available');
            return [];
          }
        } catch (error: any) {
          CarPlayLogger.error('[RN] Search error', { error: String(error), query });
          console.error('[CarPlay Search] Error:', error);
          return [];
        }
      },
      
      // Called when user selects a search result
      onItemSelect: async ({ index }: { index: number }) => {
        CarPlayLogger.info('[RN] Search item selected', { index });
        console.log('[CarPlay Search] Selected index:', index);
        
        const station = searchResults[index];
        if (station && playStationCallback) {
          CarPlayLogger.stationSelected(station.name, station._id);
          console.log('[CarPlay Search] Playing:', station.name);
          try {
            await playStationCallback(station);
            CarPlayLogger.playbackStarted(station.name, station.url_resolved || station.url);
            showNowPlayingTemplate(station);
          } catch (e: any) {
            CarPlayLogger.playbackError(e, station.name);
            console.error('[CarPlay Search] Playback error:', e);
          }
        }
      },
      
      // Optional: Called when search button is pressed
      onSearchButtonPressed: () => {
        CarPlayLogger.info('[RN] Search button pressed');
        console.log('[CarPlay Search] Search button pressed');
      },
    });
    
    CarPlayLogger.templateCreated('Search', {});
    console.log('[CarPlay] Search template created successfully');
    return searchTemplate;
  } catch (error: any) {
    CarPlayLogger.templateError('Search', error);
    console.error('[CarPlay] Error creating search template:', error);
    return null;
  }
};

// Open Search Screen (can be called externally via Siri)
const openSearchScreen = async (): Promise<void> => {
  if (!CarPlay || !SearchTemplate || !isCarPlayConnected) {
    console.log('[CarPlay] Cannot open search - not connected or template not available');
    return;
  }
  
  try {
    const searchTemplate = await createSearchTemplate();
    if (searchTemplate) {
      CarPlay.pushTemplate(searchTemplate, true);
      CarPlayLogger.info('[RN] Search screen pushed via voice command');
      console.log('[CarPlay] Search screen opened');
    }
  } catch (error) {
    console.error('[CarPlay] Error opening search:', error);
  }
};

// Create Root Tab Bar Template
const createRootTemplate = async (): Promise<void> => {
  // ANDROID AUTO GUARD: On Android, the native carContext may not be initialized yet
  // during cold start. The native patch now returns errors gracefully instead of crashing,
  // but we add a JS-side guard to avoid unnecessary error cycles.
  if (Platform.OS === 'android' && CarPlay) {
    try {
      // checkForConnection is safe to call even without carContext
      // If it doesn't throw, the native module is at least loaded
      if (CarPlay?.bridge?.checkForConnection) {
        CarPlay.bridge.checkForConnection();
      }
    } catch (e) {
      console.log('[CarPlay] Android: Native module not ready yet, deferring template creation');
      CarPlayLogger.info('[RN] Android: carContext may not be ready, deferring', { error: String(e) });
      return;
    }
  }

  // CRASH FIX: Prevent concurrent template creation which can cause
  // REASwizzledUIManager race condition with RCTUIManager
  if (isCreatingTemplate) {
    CarPlayLogger.info('[RN] createRootTemplate() QUEUED - already creating template');
    // Mark that a refresh is pending so we rebuild after current creation finishes
    pendingCallbackRefresh = true;
    return;
  }
  
  isCreatingTemplate = true;
  pendingCallbackRefresh = false;
  CarPlayLogger.info('[RN] createRootTemplate() STARTED');
  
  if (!TabBarTemplate || !CarPlay) {
    console.log('[CarPlay] Templates not available');
    CarPlayLogger.error('[RN] Templates NOT AVAILABLE', { 
      TabBarTemplate: !!TabBarTemplate, 
      CarPlay: !!CarPlay,
      ListTemplate: !!ListTemplate,
    });
    // CRITICAL: Release mutex before returning!
    isCreatingTemplate = false;
    return;
  }
  
  try {
    console.log('[CarPlay] Creating root template...');
    CarPlayLogger.info('[RN] Creating root template - fetching data...');
    
    // Create all tab templates with individual error handling
    // NOTE: SearchTemplate CANNOT be added as a tab in Audio category apps
    // iOS CarPlay only allows ListTemplate, GridTemplate, InformationTemplate, NowPlayingTemplate as tabs
    // Search will be added as a list item in Browse tab instead
    CarPlayLogger.info('[RN] Starting Promise.allSettled for all templates');
    const startTime = Date.now();
    
    const results = await Promise.allSettled([
      createFavoritesTemplate(),
      createRecentlyPlayedTemplate(),
      createBrowseTemplate(),
      createGenresTemplate(),
      // SearchTemplate removed from tabs - not allowed in Audio apps
    ]);
    
    const duration = Date.now() - startTime;
    CarPlayLogger.info('[RN] Promise.allSettled completed', { durationMs: duration });
    
    const [favoritesResult, recentResult, browseResult, genresResult] = results;
    
    const favoritesTemplate = favoritesResult.status === 'fulfilled' ? favoritesResult.value : null;
    const recentTemplate = recentResult.status === 'fulfilled' ? recentResult.value : null;
    const browseTemplate = browseResult.status === 'fulfilled' ? browseResult.value : null;
    const genresTemplate = genresResult.status === 'fulfilled' ? genresResult.value : null;
    
    CarPlayLogger.info('[RN] Template creation results', {
      favorites: favoritesResult.status,
      recent: recentResult.status,
      browse: browseResult.status,
      genres: genresResult.status,
    });
    
    // Log any failures
    if (favoritesResult.status === 'rejected') {
      console.error('[CarPlay] Favorites template failed:', favoritesResult.reason);
      CarPlayLogger.error('[RN] Favorites template FAILED', { error: String(favoritesResult.reason) });
    }
    if (recentResult.status === 'rejected') {
      console.error('[CarPlay] Recent template failed:', recentResult.reason);
      CarPlayLogger.error('[RN] Recent template FAILED', { error: String(recentResult.reason) });
    }
    if (browseResult.status === 'rejected') {
      console.error('[CarPlay] Browse template failed:', browseResult.reason);
      CarPlayLogger.error('[RN] Browse template FAILED', { error: String(browseResult.reason) });
    }
    if (genresResult.status === 'rejected') {
      console.error('[CarPlay] Genres template failed:', genresResult.reason);
      CarPlayLogger.error('[RN] Genres template FAILED', { error: String(genresResult.reason) });
    }
    
    // Build tabs array with available templates
    const templates: any[] = [];
    
    if (browseTemplate) {
      browseTemplate.tabTitle = t('carplay_discover', 'Discover');
      browseTemplate.tabSystemImageName = 'music.note.list';
      templates.push(browseTemplate);
      CarPlayLogger.info('[RN] Browse tab added');
    }
    
    // NOTE: SearchTemplate removed - not allowed as tab in Audio apps
    // Search is triggered via Siri voice commands or programmatically
    
    if (favoritesTemplate) {
      favoritesTemplate.tabTitle = t('carplay_favorites', 'Favorites');
      favoritesTemplate.tabSystemImageName = 'heart.fill';
      templates.push(favoritesTemplate);
      CarPlayLogger.info('[RN] Favorites tab added');
    }
    
    if (recentTemplate) {
      recentTemplate.tabTitle = t('carplay_recently_played', 'Recently Played');
      recentTemplate.tabSystemImageName = 'clock.fill';
      templates.push(recentTemplate);
      CarPlayLogger.info('[RN] Recent tab added');
    }
    
    if (genresTemplate) {
      genresTemplate.tabTitle = t('carplay_genres', 'Genres');
      genresTemplate.tabSystemImageName = 'square.grid.2x2.fill';
      templates.push(genresTemplate);
      CarPlayLogger.info('[RN] Genres tab added');
    }
    
    CarPlayLogger.info('[RN] Total tabs created', { tabCount: templates.length });
    
    if (templates.length === 0) {
      console.log('[CarPlay] No templates available - showing fallback');
      CarPlayLogger.warn('[RN] NO TEMPLATES AVAILABLE - showing fallback', {
        favoritesTemplate: !!favoritesTemplate,
        recentTemplate: !!recentTemplate,
        browseTemplate: !!browseTemplate,
        genresTemplate: !!genresTemplate,
      });
      // Create a simple fallback list template
      if (ListTemplate) {
        const fallbackTemplate = new ListTemplate({
          title: 'MegaRadio',
          sections: [{
            header: t('carplay_loading', 'Loading...'),
            items: [{
              text: t('carplay_loading', 'Loading...'),
              detailText: 'Lütfen bekleyin',
            }],
          }],
        });
        CarPlay.setRootTemplate(fallbackTemplate, true);
        CarPlayLogger.warn('[RN] Fallback template SET');
      }
      // CRITICAL: Release mutex before returning!
      isCreatingTemplate = false;
      return;
    }
    
    // Create tab bar
    CarPlayLogger.info('[RN] Creating TabBarTemplate with tabs', { tabCount: templates.length });
    const tabBarTemplate = new TabBarTemplate({
      templates: templates,
      onTemplateSelect: (selectedTemplate: any, selectedIndex: number) => {
        console.log('[CarPlay] Tab selected:', selectedIndex);
        CarPlayLogger.info('[RN] Tab selected', { index: selectedIndex });
      },
    });
    
    // Set as root template
    CarPlayLogger.info('[RN] Calling CarPlay.setRootTemplate()...');
    try {
      CarPlay.setRootTemplate(tabBarTemplate, true);
      console.log('[CarPlay] Root template set successfully with', templates.length, 'tabs');
      CarPlayLogger.info('[RN] ROOT TEMPLATE SET SUCCESSFULLY', { 
        tabCount: templates.length,
        tabs: templates.map((t, i) => t.tabTitle || `Tab ${i}`)
      });
    } catch (setRootError: any) {
      CarPlayLogger.error('[RN] setRootTemplate FAILED', { error: String(setRootError) });
      console.error('[CarPlay] setRootTemplate failed:', setRootError);
    }
    
    // Release mutex after template creation (success or setRootTemplate failure)
    isCreatingTemplate = false;
    
    // COLD START FIX: If callbacks were updated while we were creating,
    // rebuild templates with the new callbacks (e.g., real playStation)
    if (pendingCallbackRefresh) {
      CarPlayLogger.info('[RN] Pending callback refresh detected - rebuilding templates');
      pendingCallbackRefresh = false;
      // Small delay to avoid rapid successive template changes
      setTimeout(() => {
        createRootTemplate().catch((err) => {
          CarPlayLogger.error('[RN] Pending refresh createRootTemplate FAILED', { error: String(err) });
        });
      }, 500);
    }
    
  } catch (error: any) {
    console.error('[CarPlay] Error creating root template:', error);
    CarPlayLogger.error('[RN] FATAL ERROR in createRootTemplate', { 
      error: String(error),
      message: error?.message,
      stack: error?.stack?.substring(0, 500)
    });
    // Release mutex on error as well
    isCreatingTemplate = false;
    
    // Even on error, retry if callbacks were updated
    if (pendingCallbackRefresh) {
      CarPlayLogger.info('[RN] Pending callback refresh after error - retrying');
      pendingCallbackRefresh = false;
      setTimeout(() => {
        createRootTemplate().catch(() => {});
      }, 1000);
    }
  }
};

// CarPlay Service
const CarPlayService: CarPlayServiceType = {
  isConnected: false,
  
  initialize: (
    playStation,
    getStations,
    getFavorites,
    getRecentlyPlayed,
    getGenres,
    getStationsByGenre,
    searchStations,
    toggleFavorite,
    isFavorite,
    getNextStation,
    getPreviousStation
  ) => {
    if (Platform.OS === 'web') {
      console.log('[CarPlayService] Not available on web platform');
      return;
    }
    
    if (!CarPlay) {
      console.log('[CarPlayService] CarPlay module not loaded');
      CarPlayLogger.start();
      CarPlayLogger.error('CarPlay module NOT LOADED in React Native', {
        platform: Platform.OS,
        carPlayModule: null,
        possibleCauses: [
          '1. react-native-carplay not installed',
          '2. Pod not linked correctly', 
          '3. Native module not compiled'
        ]
      });
      return;
    }
    
    console.log('[CarPlayService] ===== INITIALIZING =====');
    CarPlayLogger.start();
    CarPlayLogger.serviceInitializing();
    CarPlayLogger.info('[RN] CarPlay service INITIALIZING', {
      platform: Platform.OS,
      carPlayAvailable: !!CarPlay,
      carPlayMethods: CarPlay ? Object.keys(CarPlay) : [],
      listTemplateAvailable: !!ListTemplate,
      tabBarTemplateAvailable: !!TabBarTemplate,
      gridTemplateAvailable: !!GridTemplate,
      searchTemplateAvailable: !!SearchTemplate,
      nowPlayingTemplateAvailable: !!NowPlayingTemplate,
      pendingConnection: pendingConnection,
      handlersAlreadyRegistered: handlersRegistered,
    });
    
    // Store callbacks
    playStationCallback = playStation;
    getStationsCallback = getStations;
    getFavoritesCallback = getFavorites;
    getRecentlyPlayedCallback = getRecentlyPlayed;
    getGenresCallback = getGenres;
    getStationsByGenreCallback = getStationsByGenre;
    searchStationsCallback = searchStations || null;
    toggleFavoriteCallback = toggleFavorite || null;
    isFavoriteCallback = isFavorite || null;
    getNextStationCallback = getNextStation || null;
    getPreviousStationCallback = getPreviousStation || null;
    
    CarPlayLogger.info('[RN] Callbacks registered', {
      playStation: !!playStation,
      getStations: !!getStations,
      getFavorites: !!getFavorites,
      getRecentlyPlayed: !!getRecentlyPlayed,
      getGenres: !!getGenres,
      getStationsByGenre: !!getStationsByGenre,
      searchStations: !!searchStations,
      toggleFavorite: !!toggleFavorite,
      isFavorite: !!isFavorite,
      getNextStation: !!getNextStation,
      getPreviousStation: !!getPreviousStation,
    });
    
    // Re-register handlers with full callbacks now that we have them
    console.log('[CarPlayService] Re-registering onConnect handler with callbacks...');
    CarPlayLogger.info('[RN] Re-registering onConnect handler (with callbacks)');
    
    CarPlay.registerOnConnect(() => {
      console.log('[CarPlay] ========== CONNECTED (React Native callback) ==========');
      CarPlayLogger.connected({ 
        timestamp: new Date().toISOString(),
        event: '[RN] registerOnConnect callback FIRED',
        nextStep: 'Creating root template...'
      });
      isCarPlayConnected = true;
      CarPlayService.isConnected = true;
      pendingConnection = false;
      
      // Create and show root template
      // ANDROID AUTO FIX: Add a small delay on Android to allow carContext to fully initialize
      // The onConnect event can fire before carContext is set in CarPlayModule.setCarContext()
      const templateDelay = Platform.OS === 'android' ? 500 : 0;
      
      CarPlayLogger.info('[RN] About to call createRootTemplate()', { delayMs: templateDelay });
      
      const doCreateTemplate = () => {
        createRootTemplate().then(() => {
          CarPlayLogger.info('[RN] createRootTemplate() completed');
        }).catch((err) => {
          CarPlayLogger.error('[RN] createRootTemplate() FAILED', {
            error: String(err),
            stack: err?.stack?.substring(0, 500)
          });
        });
      };
      
      if (templateDelay > 0) {
        setTimeout(doCreateTemplate, templateDelay);
      } else {
        doCreateTemplate();
      }
    });
    
    // Register CarPlay disconnection handler
    console.log('[CarPlayService] Registering onDisconnect handler...');
    CarPlayLogger.info('[RN] Registering onDisconnect handler');
    
    CarPlay.registerOnDisconnect(() => {
      console.log('[CarPlay] ========== DISCONNECTED (React Native callback) ==========');
      CarPlayLogger.disconnected({ 
        timestamp: new Date().toISOString(),
        event: '[RN] registerOnDisconnect callback FIRED',
      });
      isCarPlayConnected = false;
      CarPlayService.isConnected = false;
      pendingConnection = false;
    });
    
    CarPlayLogger.info('[RN] Connection handlers registered successfully');
    
    // CRITICAL: Check if CarPlay was already connected before we registered
    // This handles the race condition where CarPlay connects before JS initializes
    const alreadyConnected = CarPlay.connected || pendingConnection;
    CarPlayLogger.info('[RN] Checking if already connected', { 
      alreadyConnected,
      carPlayConnectedProperty: CarPlay.connected,
      pendingConnection: pendingConnection,
      carPlayType: typeof CarPlay.connected,
    });
    
    if (alreadyConnected) {
      console.log('[CarPlay] Already connected - creating root template immediately');
      CarPlayLogger.alreadyConnected();
      CarPlayLogger.info('[RN] CarPlay was ALREADY CONNECTED - creating template now');
      isCarPlayConnected = true;
      CarPlayService.isConnected = true;
      pendingConnection = false;
      
      // ANDROID AUTO FIX: Delay template creation on Android to allow carContext initialization
      const templateDelay = Platform.OS === 'android' ? 800 : 0;
      
      const doCreate = () => {
        createRootTemplate().then(() => {
          CarPlayLogger.info('[RN] createRootTemplate() completed (already connected case)');
        }).catch((err) => {
          CarPlayLogger.error('[RN] createRootTemplate() FAILED (already connected case)', {
            error: String(err),
            stack: err?.stack?.substring(0, 500)
          });
        });
      };
      
      if (templateDelay > 0) {
        setTimeout(doCreate, templateDelay);
      } else {
        doCreate();
      }
    }
    
    CarPlayLogger.serviceInitialized();
    CarPlayLogger.info('[RN] CarPlay service INITIALIZED - waiting for connection');
    console.log('[CarPlayService] Initialized and waiting for connection');
    
    // COLD-START FIX: Start periodic check for CarPlay connection AND template health
    // Handles TWO scenarios:
    // 1. CarPlay connects before React Native is ready (original cold-start fix)
    // 2. createRootTemplate() fails after connection (NEW: watchdog retry)
    if (!coldStartRetryTimer) {
      CarPlayLogger.info('[RN] Starting cold-start retry timer with checkForConnection polling + watchdog');
      coldStartRetryTimer = setInterval(() => {
        coldStartRetryCount++;
        
        // CRITICAL: Call checkForConnection() again - this may now succeed
        try {
          if (CarPlay?.bridge?.checkForConnection) {
            CarPlay.bridge.checkForConnection();
          }
        } catch (e) {
          // Ignore errors
        }
        
        // Check if CarPlay is now connected
        const nowConnected = CarPlay?.connected || pendingConnection;
        
        CarPlayLogger.info('[RN] Cold-start check', {
          attempt: coldStartRetryCount,
          maxAttempts: MAX_COLD_START_RETRIES,
          isConnected: isCarPlayConnected,
          carPlayConnected: nowConnected,
          hasCallbacks: !!playStationCallback,
          isCreatingTemplate,
        });
        
        // SCENARIO 1: Connected but not yet initialized
        if (nowConnected && !isCarPlayConnected && playStationCallback) {
          CarPlayLogger.info('[RN] Cold-start: CarPlay connected but not initialized, creating template...');
          isCarPlayConnected = true;
          CarPlayService.isConnected = true;
          pendingConnection = false;
          
          createRootTemplate().then(() => {
            CarPlayLogger.info('[RN] Cold-start: createRootTemplate() completed');
            if (coldStartRetryTimer) {
              clearInterval(coldStartRetryTimer);
              coldStartRetryTimer = null;
            }
          }).catch((err) => {
            CarPlayLogger.error('[RN] Cold-start: createRootTemplate() FAILED', { error: String(err) });
          });
        }
        
        // SCENARIO 2 (NEW): Already connected + initialized but template may have failed
        // This is a WATCHDOG: if CarPlay is connected but still showing loading/empty,
        // retry template creation. This fixes the "blank screen" issue.
        if (isCarPlayConnected && playStationCallback && !isCreatingTemplate) {
          // Only retry on specific intervals (every 3 seconds: attempts 6, 12, 18, 24, 30)
          if (coldStartRetryCount % 6 === 0) {
            CarPlayLogger.info('[RN] Watchdog: Re-creating root template (attempt ' + coldStartRetryCount + ')');
            createRootTemplate().then(() => {
              CarPlayLogger.info('[RN] Watchdog: createRootTemplate() completed');
              // Stop retry after successful watchdog
              if (coldStartRetryTimer) {
                clearInterval(coldStartRetryTimer);
                coldStartRetryTimer = null;
              }
            }).catch((err) => {
              CarPlayLogger.error('[RN] Watchdog: createRootTemplate() FAILED', { error: String(err) });
            });
          }
        }
        
        // Stop after max retries
        if (coldStartRetryCount >= MAX_COLD_START_RETRIES) {
          CarPlayLogger.info('[RN] Cold-start: Max retries reached, stopping timer');
          if (coldStartRetryTimer) {
            clearInterval(coldStartRetryTimer);
            coldStartRetryTimer = null;
          }
        }
      }, COLD_START_RETRY_INTERVAL);
    }
    
    // Subscribe to language changes - refresh templates when language changes
    if (!languageListenerUnsubscribe) {
      languageListenerUnsubscribe = addLanguageChangeListener((newLang) => {
        CarPlayLogger.info('[RN] Language changed to', { lang: newLang });
        needsTemplateRefresh = true;
        
        // If currently connected, refresh templates
        if (isCarPlayConnected && CarPlay) {
          CarPlayLogger.info('[RN] Refreshing CarPlay templates for new language');
          createRootTemplate().catch((err) => {
            CarPlayLogger.error('[RN] Failed to refresh templates', { error: String(err) });
          });
        }
      });
    }
  },
  
  updateNowPlaying: (station, songTitle, artistName) => {
    if (!isCarPlayConnected) return;
    
    // Track the current station for NowPlaying button callbacks
    currentNowPlayingStation = station;
    
    console.log('[CarPlay] Updating now playing:', station.name, songTitle, artistName);
    CarPlayLogger.nowPlayingUpdated(station.name, songTitle, artistName);
  },
  
  disconnect: () => {
    console.log('[CarPlayService] Disconnecting...');
    CarPlayLogger.serviceDisconnecting();
    CarPlayLogger.flush();
    CarPlayLogger.stop();
    
    // Stop cold-start retry timer
    if (coldStartRetryTimer) {
      clearInterval(coldStartRetryTimer);
      coldStartRetryTimer = null;
    }
    coldStartRetryCount = 0;
    
    // Unsubscribe from language changes
    if (languageListenerUnsubscribe) {
      languageListenerUnsubscribe();
      languageListenerUnsubscribe = null;
    }
    
    playStationCallback = null;
    getStationsCallback = null;
    getFavoritesCallback = null;
    getRecentlyPlayedCallback = null;
    getGenresCallback = null;
    getStationsByGenreCallback = null;
    searchStationsCallback = null;
    toggleFavoriteCallback = null;
    isFavoriteCallback = null;
    getNextStationCallback = null;
    getPreviousStationCallback = null;
    currentNowPlayingStation = null;
    isCarPlayConnected = false;
    CarPlayService.isConnected = false;
    pendingConnection = false;
    needsTemplateRefresh = false;
  },
  
  // Open Search Screen - can be triggered by Siri voice command
  openSearch: openSearchScreen,
  
  /**
   * Refresh all CarPlay templates
   * Call this when app state changes (country, favorites, recently played)
   */
  refreshTemplates: async (): Promise<void> => {
    if (!isCarPlayConnected || !CarPlay) {
      console.log('[CarPlayService] Cannot refresh - not connected');
      return;
    }
    
    console.log('[CarPlayService] Refreshing all templates...');
    CarPlayLogger.info('[RN] Manual template refresh requested');
    
    try {
      await createRootTemplate();
      console.log('[CarPlayService] Templates refreshed successfully');
      CarPlayLogger.info('[RN] Templates refreshed successfully');
    } catch (err) {
      console.error('[CarPlayService] Failed to refresh templates:', err);
      CarPlayLogger.error('[RN] Failed to refresh templates', { error: String(err) });
    }
  },
  
  /**
   * Refresh only the Favorites tab template
   */
  refreshFavorites: async (): Promise<void> => {
    if (!isCarPlayConnected || !CarPlay || !TabBarTemplate) {
      console.log('[CarPlayService] Cannot refresh favorites - not connected or no TabBarTemplate');
      return;
    }
    
    console.log('[CarPlayService] Refreshing favorites template...');
    CarPlayLogger.info('[RN] Refreshing favorites template');
    
    try {
      const favTemplate = await createFavoritesTemplate();
      if (favTemplate) {
        // Full refresh since individual tab update may not be supported
        await createRootTemplate();
      }
    } catch (err) {
      console.error('[CarPlayService] Failed to refresh favorites:', err);
    }
  },
  
  /**
   * Refresh only the Recently Played tab template  
   */
  refreshRecentlyPlayed: async (): Promise<void> => {
    if (!isCarPlayConnected || !CarPlay) {
      console.log('[CarPlayService] Cannot refresh recently played - not connected');
      return;
    }
    
    console.log('[CarPlayService] Refreshing recently played template...');
    CarPlayLogger.info('[RN] Refreshing recently played template');
    
    try {
      // Full refresh since individual tab update may not be supported
      await createRootTemplate();
    } catch (err) {
      console.error('[CarPlayService] Failed to refresh recently played:', err);
    }
  },
};

export default CarPlayService;

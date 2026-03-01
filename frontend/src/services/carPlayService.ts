// CarPlay & Android Auto Service
// Handles connection events and template management for in-car displays

import { Platform } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import CarPlayLogger from './carPlayLogService';
import i18n, { addLanguageChangeListener } from './i18nService';

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

// Track if we've already registered handlers (prevent duplicates)
let handlersRegistered = false;

// Queue for pending operations when CarPlay connects before service is initialized
let pendingConnection = false;

// Cold-start retry mechanism
let coldStartRetryCount = 0;
const MAX_COLD_START_RETRIES = 15;
const COLD_START_RETRY_INTERVAL = 2000; // 2 seconds
let coldStartRetryTimer: ReturnType<typeof setInterval> | null = null;

// Mutex to prevent concurrent template creation (crash fix)
let isCreatingTemplate = false;

if (Platform.OS !== 'web') {
  try {
    const carplayModule = require('@g4rb4g3/react-native-carplay');
    CarPlay = carplayModule.CarPlay;
    ListTemplate = carplayModule.ListTemplate;
    TabBarTemplate = carplayModule.TabBarTemplate;
    NowPlayingTemplate = carplayModule.NowPlayingTemplate;
    GridTemplate = carplayModule.GridTemplate;
    
    CarPlayLogger.moduleLoaded('react-native-carplay', true);
    CarPlayLogger.info('CarPlay modules loaded', {
      CarPlay: !!CarPlay,
      ListTemplate: !!ListTemplate,
      TabBarTemplate: !!TabBarTemplate,
      NowPlayingTemplate: !!NowPlayingTemplate,
      GridTemplate: !!GridTemplate,
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
    getStationsByGenre: (genre: string) => Promise<Station[]>
  ) => void;
  updateNowPlaying: (station: Station, songTitle?: string, artistName?: string) => void;
  disconnect: () => void;
}

// Global state
let isCarPlayConnected = false;
let playStationCallback: ((station: Station) => Promise<void>) | null = null;
let getStationsCallback: (() => Promise<Station[]>) | null = null;
let getFavoritesCallback: (() => Promise<Station[]>) | null = null;
let getRecentlyPlayedCallback: (() => Promise<Station[]>) | null = null;
let getGenresCallback: (() => Promise<{ name: string; count: number }[]>) | null = null;
let getStationsByGenreCallback: ((genre: string) => Promise<Station[]>) | null = null;

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

// Synchronous helper for immediate use (no caching, just returns URL for non-CarPlay use)
const getStationImageSync = (station: Station): { uri: string } => {
  // Default fallback - MegaRadio pink logo
  const FALLBACK_LOGO = 'https://themegaradio.com/logo.png';
  
  try {
    // Priority 1: logoAssets (best quality, our CDN)
    if (station.logoAssets?.webp96 && station.logoAssets?.folder) {
      return { uri: `https://themegaradio.com/station-logos/${station.logoAssets.folder}/${station.logoAssets.webp96}` };
    }
    
    // Priority 2: favicon (most common)
    if (station.favicon && typeof station.favicon === 'string' && station.favicon.trim()) {
      const favicon = station.favicon.trim();
      if (favicon !== 'null' && favicon !== 'undefined') {
        if (favicon.startsWith('http')) {
          return { uri: favicon.replace('http://', 'https://') };
        } else if (favicon.startsWith('/')) {
          return { uri: `https://themegaradio.com${favicon}` };
        }
      }
    }
    
    // Priority 3: logo
    if (station.logo && typeof station.logo === 'string' && station.logo.trim()) {
      const logo = station.logo.trim();
      if (logo !== 'null' && logo !== 'undefined') {
        if (logo.startsWith('http')) {
          return { uri: logo.replace('http://', 'https://') };
        } else if (logo.startsWith('/')) {
          return { uri: `https://themegaradio.com${logo}` };
        }
      }
    }
  } catch (e) {
    console.log('[CarPlay] Error getting station image:', e);
  }
  
  // Fallback: MegaRadio pink logo
  return { uri: FALLBACK_LOGO };
};

// Legacy helper (string version) for backward compatibility and CarPlay imgUrl
const getArtworkUrl = (station: Station): string => {
  // Default fallback - MegaRadio pink logo
  const FALLBACK_LOGO = 'https://themegaradio.com/logo.png';
  
  try {
    // Priority 1: logoAssets (best quality, our CDN)
    if (station.logoAssets?.webp96 && station.logoAssets?.folder) {
      return `https://themegaradio.com/station-logos/${station.logoAssets.folder}/${station.logoAssets.webp96}`;
    }
    
    // Priority 2: favicon
    if (station.favicon && typeof station.favicon === 'string' && station.favicon.trim()) {
      const favicon = station.favicon.trim();
      if (favicon !== 'null' && favicon !== 'undefined') {
        if (favicon.startsWith('http')) {
          return favicon.replace('http://', 'https://');
        } else if (favicon.startsWith('/')) {
          return `https://themegaradio.com${favicon}`;
        }
      }
    }
    
    // Priority 3: logo
    if (station.logo && typeof station.logo === 'string' && station.logo.trim()) {
      const logo = station.logo.trim();
      if (logo !== 'null' && logo !== 'undefined') {
        if (logo.startsWith('http')) {
          return logo.replace('http://', 'https://');
        } else if (logo.startsWith('/')) {
          return `https://themegaradio.com${logo}`;
        }
      }
    }
  } catch (e) {
    console.log('[CarPlay] Error getting artwork URL:', e);
  }
  
  // Fallback: MegaRadio pink logo
  return FALLBACK_LOGO;
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
    const favorites = await getFavoritesCallback();
    CarPlayLogger.dataLoaded('favorites', favorites.length);
    
    // Build items with imgUrl for async native image loading
    // Native iOS uses imgUrl property to download images asynchronously
    const items = favorites.map(station => {
      const imgUrl = getArtworkUrl(station);
      return {
        text: station.name,
        detailText: station.country || station.tags?.split(',')[0] || 'Radio',
        imgUrl: imgUrl, // Native will download this asynchronously
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
    const recentStations = await getRecentlyPlayedCallback();
    CarPlayLogger.dataLoaded('recentlyPlayed', recentStations.length);
    
    // Build items with imgUrl for async native image loading
    const items = recentStations.map(station => {
      const imgUrl = getArtworkUrl(station);
      return {
        text: station.name,
        detailText: station.country || station.tags?.split(',')[0] || 'Radio',
        imgUrl: imgUrl, // Native will download this asynchronously
      };
    });
    
    const template = new ListTemplate({
      title: t('carplay_recently_played', 'Recently Played'),
      sections: [{
        header: `${t('carplay_recent_stations', 'Recent Stations')} (${recentStations.length})`,
        items,
      }],
      onItemSelect: async ({ index }: { index: number }) => {
        const station = recentStations[index];
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
    
    CarPlayLogger.templateCreated('RecentlyPlayed', { itemCount: recentStations.length });
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
    const genres = await getGenresCallback();
    CarPlayLogger.dataLoaded('genres', genres.length);
    
    // If GridTemplate is available, use grid layout with SF Symbols
    if (GridTemplate) {
      console.log('[CarPlay] Using GridTemplate for genres with SF Symbols');
      
      // Grid items with SF Symbol icons
      const gridButtons = genres.slice(0, 40).map((genre, index) => {
        const sfSymbol = getGenreSFSymbol(genre.name);
        return {
          id: `genre_${index}`,
          titleVariants: [genre.name],
          // Use systemImageName for SF Symbols (native iOS icons)
          image: { 
            systemImageName: sfSymbol,
          },
        };
      });
      
      const template = new GridTemplate({
        title: t('carplay_genres', 'Genres'),
        buttons: gridButtons,
        onButtonPressed: async (button: { id: string }) => {
          const index = parseInt(button.id.replace('genre_', ''), 10);
          const genre = genres[index];
          if (genre) {
            CarPlayLogger.info('Genre selected (grid)', { genre: genre.name });
            console.log('[CarPlay] Genre selected from grid:', genre.name);
            await showGenreStationsTemplate(genre.name);
          }
        },
      });
      
      CarPlayLogger.templateCreated('Genres (Grid)', { genreCount: Math.min(genres.length, 40) });
      return template;
    }
    
    // Fallback to ListTemplate with SF Symbols
    console.log('[CarPlay] Using ListTemplate for genres (GridTemplate not available)');
    
    const template = new ListTemplate({
      title: t('carplay_genres', 'Genres'),
      sections: [{
        header: `${t('carplay_music_genres', 'Music Genres')} (${Math.min(genres.length, 40)})`,
        items: genres.slice(0, 40).map(genre => {
          const sfSymbol = getGenreSFSymbol(genre.name);
          return {
            text: genre.name,
            detailText: `${genre.count} ${t('carplay_stations', 'stations')}`,
            image: { systemImageName: sfSymbol },
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
    return;
  }
  
  try {
    CarPlayLogger.dataLoading(`genreStations-${genre}`);
    const stations = await getStationsByGenreCallback(genre);
    CarPlayLogger.dataLoaded(`genreStations-${genre}`, stations.length);
    
    // Build items with imgUrl for async native image loading (max 50)
    const items = stations.slice(0, 50).map(station => {
      const imgUrl = getArtworkUrl(station);
      return {
        text: station.name,
        detailText: station.country || 'Radio',
        imgUrl: imgUrl, // Native will download this asynchronously
      };
    });
    
    const template = new ListTemplate({
      title: genre,
      sections: [{
        header: `${genre} (${Math.min(stations.length, 50)})`,
        items,
      }],
      onItemSelect: async ({ index }: { index: number }) => {
        const station = stations[index];
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
    const stations = await getStationsCallback();
    CarPlayLogger.dataLoaded('popularStations', stations.length);
    
    // Build items with imgUrl for async native image loading (max 50)
    const items = stations.slice(0, 50).map(station => {
      const imgUrl = getArtworkUrl(station);
      return {
        text: station.name,
        detailText: station.country || station.tags?.split(',')[0] || 'Radio',
        imgUrl: imgUrl, // Native will download this asynchronously
      };
    });
    
    const template = new ListTemplate({
      title: t('carplay_discover', 'Discover'),
      sections: [{
        header: `${t('carplay_popular_stations', 'Popular Stations')} (${Math.min(stations.length, 50)})`,
        items,
      }],
      onItemSelect: async ({ index }: { index: number }) => {
        const station = stations[index];
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

// Show Now Playing Template
const showNowPlayingTemplate = (station: Station, songTitle?: string, artistName?: string): void => {
  if (!NowPlayingTemplate || !CarPlay) return;
  
  try {
    const nowPlayingTemplate = new NowPlayingTemplate({
      albumArtistButtonEnabled: false,
      upNextButtonEnabled: false,
      buttons: [],
    });
    
    CarPlay.pushTemplate(nowPlayingTemplate, true);
    console.log('[CarPlay] Showing Now Playing for:', station.name);
  } catch (error) {
    console.error('[CarPlay] Error showing now playing:', error);
  }
};

// Create Root Tab Bar Template
const createRootTemplate = async (): Promise<void> => {
  CarPlayLogger.info('[RN] createRootTemplate() STARTED');
  
  if (!TabBarTemplate || !CarPlay) {
    console.log('[CarPlay] Templates not available');
    CarPlayLogger.error('[RN] Templates NOT AVAILABLE', { 
      TabBarTemplate: !!TabBarTemplate, 
      CarPlay: !!CarPlay,
      ListTemplate: !!ListTemplate,
    });
    return;
  }
  
  try {
    console.log('[CarPlay] Creating root template...');
    CarPlayLogger.info('[RN] Creating root template - fetching data...');
    
    // Create all tab templates with individual error handling
    CarPlayLogger.info('[RN] Starting Promise.allSettled for all templates');
    const startTime = Date.now();
    
    const results = await Promise.allSettled([
      createFavoritesTemplate(),
      createRecentlyPlayedTemplate(),
      createBrowseTemplate(),
      createGenresTemplate(),
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
    CarPlay.setRootTemplate(tabBarTemplate, true);
    console.log('[CarPlay] Root template set successfully with', templates.length, 'tabs');
    CarPlayLogger.info('[RN] ROOT TEMPLATE SET SUCCESSFULLY', { 
      tabCount: templates.length,
      tabs: templates.map((t, i) => t.tabTitle || `Tab ${i}`)
    });
    
  } catch (error: any) {
    console.error('[CarPlay] Error creating root template:', error);
    CarPlayLogger.error('[RN] FATAL ERROR in createRootTemplate', { 
      error: String(error),
      message: error?.message,
      stack: error?.stack?.substring(0, 500)
    });
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
    getStationsByGenre
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
    
    CarPlayLogger.info('[RN] Callbacks registered', {
      playStation: !!playStation,
      getStations: !!getStations,
      getFavorites: !!getFavorites,
      getRecentlyPlayed: !!getRecentlyPlayed,
      getGenres: !!getGenres,
      getStationsByGenre: !!getStationsByGenre,
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
      CarPlayLogger.info('[RN] About to call createRootTemplate()');
      createRootTemplate().then(() => {
        CarPlayLogger.info('[RN] createRootTemplate() completed');
      }).catch((err) => {
        CarPlayLogger.error('[RN] createRootTemplate() FAILED', {
          error: String(err),
          stack: err?.stack?.substring(0, 500)
        });
      });
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
      
      createRootTemplate().then(() => {
        CarPlayLogger.info('[RN] createRootTemplate() completed (already connected case)');
      }).catch((err) => {
        CarPlayLogger.error('[RN] createRootTemplate() FAILED (already connected case)', {
          error: String(err),
          stack: err?.stack?.substring(0, 500)
        });
      });
    }
    
    CarPlayLogger.serviceInitialized();
    CarPlayLogger.info('[RN] CarPlay service INITIALIZED - waiting for connection');
    console.log('[CarPlayService] Initialized and waiting for connection');
    
    // COLD-START FIX: Start periodic check for CarPlay connection
    // This handles the case where CarPlay connects before React Native is fully ready
    if (!coldStartRetryTimer) {
      CarPlayLogger.info('[RN] Starting cold-start retry timer');
      coldStartRetryTimer = setInterval(() => {
        coldStartRetryCount++;
        
        // Check if CarPlay is now connected
        const nowConnected = CarPlay?.connected || pendingConnection;
        
        CarPlayLogger.info('[RN] Cold-start check', {
          attempt: coldStartRetryCount,
          maxAttempts: MAX_COLD_START_RETRIES,
          isConnected: isCarPlayConnected,
          carPlayConnected: nowConnected,
          hasCallbacks: !!playStationCallback,
        });
        
        // If connected but template not created, try again
        if (nowConnected && !isCarPlayConnected && playStationCallback) {
          CarPlayLogger.info('[RN] Cold-start: CarPlay connected but not initialized, creating template...');
          isCarPlayConnected = true;
          CarPlayService.isConnected = true;
          pendingConnection = false;
          
          createRootTemplate().then(() => {
            CarPlayLogger.info('[RN] Cold-start: createRootTemplate() completed');
            // Stop retry timer on success
            if (coldStartRetryTimer) {
              clearInterval(coldStartRetryTimer);
              coldStartRetryTimer = null;
            }
          }).catch((err) => {
            CarPlayLogger.error('[RN] Cold-start: createRootTemplate() FAILED', {
              error: String(err),
            });
          });
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
    isCarPlayConnected = false;
    CarPlayService.isConnected = false;
    pendingConnection = false;
    needsTemplateRefresh = false;
  },
  
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
      if (favTemplate && rootTabBarTemplate) {
        // Update the favorites tab in the existing tab bar
        // Note: Some versions of react-native-carplay may require full refresh
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

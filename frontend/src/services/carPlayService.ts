// CarPlay & Android Auto Service
// Handles connection events and template management for in-car displays

import { Platform } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import CarPlayLogger from './carPlayLogService';

// Only import CarPlay on native platforms
let CarPlay: any = null;
let ListTemplate: any = null;
let TabBarTemplate: any = null;
let NowPlayingTemplate: any = null;
let GridTemplate: any = null;

if (Platform.OS !== 'web') {
  try {
    const carplayModule = require('@g4rb4g3/react-native-carplay');
    CarPlay = carplayModule.CarPlay;
    ListTemplate = carplayModule.ListTemplate;
    TabBarTemplate = carplayModule.TabBarTemplate;
    NowPlayingTemplate = carplayModule.NowPlayingTemplate;
    GridTemplate = carplayModule.GridTemplate;
  } catch (e) {
    console.log('[CarPlayService] CarPlay module not available:', e);
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

// Helper to get station artwork
const getArtworkUrl = (station: Station): string => {
  if (station.logo && station.logo.startsWith('http')) {
    return station.logo.replace('http://', 'https://');
  }
  if (station.favicon && station.favicon.startsWith('http')) {
    return station.favicon.replace('http://', 'https://');
  }
  if (station.logo && station.logo.startsWith('/')) {
    return `https://themegaradio.com${station.logo}`;
  }
  return 'https://themegaradio.com/logo.png';
};

// Create Favorites List Template
const createFavoritesTemplate = async (): Promise<any> => {
  if (!ListTemplate || !getFavoritesCallback) return null;
  
  try {
    const favorites = await getFavoritesCallback();
    
    return new ListTemplate({
      title: 'Favoriler',
      sections: [{
        header: 'Favori İstasyonlar',
        items: favorites.map(station => ({
          text: station.name,
          detailText: station.country || station.tags?.split(',')[0] || 'Radio',
          image: getArtworkUrl(station),
          // Store station data for selection
          station: station,
        })),
      }],
      onItemSelect: async ({ index }: { index: number }) => {
        const station = favorites[index];
        if (station && playStationCallback) {
          console.log('[CarPlay] Playing favorite:', station.name);
          await playStationCallback(station);
          showNowPlayingTemplate(station);
        }
      },
    });
  } catch (error) {
    console.error('[CarPlay] Error creating favorites template:', error);
    return null;
  }
};

// Create Recently Played List Template
const createRecentlyPlayedTemplate = async (): Promise<any> => {
  if (!ListTemplate || !getRecentlyPlayedCallback) return null;
  
  try {
    const recentStations = await getRecentlyPlayedCallback();
    
    return new ListTemplate({
      title: 'Son Çalınanlar',
      sections: [{
        header: 'Son Dinlenen İstasyonlar',
        items: recentStations.map(station => ({
          text: station.name,
          detailText: station.country || station.tags?.split(',')[0] || 'Radio',
          image: getArtworkUrl(station),
        })),
      }],
      onItemSelect: async ({ index }: { index: number }) => {
        const station = recentStations[index];
        if (station && playStationCallback) {
          console.log('[CarPlay] Playing recent:', station.name);
          await playStationCallback(station);
          showNowPlayingTemplate(station);
        }
      },
    });
  } catch (error) {
    console.error('[CarPlay] Error creating recently played template:', error);
    return null;
  }
};

// Create Genres Grid Template
const createGenresTemplate = async (): Promise<any> => {
  if (!GridTemplate || !getGenresCallback) return null;
  
  try {
    const genres = await getGenresCallback();
    
    return new GridTemplate({
      title: 'Türler',
      buttons: genres.slice(0, 8).map(genre => ({
        id: genre.name,
        titleVariants: [genre.name],
        image: 'https://themegaradio.com/logo.png', // Default genre icon
      })),
      onButtonPressed: async ({ id }: { id: string }) => {
        console.log('[CarPlay] Genre selected:', id);
        await showGenreStationsTemplate(id);
      },
    });
  } catch (error) {
    console.error('[CarPlay] Error creating genres template:', error);
    return null;
  }
};

// Create Genre Stations List Template
const showGenreStationsTemplate = async (genre: string): Promise<void> => {
  if (!ListTemplate || !CarPlay || !getStationsByGenreCallback) return;
  
  try {
    const stations = await getStationsByGenreCallback(genre);
    
    const template = new ListTemplate({
      title: genre,
      sections: [{
        header: `${genre} İstasyonları`,
        items: stations.slice(0, 20).map(station => ({
          text: station.name,
          detailText: station.country || 'Radio',
          image: getArtworkUrl(station),
        })),
      }],
      onItemSelect: async ({ index }: { index: number }) => {
        const station = stations[index];
        if (station && playStationCallback) {
          console.log('[CarPlay] Playing from genre:', station.name);
          await playStationCallback(station);
          showNowPlayingTemplate(station);
        }
      },
    });
    
    CarPlay.pushTemplate(template, true);
  } catch (error) {
    console.error('[CarPlay] Error showing genre stations:', error);
  }
};

// Create Browse/Popular Stations List Template
const createBrowseTemplate = async (): Promise<any> => {
  if (!ListTemplate || !getStationsCallback) return null;
  
  try {
    const stations = await getStationsCallback();
    
    return new ListTemplate({
      title: 'Keşfet',
      sections: [{
        header: 'Popüler İstasyonlar',
        items: stations.slice(0, 20).map(station => ({
          text: station.name,
          detailText: station.country || station.tags?.split(',')[0] || 'Radio',
          image: getArtworkUrl(station),
        })),
      }],
      onItemSelect: async ({ index }: { index: number }) => {
        const station = stations[index];
        if (station && playStationCallback) {
          console.log('[CarPlay] Playing from browse:', station.name);
          await playStationCallback(station);
          showNowPlayingTemplate(station);
        }
      },
    });
  } catch (error) {
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
  if (!TabBarTemplate || !CarPlay) {
    console.log('[CarPlay] Templates not available');
    return;
  }
  
  try {
    console.log('[CarPlay] Creating root template...');
    
    // Create all tab templates with individual error handling
    const results = await Promise.allSettled([
      createFavoritesTemplate(),
      createRecentlyPlayedTemplate(),
      createBrowseTemplate(),
      createGenresTemplate(),
    ]);
    
    const [favoritesResult, recentResult, browseResult, genresResult] = results;
    
    const favoritesTemplate = favoritesResult.status === 'fulfilled' ? favoritesResult.value : null;
    const recentTemplate = recentResult.status === 'fulfilled' ? recentResult.value : null;
    const browseTemplate = browseResult.status === 'fulfilled' ? browseResult.value : null;
    const genresTemplate = genresResult.status === 'fulfilled' ? genresResult.value : null;
    
    // Log any failures
    if (favoritesResult.status === 'rejected') console.error('[CarPlay] Favorites template failed:', favoritesResult.reason);
    if (recentResult.status === 'rejected') console.error('[CarPlay] Recent template failed:', recentResult.reason);
    if (browseResult.status === 'rejected') console.error('[CarPlay] Browse template failed:', browseResult.reason);
    if (genresResult.status === 'rejected') console.error('[CarPlay] Genres template failed:', genresResult.reason);
    
    // Build tabs array with available templates
    const templates: any[] = [];
    
    if (browseTemplate) {
      browseTemplate.tabTitle = 'Keşfet';
      browseTemplate.tabSystemImageName = 'music.note.list';
      templates.push(browseTemplate);
    }
    
    if (favoritesTemplate) {
      favoritesTemplate.tabTitle = 'Favoriler';
      favoritesTemplate.tabSystemImageName = 'heart.fill';
      templates.push(favoritesTemplate);
    }
    
    if (recentTemplate) {
      recentTemplate.tabTitle = 'Son Çalınanlar';
      recentTemplate.tabSystemImageName = 'clock.fill';
      templates.push(recentTemplate);
    }
    
    if (genresTemplate) {
      genresTemplate.tabTitle = 'Türler';
      genresTemplate.tabSystemImageName = 'square.grid.2x2.fill';
      templates.push(genresTemplate);
    }
    
    if (templates.length === 0) {
      console.log('[CarPlay] No templates available - showing fallback');
      // Create a simple fallback list template
      if (ListTemplate) {
        const fallbackTemplate = new ListTemplate({
          title: 'MegaRadio',
          sections: [{
            header: 'Yükleniyor...',
            items: [{
              text: 'İstasyonlar yükleniyor',
              detailText: 'Lütfen bekleyin',
            }],
          }],
        });
        CarPlay.setRootTemplate(fallbackTemplate, true);
      }
      return;
    }
    
    // Create tab bar
    const tabBarTemplate = new TabBarTemplate({
      templates: templates,
      onTemplateSelect: (selectedTemplate: any, selectedIndex: number) => {
        console.log('[CarPlay] Tab selected:', selectedIndex);
      },
    });
    
    // Set as root template
    CarPlay.setRootTemplate(tabBarTemplate, true);
    console.log('[CarPlay] Root template set successfully with', templates.length, 'tabs');
    
  } catch (error) {
    console.error('[CarPlay] Error creating root template:', error);
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
    if (Platform.OS === 'web' || !CarPlay) {
      console.log('[CarPlayService] Not available on this platform');
      return;
    }
    
    console.log('[CarPlayService] Initializing...');
    
    // Store callbacks
    playStationCallback = playStation;
    getStationsCallback = getStations;
    getFavoritesCallback = getFavorites;
    getRecentlyPlayedCallback = getRecentlyPlayed;
    getGenresCallback = getGenres;
    getStationsByGenreCallback = getStationsByGenre;
    
    // Register CarPlay connection handler
    CarPlay.registerOnConnect(() => {
      console.log('[CarPlay] ========== CONNECTED ==========');
      isCarPlayConnected = true;
      CarPlayService.isConnected = true;
      
      // Create and show root template
      createRootTemplate();
    });
    
    // Register CarPlay disconnection handler
    CarPlay.registerOnDisconnect(() => {
      console.log('[CarPlay] ========== DISCONNECTED ==========');
      isCarPlayConnected = false;
      CarPlayService.isConnected = false;
    });
    
    // CRITICAL: Check if CarPlay was already connected before we registered
    // This handles the race condition where CarPlay connects before JS initializes
    if (CarPlay.connected) {
      console.log('[CarPlay] Already connected - creating root template immediately');
      isCarPlayConnected = true;
      CarPlayService.isConnected = true;
      createRootTemplate();
    }
    
    console.log('[CarPlayService] Initialized and waiting for connection');
  },
  
  updateNowPlaying: (station, songTitle, artistName) => {
    if (!isCarPlayConnected) return;
    
    console.log('[CarPlay] Updating now playing:', station.name, songTitle, artistName);
    // The Now Playing template automatically uses the MPNowPlayingInfoCenter
    // which is updated by react-native-track-player
  },
  
  disconnect: () => {
    console.log('[CarPlayService] Disconnecting...');
    playStationCallback = null;
    getStationsCallback = null;
    getFavoritesCallback = null;
    getRecentlyPlayedCallback = null;
    getGenresCallback = null;
    getStationsByGenreCallback = null;
    isCarPlayConnected = false;
    CarPlayService.isConnected = false;
  },
};

export default CarPlayService;

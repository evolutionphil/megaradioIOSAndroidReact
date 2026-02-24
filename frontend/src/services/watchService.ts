// watchService.ts
// Service to handle Apple Watch communication from React Native

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

// Only import on iOS
const WatchConnectivityBridge = Platform.OS === 'ios' ? NativeModules.WatchConnectivityBridge : null;

// Types
interface WatchStation {
  id: string;
  name: string;
  logo?: string;
  streamUrl?: string;
  genre?: string;
  country?: string;
}

interface WatchNowPlaying {
  stationId?: string;
  stationName?: string;
  stationLogo?: string;
  songTitle?: string;
  artistName?: string;
  isPlaying: boolean;
}

interface WatchGenre {
  name: string;
  icon: string;
  stationCount: number;
}

interface WatchCommand {
  command: string;
  stationId?: string;
}

type WatchCommandListener = (command: WatchCommand) => void;

class WatchService {
  private eventEmitter: NativeEventEmitter | null = null;
  private commandListeners: Set<WatchCommandListener> = new Set();
  private isInitialized = false;

  constructor() {
    // Only initialize on iOS with native module available
    if (Platform.OS === 'ios' && WatchConnectivityBridge) {
      try {
        this.eventEmitter = new NativeEventEmitter(WatchConnectivityBridge);
        this.setupListeners();
        this.isInitialized = true;
        console.log('[WatchService] Initialized successfully');
      } catch (error) {
        console.log('[WatchService] Initialization failed:', error);
        this.isInitialized = false;
      }
    } else {
      console.log('[WatchService] Not available (non-iOS or no native module)');
    }
  }

  private setupListeners() {
    if (!this.eventEmitter) return;

    this.eventEmitter.addListener('onWatchCommand', (event: WatchCommand) => {
      console.log('[WatchService] Received command:', event);
      this.commandListeners.forEach(listener => listener(event));
    });
  }

  // Check if Watch is available
  async isWatchAppInstalled(): Promise<boolean> {
    if (Platform.OS !== 'ios' || !WatchConnectivityBridge) {
      return false;
    }
    try {
      return await WatchConnectivityBridge.isWatchAppInstalled();
    } catch (error) {
      console.log('[WatchService] Error checking watch app:', error);
      return false;
    }
  }

  // Update favorites on Watch
  updateFavorites(favorites: any[]) {
    if (!this.isInitialized || !WatchConnectivityBridge) return;

    try {
      const watchStations: WatchStation[] = favorites.map(station => ({
        id: station._id || station.id || '',
        name: station.name || '',
        logo: station.logo || station.favicon || '',
        streamUrl: station.streamUrl || station.url_resolved || '',
        genre: station.genres?.[0] || station.genre || '',
        country: station.country || '',
      }));

      console.log('[WatchService] Updating favorites:', watchStations.length);
      WatchConnectivityBridge.updateFavorites(watchStations);
    } catch (error) {
      console.log('[WatchService] Error updating favorites:', error);
    }
  }

  // Update now playing info on Watch
  updateNowPlaying(nowPlaying: WatchNowPlaying) {
    if (!this.isInitialized || !WatchConnectivityBridge) return;

    try {
      console.log('[WatchService] Updating now playing:', nowPlaying.stationName);
      WatchConnectivityBridge.updateNowPlaying({
        stationId: nowPlaying.stationId || '',
        stationName: nowPlaying.stationName || '',
        stationLogo: nowPlaying.stationLogo || '',
        songTitle: nowPlaying.songTitle || '',
        artistName: nowPlaying.artistName || '',
        isPlaying: nowPlaying.isPlaying,
      });
    } catch (error) {
      console.log('[WatchService] Error updating now playing:', error);
    }
  }

  // Update genres on Watch
  updateGenres(genres: any[]) {
    if (!this.isInitialized || !WatchConnectivityBridge) return;

    try {
      const watchGenres: WatchGenre[] = genres.map(genre => ({
        name: genre.name || '',
        icon: genre.icon || 'radio',
        stationCount: genre.stationCount || genre.count || 0,
      }));

      console.log('[WatchService] Updating genres:', watchGenres.length);
      WatchConnectivityBridge.updateGenres(watchGenres);
    } catch (error) {
      console.log('[WatchService] Error updating genres:', error);
    }
  }

  // Update playback state
  updatePlaybackState(isPlaying: boolean) {
    if (!this.isInitialized || !WatchConnectivityBridge) return;

    try {
      console.log('[WatchService] Updating playback state:', isPlaying);
      WatchConnectivityBridge.updatePlaybackState(isPlaying);
    } catch (error) {
      console.log('[WatchService] Error updating playback state:', error);
    }
  }

  // Add command listener
  addCommandListener(listener: WatchCommandListener): () => void {
    this.commandListeners.add(listener);
    return () => {
      this.commandListeners.delete(listener);
    };
  }

  // Remove all listeners
  removeAllListeners() {
    this.commandListeners.clear();
    if (this.eventEmitter) {
      this.eventEmitter.removeAllListeners('onWatchCommand');
    }
  }
}

// Export singleton instance
export const watchService = new WatchService();
export default watchService;

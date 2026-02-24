// watchService.ts
// Service to handle Apple Watch communication from React Native

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { WatchConnectivityBridge } = NativeModules;

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
    if (Platform.OS === 'ios' && WatchConnectivityBridge) {
      this.eventEmitter = new NativeEventEmitter(WatchConnectivityBridge);
      this.setupListeners();
      this.isInitialized = true;
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
    if (!this.isInitialized) return;

    const watchStations: WatchStation[] = favorites.map(station => ({
      id: station._id || station.id,
      name: station.name || '',
      logo: station.logo || station.favicon || '',
      streamUrl: station.streamUrl || station.url_resolved || '',
      genre: station.genres?.[0] || station.genre || '',
      country: station.country || '',
    }));

    console.log('[WatchService] Updating favorites:', watchStations.length);
    WatchConnectivityBridge?.updateFavorites(watchStations);
  }

  // Update now playing info on Watch
  updateNowPlaying(nowPlaying: WatchNowPlaying) {
    if (!this.isInitialized) return;

    console.log('[WatchService] Updating now playing:', nowPlaying.stationName);
    WatchConnectivityBridge?.updateNowPlaying({
      stationId: nowPlaying.stationId || '',
      stationName: nowPlaying.stationName || '',
      stationLogo: nowPlaying.stationLogo || '',
      songTitle: nowPlaying.songTitle || '',
      artistName: nowPlaying.artistName || '',
      isPlaying: nowPlaying.isPlaying,
    });
  }

  // Update genres on Watch
  updateGenres(genres: any[]) {
    if (!this.isInitialized) return;

    const watchGenres: WatchGenre[] = genres.map(genre => ({
      name: genre.name || '',
      icon: genre.icon || 'radio',
      stationCount: genre.stationCount || genre.count || 0,
    }));

    console.log('[WatchService] Updating genres:', watchGenres.length);
    WatchConnectivityBridge?.updateGenres(watchGenres);
  }

  // Update playback state
  updatePlaybackState(isPlaying: boolean) {
    if (!this.isInitialized) return;

    console.log('[WatchService] Updating playback state:', isPlaying);
    WatchConnectivityBridge?.updatePlaybackState(isPlaying);
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
    this.eventEmitter?.removeAllListeners('onWatchCommand');
  }
}

// Export singleton instance
export const watchService = new WatchService();
export default watchService;

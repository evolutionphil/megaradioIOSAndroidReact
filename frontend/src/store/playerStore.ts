import { create } from 'zustand';
import type { Station, NowPlayingMetadata } from '../types';
import { useRecentlyPlayedStore } from './recentlyPlayedStore';

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'error';

interface PlayerState {
  currentStation: Station | null;
  playbackState: PlaybackState;
  streamUrl: string | null;
  nowPlaying: NowPlayingMetadata | null;
  volume: number;
  isMiniPlayerVisible: boolean;
  errorMessage: string | null;
  // Sleep timer
  sleepTimerActive: boolean;
  sleepTimerRemaining: number;
  sleepTimerInterval: ReturnType<typeof setInterval> | null;
  // Actions
  setCurrentStation: (station: Station | null) => void;
  setPlaybackState: (state: PlaybackState) => void;
  setStreamUrl: (url: string | null) => void;
  setNowPlaying: (metadata: NowPlayingMetadata | null) => void;
  setVolume: (volume: number) => void;
  setMiniPlayerVisible: (visible: boolean) => void;
  hideMiniPlayer: () => void;
  setError: (message: string | null) => void;
  startSleepTimer: (minutes: number, onExpire: () => void) => void;
  cancelSleepTimer: () => void;
  reset: () => void;
}

const initialState = {
  currentStation: null,
  playbackState: 'idle' as PlaybackState,
  streamUrl: null,
  nowPlaying: null,
  volume: 1,
  isMiniPlayerVisible: false,
  errorMessage: null,
  sleepTimerActive: false,
  sleepTimerRemaining: 0,
  sleepTimerInterval: null,
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  ...initialState,

  setCurrentStation: (station) => {
    set({
      currentStation: station,
      isMiniPlayerVisible: station !== null,
      errorMessage: null,
    });
    
    // Add to recently played when station is set
    if (station) {
      useRecentlyPlayedStore.getState().addStation(station);
    }
  },

  setPlaybackState: (state) =>
    set({ playbackState: state }),

  setStreamUrl: (url) =>
    set({ streamUrl: url }),

  setNowPlaying: (metadata) =>
    set({ nowPlaying: metadata }),

  setVolume: (volume) =>
    set({ volume: Math.max(0, Math.min(1, volume)) }),

  setMiniPlayerVisible: (visible) =>
    set({ isMiniPlayerVisible: visible }),

  hideMiniPlayer: () =>
    set({ 
      isMiniPlayerVisible: false,
      currentStation: null,
      playbackState: 'idle',
      streamUrl: null,
      nowPlaying: null,
    }),

  setError: (message) =>
    set({ errorMessage: message, playbackState: message ? 'error' : 'idle' }),

  startSleepTimer: (minutes, onExpire) => {
    // Clear existing timer
    const existing = get().sleepTimerInterval;
    if (existing) clearInterval(existing);

    const totalSeconds = minutes * 60;
    set({ sleepTimerActive: true, sleepTimerRemaining: totalSeconds });

    const interval = setInterval(() => {
      const remaining = get().sleepTimerRemaining;
      if (remaining <= 1) {
        clearInterval(interval);
        set({ sleepTimerActive: false, sleepTimerRemaining: 0, sleepTimerInterval: null });
        onExpire();
      } else {
        set({ sleepTimerRemaining: remaining - 1 });
      }
    }, 1000);

    set({ sleepTimerInterval: interval });
  },

  cancelSleepTimer: () => {
    const interval = get().sleepTimerInterval;
    if (interval) clearInterval(interval);
    set({ sleepTimerActive: false, sleepTimerRemaining: 0, sleepTimerInterval: null });
  },

  reset: () => {
    const interval = get().sleepTimerInterval;
    if (interval) clearInterval(interval);
    set(initialState);
  },
}));

export default usePlayerStore;

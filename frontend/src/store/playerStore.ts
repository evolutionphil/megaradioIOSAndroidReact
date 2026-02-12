import { create } from 'zustand';
import type { Station, NowPlayingMetadata } from '../types';

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'error';

interface PlayerState {
  // Current station
  currentStation: Station | null;
  
  // Playback state
  playbackState: PlaybackState;
  
  // Stream URL (resolved)
  streamUrl: string | null;
  
  // Now playing metadata
  nowPlaying: NowPlayingMetadata | null;
  
  // Volume (0-1)
  volume: number;
  
  // Is mini player visible
  isMiniPlayerVisible: boolean;
  
  // Error message
  errorMessage: string | null;
  
  // Actions
  setCurrentStation: (station: Station | null) => void;
  setPlaybackState: (state: PlaybackState) => void;
  setStreamUrl: (url: string | null) => void;
  setNowPlaying: (metadata: NowPlayingMetadata | null) => void;
  setVolume: (volume: number) => void;
  setMiniPlayerVisible: (visible: boolean) => void;
  setError: (message: string | null) => void;
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
};

export const usePlayerStore = create<PlayerState>((set) => ({
  ...initialState,

  setCurrentStation: (station) =>
    set({
      currentStation: station,
      isMiniPlayerVisible: station !== null,
      errorMessage: null,
    }),

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

  setError: (message) =>
    set({ errorMessage: message, playbackState: message ? 'error' : 'idle' }),

  reset: () =>
    set(initialState),
}));

export default usePlayerStore;

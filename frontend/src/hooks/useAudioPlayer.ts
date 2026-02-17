// useAudioPlayer - Backward compatible hook that uses AudioProvider context
// All audio functionality is centralized in AudioProvider
// Components can use this hook or useAudio() directly

import { useContext, createContext } from 'react';
import { usePlayerStore } from '../store/playerStore';
import type { Station } from '../types';

// Re-export the context type for reference
export interface AudioContextType {
  playStation: (station: Station) => Promise<void>;
  stopPlayback: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  togglePlayPause: () => void;
  setVolume: (volume: number) => void;
  currentStation: Station | null;
  playbackState: string;
  streamUrl: string | null;
  isPlaying: boolean;
}

// Create context here - will be populated by AudioProvider
export const AudioContext = createContext<AudioContextType | null>(null);

// Hook to access audio context
export const useAudio = (): AudioContextType => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

// Backward compatible hook - returns same interface as before
export const useAudioPlayer = () => {
  const context = useContext(AudioContext);
  const store = usePlayerStore();
  
  // If not in provider, return dummy functions (for safety during init)
  if (!context) {
    console.warn('[useAudioPlayer] Not in AudioProvider - returning store values');
    return {
      currentStation: store.currentStation,
      playbackState: store.playbackState,
      streamUrl: store.streamUrl,
      playStation: async (_station: Station) => {
        console.warn('[useAudioPlayer] AudioProvider not found');
      },
      stopPlayback: async () => {},
      pause: () => {},
      resume: () => {},
      togglePlayPause: () => {},
      setVolume: (_volume: number) => {},
      reset: store.reset,
    };
  }
  
  return {
    currentStation: context.currentStation,
    playbackState: context.playbackState,
    streamUrl: context.streamUrl,
    playStation: context.playStation,
    stopPlayback: context.stopPlayback,
    pause: context.pause,
    resume: context.resume,
    togglePlayPause: context.togglePlayPause,
    setVolume: context.setVolume,
    reset: store.reset,
  };
};

export default useAudioPlayer;

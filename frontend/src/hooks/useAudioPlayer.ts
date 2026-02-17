// useAudioPlayer - Backward compatible hook
// All audio functionality is centralized in AudioProvider
// This hook provides access to the shared audio context

import { useContext } from 'react';
import { AudioContext, AudioContextType } from '../providers/AudioProvider';
import { usePlayerStore } from '../store/playerStore';
import type { Station } from '../types';

// Hook to access audio context (throws if not in provider)
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
  
  // If not in provider, return store values with dummy functions
  if (!context) {
    console.warn('[useAudioPlayer] Not in AudioProvider');
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

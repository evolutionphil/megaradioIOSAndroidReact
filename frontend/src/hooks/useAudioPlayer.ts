// useAudioPlayer - Re-exports from AudioProvider for backward compatibility
// All audio functionality is now centralized in AudioProvider
// This hook simply provides access to the shared audio context

// Import from provider
import { AudioProvider, useAudio, useAudioPlayer as useAudioPlayerHook } from '../providers/AudioProvider';

// Re-export for backward compatibility
export { useAudio };
export { AudioProvider };

// Named export - the main hook
export function useAudioPlayer() {
  return useAudioPlayerHook();
}

// Default export
export default useAudioPlayer;

// useAudioPlayer - Re-exports from AudioProvider for backward compatibility
// All audio functionality is now centralized in AudioProvider
// This hook simply provides access to the shared audio context

import { useAudioPlayer as useAudioPlayerFromProvider, useAudio } from '../providers/AudioProvider';

// Named export
export const useAudioPlayer = useAudioPlayerFromProvider;
export { useAudio };

// Default export for backward compatibility
export default useAudioPlayerFromProvider;

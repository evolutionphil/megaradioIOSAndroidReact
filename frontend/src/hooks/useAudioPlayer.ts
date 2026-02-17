// useAudioPlayer - Re-exports from AudioProvider for backward compatibility
// All audio functionality is now centralized in AudioProvider
// This hook simply provides access to the shared audio context

export { useAudioPlayer, useAudio } from '../providers/AudioProvider';
export default { useAudioPlayer };

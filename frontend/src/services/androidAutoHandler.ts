// Android Auto Handler - Listens for broadcasts from Android Auto Service
// and plays stations through the main audio player

import { Platform, NativeModules, NativeEventEmitter, DeviceEventEmitter } from 'react-native';

/**
 * Android Auto station data from native broadcast
 */
export interface AndroidAutoStation {
  stationId: string;
  stationName: string;
  streamUrl: string;
  logoUrl: string;
  country: string;
  genre: string;
}

type PlayStationCallback = (station: AndroidAutoStation) => void;
type PlaybackCommandCallback = (command: string) => void;

let playStationCallback: PlayStationCallback | null = null;
let playbackCommandCallback: PlaybackCommandCallback | null = null;
let isListening = false;

/**
 * Initialize Android Auto event listeners
 * Call this once when the app starts
 */
export const initAndroidAutoHandler = () => {
  if (Platform.OS !== 'android' || isListening) {
    console.log('[AndroidAutoHandler] Skipping init - not Android or already listening');
    return;
  }

  console.log('[AndroidAutoHandler] Initializing event listeners');
  isListening = true;

  // Listen for PLAY_STATION broadcasts
  DeviceEventEmitter.addListener('AndroidAutoPlayStation', (event: any) => {
    console.log('[AndroidAutoHandler] Received PLAY_STATION event:', event);
    
    if (playStationCallback && event) {
      const station: AndroidAutoStation = {
        stationId: event.stationId || '',
        stationName: event.stationName || 'Unknown Station',
        streamUrl: event.streamUrl || '',
        logoUrl: event.logoUrl || 'https://themegaradio.com/logo.png',
        country: event.country || '',
        genre: event.genre || '',
      };
      
      if (station.streamUrl) {
        playStationCallback(station);
      }
    }
  });

  // Listen for PLAYBACK_COMMAND broadcasts
  DeviceEventEmitter.addListener('AndroidAutoPlaybackCommand', (event: any) => {
    console.log('[AndroidAutoHandler] Received PLAYBACK_COMMAND event:', event);
    
    if (playbackCommandCallback && event?.command) {
      playbackCommandCallback(event.command);
    }
  });

  console.log('[AndroidAutoHandler] Event listeners initialized');
};

/**
 * Set callback for when Android Auto requests to play a station
 */
export const setPlayStationCallback = (callback: PlayStationCallback | null) => {
  playStationCallback = callback;
  console.log('[AndroidAutoHandler] Play station callback set:', !!callback);
};

/**
 * Set callback for playback commands (play, pause, stop, next, previous)
 */
export const setPlaybackCommandCallback = (callback: PlaybackCommandCallback | null) => {
  playbackCommandCallback = callback;
  console.log('[AndroidAutoHandler] Playback command callback set:', !!callback);
};

/**
 * Cleanup - remove event listeners
 */
export const cleanupAndroidAutoHandler = () => {
  if (Platform.OS !== 'android') return;

  console.log('[AndroidAutoHandler] Cleaning up event listeners');
  DeviceEventEmitter.removeAllListeners('AndroidAutoPlayStation');
  DeviceEventEmitter.removeAllListeners('AndroidAutoPlaybackCommand');
  playStationCallback = null;
  playbackCommandCallback = null;
  isListening = false;
};

export default {
  initAndroidAutoHandler,
  setPlayStationCallback,
  setPlaybackCommandCallback,
  cleanupAndroidAutoHandler,
};

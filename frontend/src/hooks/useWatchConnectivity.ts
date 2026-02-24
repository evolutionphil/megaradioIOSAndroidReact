// useWatchConnectivity.ts
// React hook for Apple Watch integration

import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import watchService from '../services/watchService';
import { useFavoritesStore } from '../store/favoritesStore';
import { usePlayerStore } from '../store/playerStore';

export const useWatchConnectivity = () => {
  const { favorites } = useFavoritesStore();
  const { 
    currentStation, 
    isPlaying, 
    nowPlayingInfo,
    playStation,
    pause,
    resume,
    playNextFavorite,
    playPreviousFavorite 
  } = usePlayerStore();

  // Update Watch with favorites whenever they change
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    
    watchService.updateFavorites(favorites);
  }, [favorites]);

  // Update Watch with now playing info
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    
    watchService.updateNowPlaying({
      stationId: currentStation?._id || currentStation?.id,
      stationName: currentStation?.name,
      stationLogo: currentStation?.logo || currentStation?.favicon,
      songTitle: nowPlayingInfo?.title,
      artistName: nowPlayingInfo?.artist,
      isPlaying: isPlaying,
    });
  }, [currentStation, isPlaying, nowPlayingInfo]);

  // Update playback state
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    
    watchService.updatePlaybackState(isPlaying);
  }, [isPlaying]);

  // Handle commands from Watch
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const unsubscribe = watchService.addCommandListener((command) => {
      console.log('[useWatchConnectivity] Command received:', command);

      switch (command.command) {
        case 'play':
          resume();
          break;
        case 'pause':
          pause();
          break;
        case 'togglePlayPause':
          if (isPlaying) {
            pause();
          } else {
            resume();
          }
          break;
        case 'nextStation':
          playNextFavorite();
          break;
        case 'previousStation':
          playPreviousFavorite();
          break;
        case 'playStation':
          if (command.stationId) {
            // Find station in favorites and play
            const station = favorites.find(
              (s: any) => (s._id || s.id) === command.stationId
            );
            if (station) {
              playStation(station);
            }
          }
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [favorites, isPlaying, playStation, pause, resume, playNextFavorite, playPreviousFavorite]);

  // Check if Watch app is installed
  const checkWatchApp = useCallback(async () => {
    if (Platform.OS !== 'ios') return false;
    return await watchService.isWatchAppInstalled();
  }, []);

  return {
    checkWatchApp,
  };
};

export default useWatchConnectivity;

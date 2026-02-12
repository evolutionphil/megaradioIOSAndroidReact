import React, { useCallback, useRef, useEffect } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { usePlayerStore } from '../store/playerStore';
import stationService from '../services/stationService';
import userService from '../services/userService';
import type { Station } from '../types';

export const useAudioPlayer = () => {
  const soundRef = useRef<Audio.Sound | null>(null);
  const listeningStartRef = useRef<Date | null>(null);
  
  const {
    currentStation,
    playbackState,
    streamUrl,
    setCurrentStation,
    setPlaybackState,
    setStreamUrl,
    setNowPlaying,
    setError,
    reset,
  } = usePlayerStore();

  // Set up audio mode on mount
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.error('Failed to set audio mode:', error);
      }
    };
    setupAudio();

    return () => {
      // Cleanup on unmount
      stopPlayback();
    };
  }, []);

  // Handle playback state changes
  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.error('Playback error:', status.error);
        setError(`Playback error: ${status.error}`);
      }
      return;
    }

    if (status.isBuffering) {
      setPlaybackState('buffering');
    } else if (status.isPlaying) {
      setPlaybackState('playing');
    } else {
      setPlaybackState('paused');
    }
  }, [setPlaybackState, setError]);

  // Resolve stream URL
  const resolveStreamUrl = useCallback(async (station: Station): Promise<string | null> => {
    try {
      const streamData = await stationService.resolveStream(station.url);
      
      if (streamData.candidates && streamData.candidates.length > 0) {
        let streamUrl = streamData.candidates[0];
        
        // If HTTP stream, use proxy
        if (streamUrl.startsWith('http://')) {
          streamUrl = stationService.getProxyUrl(streamUrl);
        }
        
        return streamUrl;
      }
      
      // Fallback to original URL
      return station.url_resolved || station.url;
    } catch (error) {
      console.error('Failed to resolve stream:', error);
      // Fallback to original URL on error
      return station.url_resolved || station.url;
    }
  }, []);

  // Play a station
  const playStation = useCallback(async (station: Station) => {
    try {
      // Stop current playback
      await stopPlayback();
      
      // Set station and loading state
      setCurrentStation(station);
      setPlaybackState('loading');
      setError(null);

      // Record click
      try {
        await stationService.recordClick(station._id);
      } catch (e) {
        // Non-critical, ignore
      }

      // Resolve stream URL
      const url = await resolveStreamUrl(station);
      if (!url) {
        throw new Error('Could not resolve stream URL');
      }
      setStreamUrl(url);

      // Create and load sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, volume: 1.0 },
        onPlaybackStatusUpdate
      );
      
      soundRef.current = sound;
      listeningStartRef.current = new Date();

      // Record recently played
      try {
        await userService.recordRecentlyPlayed(station._id);
      } catch (e) {
        // Non-critical, ignore
      }

      // Fetch now playing metadata
      fetchNowPlaying(station._id);

    } catch (error) {
      console.error('Failed to play station:', error);
      setError(error instanceof Error ? error.message : 'Failed to play station');
      setPlaybackState('error');
    }
  }, [resolveStreamUrl, onPlaybackStatusUpdate, setCurrentStation, setPlaybackState, setStreamUrl, setError]);

  // Fetch now playing metadata
  const fetchNowPlaying = useCallback(async (stationId: string) => {
    try {
      const metadata = await stationService.getNowPlaying(stationId);
      setNowPlaying(metadata);
    } catch (error) {
      // Non-critical, metadata might not be available
      console.log('Now playing metadata not available');
    }
  }, [setNowPlaying]);

  // Stop playback
  const stopPlayback = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      // Record listening time
      if (listeningStartRef.current && currentStation) {
        const duration = Math.floor(
          (new Date().getTime() - listeningStartRef.current.getTime()) / 1000
        );
        if (duration > 5) {
          try {
            await userService.recordListening(
              currentStation._id,
              duration,
              listeningStartRef.current.toISOString()
            );
          } catch (e) {
            // Non-critical
          }
        }
        listeningStartRef.current = null;
      }
    } catch (error) {
      console.error('Error stopping playback:', error);
    }
  }, [currentStation]);

  // Pause playback
  const pause = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.pauseAsync();
        setPlaybackState('paused');
      }
    } catch (error) {
      console.error('Error pausing:', error);
    }
  }, [setPlaybackState]);

  // Resume playback
  const resume = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.playAsync();
        setPlaybackState('playing');
      }
    } catch (error) {
      console.error('Error resuming:', error);
    }
  }, [setPlaybackState]);

  // Toggle play/pause
  const togglePlayPause = useCallback(async () => {
    if (playbackState === 'playing') {
      await pause();
    } else if (playbackState === 'paused') {
      await resume();
    }
  }, [playbackState, pause, resume]);

  // Set volume
  const setVolume = useCallback(async (volume: number) => {
    try {
      if (soundRef.current) {
        await soundRef.current.setVolumeAsync(volume);
      }
    } catch (error) {
      console.error('Error setting volume:', error);
    }
  }, []);

  return {
    currentStation,
    playbackState,
    streamUrl,
    playStation,
    stopPlayback,
    pause,
    resume,
    togglePlayPause,
    setVolume,
    reset,
  };
};

export default useAudioPlayer;

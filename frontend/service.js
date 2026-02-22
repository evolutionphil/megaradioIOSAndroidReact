// Track Player Playback Service
// This runs in the background and handles remote events from Control Center / Lock Screen
// CRITICAL: This file runs in a separate JS context, so we can't access React state directly
// We use AsyncStorage to communicate between the app and this service

import TrackPlayer, { Event, State } from 'react-native-track-player';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys (must match the keys used in the app)
const CURRENT_STATION_KEY = '@megaradio_current_station';
const RECENTLY_PLAYED_KEY = '@megaradio_recently_played';
const SIMILAR_STATIONS_KEY = '@megaradio_similar_stations';
const PLAYBACK_HISTORY_KEY = '@megaradio_playback_history'; // For previous button

// Helper to get station logo URL
const getStationLogoUrl = (station) => {
  if (!station) return 'https://themegaradio.com/logo.png';
  
  if (station.logoAssets?.webp96) {
    return `https://themegaradio.com/station-logos/${station.logoAssets.folder}/${station.logoAssets.webp96}`;
  }
  return station.favicon || station.logo || 'https://themegaradio.com/logo.png';
};

// Helper to get stream URL
const getStreamUrl = (station) => {
  if (!station) return null;
  return station.urlResolved || station.url || station.url_resolved || null;
};

// Play a station
const playStation = async (station) => {
  if (!station) {
    console.log('[Service] No station to play');
    return false;
  }

  const streamUrl = getStreamUrl(station);
  if (!streamUrl) {
    console.log('[Service] No stream URL for station:', station.name);
    return false;
  }

  try {
    console.log('[Service] Playing station:', station.name);
    
    // Reset and add new track
    await TrackPlayer.reset();
    await TrackPlayer.add({
      id: station._id || station.id,
      url: streamUrl,
      title: station.name,
      artist: station.country || 'Radio',
      artwork: getStationLogoUrl(station),
      isLiveStream: true,
      duration: 0,
    });
    
    // Start playback
    await TrackPlayer.play();
    
    // Save current station
    await AsyncStorage.setItem(CURRENT_STATION_KEY, JSON.stringify(station));
    
    // Add to playback history (for previous button)
    await addToPlaybackHistory(station);
    
    console.log('[Service] Station playing:', station.name);
    return true;
  } catch (error) {
    console.error('[Service] Error playing station:', error);
    return false;
  }
};

// Add station to playback history
const addToPlaybackHistory = async (station) => {
  try {
    const historyJson = await AsyncStorage.getItem(PLAYBACK_HISTORY_KEY);
    let history = historyJson ? JSON.parse(historyJson) : [];
    
    // Remove if already exists
    history = history.filter(s => s._id !== station._id);
    
    // Add to beginning
    history.unshift(station);
    
    // Keep only last 50
    history = history.slice(0, 50);
    
    await AsyncStorage.setItem(PLAYBACK_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('[Service] Error saving playback history:', error);
  }
};

// Get next station from similar stations
const getNextStation = async () => {
  try {
    // First try similar stations
    const similarJson = await AsyncStorage.getItem(SIMILAR_STATIONS_KEY);
    const similarStations = similarJson ? JSON.parse(similarJson) : [];
    
    if (similarStations.length > 0) {
      // Get current station
      const currentJson = await AsyncStorage.getItem(CURRENT_STATION_KEY);
      const currentStation = currentJson ? JSON.parse(currentJson) : null;
      
      // Find a different station
      const nextStation = similarStations.find(s => 
        s._id !== currentStation?._id
      ) || similarStations[0];
      
      return nextStation;
    }
    
    // Fallback to recently played
    const recentJson = await AsyncStorage.getItem(RECENTLY_PLAYED_KEY);
    const recentStations = recentJson ? JSON.parse(recentJson) : [];
    
    if (recentStations.length > 1) {
      return recentStations[1]; // Skip current, get second
    }
    
    console.log('[Service] No next station available');
    return null;
  } catch (error) {
    console.error('[Service] Error getting next station:', error);
    return null;
  }
};

// Get previous station from playback history
const getPreviousStation = async () => {
  try {
    const historyJson = await AsyncStorage.getItem(PLAYBACK_HISTORY_KEY);
    const history = historyJson ? JSON.parse(historyJson) : [];
    
    // Get current station
    const currentJson = await AsyncStorage.getItem(CURRENT_STATION_KEY);
    const currentStation = currentJson ? JSON.parse(currentJson) : null;
    
    // Find previous station (not current)
    const previousStation = history.find(s => 
      s._id !== currentStation?._id
    );
    
    if (previousStation) {
      return previousStation;
    }
    
    // Fallback to recently played
    const recentJson = await AsyncStorage.getItem(RECENTLY_PLAYED_KEY);
    const recentStations = recentJson ? JSON.parse(recentJson) : [];
    
    if (recentStations.length > 1) {
      return recentStations[1];
    }
    
    console.log('[Service] No previous station available');
    return null;
  } catch (error) {
    console.error('[Service] Error getting previous station:', error);
    return null;
  }
};

// This service needs to be registered for Track Player to work
module.exports = async function() {
  console.log('[TrackPlayer Service] Starting service registration...');

  // Handle remote play event (Control Center / Lock Screen play button)
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    console.log('[TrackPlayer Service] Remote Play');
    try {
      await TrackPlayer.play();
    } catch (e) {
      console.error('[TrackPlayer Service] Remote Play error:', e);
    }
  });

  // Handle remote pause event (Control Center / Lock Screen pause button)
  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    console.log('[TrackPlayer Service] Remote Pause');
    try {
      await TrackPlayer.pause();
    } catch (e) {
      console.error('[TrackPlayer Service] Remote Pause error:', e);
    }
  });

  // Handle remote stop event
  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    console.log('[TrackPlayer Service] Remote Stop');
    try {
      await TrackPlayer.stop();
    } catch (e) {
      console.error('[TrackPlayer Service] Remote Stop error:', e);
    }
  });

  // Handle remote next - Play next station from similar stations
  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    console.log('[TrackPlayer Service] Remote Next - Getting next station...');
    try {
      const nextStation = await getNextStation();
      if (nextStation) {
        console.log('[TrackPlayer Service] Playing next station:', nextStation.name);
        await playStation(nextStation);
      } else {
        console.log('[TrackPlayer Service] No next station available, restarting current stream');
        await TrackPlayer.seekTo(0);
        await TrackPlayer.play();
      }
    } catch (e) {
      console.error('[TrackPlayer Service] Remote Next error:', e);
    }
  });

  // Handle remote previous - Play previous station from history
  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    console.log('[TrackPlayer Service] Remote Previous - Getting previous station...');
    try {
      const previousStation = await getPreviousStation();
      if (previousStation) {
        console.log('[TrackPlayer Service] Playing previous station:', previousStation.name);
        await playStation(previousStation);
      } else {
        console.log('[TrackPlayer Service] No previous station available, restarting current stream');
        await TrackPlayer.seekTo(0);
        await TrackPlayer.play();
      }
    } catch (e) {
      console.error('[TrackPlayer Service] Remote Previous error:', e);
    }
  });

  // Handle remote duck event (when other app plays audio)
  // This is CRITICAL for iOS - handles audio interruptions properly
  TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
    console.log('[TrackPlayer Service] Remote Duck:', event);
    
    if (event.permanent) {
      // Audio focus lost permanently (like phone call ended our stream)
      console.log('[TrackPlayer Service] Permanent duck - stopping');
      await TrackPlayer.stop();
    } else if (event.paused) {
      // Another app started playing audio - pause ours
      console.log('[TrackPlayer Service] Temporary duck - pausing');
      await TrackPlayer.pause();
    } else {
      // Duck ended, we can resume (but let user do it manually for better UX)
      console.log('[TrackPlayer Service] Duck ended - user can resume');
      // Optionally auto-resume: await TrackPlayer.play();
    }
  });

  // Handle playback state changes
  TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
    console.log('[TrackPlayer Service] Playback State:', event.state);
    
    // Log human-readable state
    switch (event.state) {
      case State.Playing:
        console.log('[TrackPlayer Service] -> PLAYING');
        break;
      case State.Paused:
        console.log('[TrackPlayer Service] -> PAUSED');
        break;
      case State.Stopped:
        console.log('[TrackPlayer Service] -> STOPPED');
        break;
      case State.Buffering:
        console.log('[TrackPlayer Service] -> BUFFERING');
        break;
      case State.Loading:
        console.log('[TrackPlayer Service] -> LOADING');
        break;
      case State.Error:
        console.log('[TrackPlayer Service] -> ERROR');
        break;
      default:
        console.log('[TrackPlayer Service] -> Unknown state:', event.state);
    }
  });

  // Handle playback errors
  TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
    console.error('[TrackPlayer Service] Playback Error:', event);
  });

  // Handle track changes (for radio, usually single track)
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (event) => {
    console.log('[TrackPlayer Service] Track Changed:', event.track?.title || 'unknown');
  });

  // Handle playback queue ended
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, (event) => {
    console.log('[TrackPlayer Service] Queue Ended:', event);
  });

  console.log('[TrackPlayer Service] All event listeners registered successfully!');
  console.log('[TrackPlayer Service] Next/Previous buttons will now work in background!');
};

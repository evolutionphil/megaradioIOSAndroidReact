// Track Player Playback Service
// This runs in the background and handles remote events from Control Center / Lock Screen

import TrackPlayer, { Event, State } from 'react-native-track-player';

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

  // Handle remote next (skip forward for live radio - restart stream)
  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    console.log('[TrackPlayer Service] Remote Next - restarting stream');
    try {
      // For live radio, just restart the current stream
      await TrackPlayer.seekTo(0);
    } catch (e) {
      console.error('[TrackPlayer Service] Remote Next error:', e);
    }
  });

  // Handle remote previous (skip backward for live radio - restart stream)
  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    console.log('[TrackPlayer Service] Remote Previous - restarting stream');
    try {
      await TrackPlayer.seekTo(0);
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
};

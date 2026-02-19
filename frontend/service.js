// Track Player Playback Service
// This runs in the background and handles remote events from Control Center / Lock Screen

import TrackPlayer, { Event, RepeatMode } from 'react-native-track-player';

// This service needs to be registered for Track Player to work
module.exports = async function() {
  // Handle remote play event (Control Center / Lock Screen play button)
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    console.log('[TrackPlayer Service] Remote Play');
    TrackPlayer.play();
  });

  // Handle remote pause event (Control Center / Lock Screen pause button)
  TrackPlayer.addEventListener(Event.RemotePause, () => {
    console.log('[TrackPlayer Service] Remote Pause');
    TrackPlayer.pause();
  });

  // Handle remote stop event
  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    console.log('[TrackPlayer Service] Remote Stop');
    TrackPlayer.stop();
  });

  // Handle remote seek event (if needed for live streams, usually not)
  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    console.log('[TrackPlayer Service] Remote Seek:', event.position);
    TrackPlayer.seekTo(event.position);
  });

  // Handle remote duck event (when other app plays audio)
  TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
    console.log('[TrackPlayer Service] Remote Duck:', event);
    if (event.paused) {
      // Another app started playing audio, pause ours
      await TrackPlayer.pause();
    } else if (event.permanent) {
      // Audio focus lost permanently
      await TrackPlayer.stop();
    } else {
      // Duck the volume (optional - for radio we just pause)
      await TrackPlayer.pause();
    }
  });

  // Handle playback state changes
  TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
    console.log('[TrackPlayer Service] Playback State:', event.state);
  });

  // Handle playback errors
  TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
    console.error('[TrackPlayer Service] Playback Error:', event);
  });

  // Handle track changes (for radio, usually single track)
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (event) => {
    console.log('[TrackPlayer Service] Track Changed:', event);
  });

  console.log('[TrackPlayer Service] Registered all event listeners');
};

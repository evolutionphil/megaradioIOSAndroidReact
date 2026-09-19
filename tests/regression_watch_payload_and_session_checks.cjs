const assert = require('assert');
const fs = require('fs');

function run() {
  const watchSession = fs.readFileSync('/app/frontend/watch/ios/MegaRadioWatch/WatchSessionManager.swift', 'utf8');
  const watchService = fs.readFileSync('/app/frontend/src/services/watchService.ts', 'utf8');
  const wearService = fs.readFileSync('/app/frontend/src/services/wearOSService.ts', 'utf8');
  const audioProvider = fs.readFileSync('/app/frontend/src/providers/AudioProvider.tsx', 'utf8');

  // watchOS loading timeout and invalid response reset behavior
  assert(watchSession.includes('DispatchQueue.main.asyncAfter(deadline: .now() + 15'),
    'missing 15s timeout for watch loading guards');
  assert(watchSession.includes('self.genreStations = []') && watchSession.includes('self.isLoadingGenreStations = false'),
    'genre invalid response reset is missing');
  assert(watchSession.includes('self.countryStations = []') && watchSession.includes('self.isLoadingCountryStations = false'),
    'country invalid response reset is missing');

  // restore receivedApplicationContext at activation
  assert(watchSession.includes('self.handleIncomingMessage(session.receivedApplicationContext)'),
    'activation should restore receivedApplicationContext state');

  // watch/wear payload stream mapping should use camel/snake aware helper
  assert(watchService.includes('streamUrl: getStationStreamUrl(station)'),
    'watch service must use getStationStreamUrl mapping');
  assert(wearService.includes('streamUrl: getStationStreamUrl(station)') || wearService.includes('streamUrl: getStationStreamUrl(s)'),
    'wear service must use getStationStreamUrl mapping');

  // AudioProvider should include nowPlaying dependency for watch updates
  assert(audioProvider.includes('const nowPlayingData = watchNowPlaying;'),
    'AudioProvider nowPlaying bridge source missing');
  assert(audioProvider.includes('}, [currentStation, isPlaying, watchNowPlaying]);'),
    'AudioProvider watch update effect missing watchNowPlaying dependency');

  console.log('PASS regression_watch_payload_and_session_checks');
}

try {
  run();
} catch (err) {
  console.error('FAIL regression_watch_payload_and_session_checks:', err);
  process.exit(1);
}

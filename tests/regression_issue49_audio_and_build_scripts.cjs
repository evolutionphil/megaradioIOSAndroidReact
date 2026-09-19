const assert = require('assert');
const fs = require('fs');

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

function count(haystack, needle) {
  return (haystack.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
}

function run() {
  const audio = read('/app/frontend/src/providers/AudioProvider.tsx');
  const plugin = read('/app/frontend/plugins/withSwiftAudioExRadioFix.js');
  const podfile = read('/app/frontend/ios/Podfile');
  const addWatch = read('/app/frontend/scripts/add-watchos-target.js');
  const fixCycle = read('/app/frontend/scripts/fix-xcode-cycle.js');

  // AudioProvider watchdog + stale request guards.
  assert(audio.includes('setTimeout(() => {') && audio.includes('}, 15000);'), '15s stream watchdog missing');
  assert(audio.includes('if (requestId !== globalPlayId) return;'), 'stale guard by play id missing');
  assert(audio.includes('if (preparingQueueRef.current || !currentPlayingStationId) return;'),
    'event guard for stale/reset states missing');
  assert(audio.includes('globalPlayId++;') && audio.includes('stopPlayback = useCallback(async () => {'),
    'stopPlayback should invalidate stale async continuations');
  assert(audio.includes('currentPlayingStationId = null; // Same-station retry must create a fresh item.'),
    'same station retry reset missing');
  assert(audio.includes('setPlaybackState(\'error\');') && audio.includes('setError(\'Station did not respond. Please try again or choose another station.\');'),
    'watchdog should surface user-visible error');

  // Keep required 3-track placeholders + skip(1) behavior.
  assert(count(audio, 'await TrackPlayer.add({') >= 3, 'expected placeholder + current + placeholder queue adds');
  assert(audio.includes('id: \'placeholder_previous\''));
  assert(audio.includes('id: \'placeholder_next\''));
  assert(audio.includes('await TrackPlayer.skip(1);'));

  // Background sync should remain wired.
  assert(audio.includes('CURRENT_STATION_KEY'));
  assert(audio.includes('SIMILAR_STATIONS_KEY'));
  assert(audio.includes('PLAYBACK_HISTORY_KEY'));
  assert(audio.includes('stationService.getSimilarStations(station._id, 10)'));

  // SwiftAudioEx plugin fail-fast version pin.
  assert(plugin.includes("pkg.version !== '4.1.2'"));
  assert(plugin.includes("dependency [\"']SwiftAudioEx[\"'], [\"']1\\.1\\.0[\"']"));
  assert(plugin.includes("raise 'MegaRadio SwiftAudioEx patch failed; refusing to build the unpatched player'"));

  // Podfile should include single post_install patch hook.
  assert.strictEqual(count(podfile, '# MegaRadio SwiftAudioEx live-radio fix'), 1);
  assert.strictEqual(count(podfile, "system('node', radio_patch, installer.sandbox.root.to_s)"), 1);

  // Build scripts newline write fix guards.
  assert(addWatch.includes("proj.writeSync().trimEnd() + '\\n'"), 'add-watchos-target should enforce trailing newline on writes');
  assert(fixCycle.includes("content.trimEnd() + '\\n'"), 'fix-xcode-cycle should enforce trailing newline on writes');

  console.log('PASS regression_issue49_audio_and_build_scripts');
}

try {
  run();
} catch (err) {
  console.error('FAIL regression_issue49_audio_and_build_scripts:', err);
  process.exit(1);
}

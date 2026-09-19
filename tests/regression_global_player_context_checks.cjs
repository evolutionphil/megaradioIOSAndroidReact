const assert = require('assert');
const fs = require('fs');

function run() {
  const file = '/app/frontend/tvanddesktop/apple-tv-and-macos/web-preview/src/contexts/GlobalPlayerContext.tsx';
  const src = fs.readFileSync(file, 'utf8');

  // Empty URL guard to avoid .toLowerCase crash path.
  assert(src.includes("if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim())"),
    'missing empty-url guard before URL operations');
  assert(src.includes("setStreamError('This station has no stream URL')"),
    'missing explicit error state for empty URL');

  // Generation-based stale playback prevention.
  assert(src.includes('const generation = ++playGenerationRef.current;'),
    'missing play generation increment at play start');
  assert(src.includes('generation === playGenerationRef.current'),
    'missing generation equality guard before delayed play');
  assert(src.includes('playGenerationRef.current++;') && src.includes('stopStation = () => {'),
    'missing generation bump on stopStation');

  // Same-station rerender stale resolution guard in async resolve branches.
  assert(src.includes('if (generation !== playGenerationRef.current) return;'),
    'missing stale generation guard in async resolve path');

  console.log('PASS regression_global_player_context_checks');
}

try {
  run();
} catch (err) {
  console.error('FAIL regression_global_player_context_checks:', err);
  process.exit(1);
}

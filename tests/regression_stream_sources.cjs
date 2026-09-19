const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const ts = require('/app/frontend/node_modules/typescript');

function loadTsModule(tsPath) {
  const source = fs.readFileSync(tsPath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
    },
    fileName: tsPath,
  });

  const module = { exports: {} };
  const context = {
    module,
    exports: module.exports,
    require,
    console,
  };
  vm.runInNewContext(outputText, context, { filename: tsPath });
  return module.exports;
}

function run() {
  const mod = loadTsModule('/app/frontend/src/utils/streamSources.ts');
  const { buildStreamCandidates, getStationStreamUrl, isPlaylistStream } = mod;

  // actually-selected URL stays first (free/urlLow or premium/urlHigh chosen upstream)
  const freeFirst = buildStreamCandidates(
    '  http://free-low.example/stream  ',
    'http://resolved.example/hd',
    'http://free-low.example/stream',
    ['', null, undefined, 'https://backup-a.example/live', 'https://backup-a.example/live']
  );
  assert.strictEqual(freeFirst[0], 'http://free-low.example/stream');
  assert.strictEqual(
    JSON.stringify(freeFirst),
    JSON.stringify([
      'http://free-low.example/stream',
      'http://resolved.example/hd',
      'https://backup-a.example/live',
    ])
  );

  const premiumFirst = buildStreamCandidates(
    'https://premium-high.example/live',
    'https://resolved.example/live',
    'https://free-low.example/live'
  );
  assert.strictEqual(premiumFirst[0], 'https://premium-high.example/live');

  // watch mapping compatibility: camelCase and snake_case
  assert.strictEqual(
    getStationStreamUrl({ streamUrl: 'https://primary.example' }),
    'https://primary.example'
  );
  assert.strictEqual(
    getStationStreamUrl({ urlResolved: 'https://camel.example', url: 'https://fallback.example' }),
    'https://camel.example'
  );
  assert.strictEqual(
    getStationStreamUrl({ url_resolved: 'https://snake.example', url: 'https://fallback.example' }),
    'https://snake.example'
  );

  // playlist suffix with query/hash
  assert.strictEqual(isPlaylistStream('https://radio.example/stream.m3u?token=abc'), true);
  assert.strictEqual(isPlaylistStream('https://radio.example/stream.pls#signed'), true);
  assert.strictEqual(isPlaylistStream('https://radio.example/live.mp3?ref=abc'), false);

  console.log('PASS regression_stream_sources');
}

try {
  run();
} catch (err) {
  console.error('FAIL regression_stream_sources:', err);
  process.exit(1);
}

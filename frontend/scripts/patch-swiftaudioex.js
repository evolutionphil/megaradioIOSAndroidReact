// RNTP 4.1.2 pins SwiftAudioEx 1.1.0. Radio must NEVER probe static asset
// chapter/duration metadata: iOS 26 can synchronously wait ~20s in mediaserverd.
// See SwiftAudioEx #106. ICY via AVPlayerItemMetadataOutput is left intact.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MARKER = 'MEGARADIO_RADIO_ASSET_FIX_V1';
const UPSTREAM_SHA256 = 'e39f2561400166573c4970bd734dd8fd574e87695f67a74c7cebd219e7429c3c';

function patchSource(source) {
  if (source.includes(MARKER)) {
    if (/availableChapterLocales|availableMetadataFormats|asset\.duration/.test(source)) {
      throw new Error('SwiftAudioEx radio patch is incomplete; inspect native source');
    }
    return source;
  }
  const hash = crypto.createHash('sha256').update(source).digest('hex');
  if (hash !== UPSTREAM_SHA256) {
    throw new Error('Unexpected SwiftAudioEx source. Review the radio patch before building.');
  }
  const start = source.indexOf('// Load metadata keys asynchronously and separate from playable');
  const end = source.indexOf('// Load playable portion of the track and commence when ready', start);
  if (start < 0 || end < start) throw new Error('SwiftAudioEx metadata anchors missing');
  let patched = source.slice(0, start) + `// ${MARKER}: static asset metadata omitted for live radio.\n            ` + source.slice(end);
  // getProgress()/duration polling must use the already-prepared player ITEM,
  // not force a synchronous AVAsset duration load on every native progress tick.
  const oldDuration = `if let seconds = currentItem?.asset.duration.seconds, !seconds.isNaN {
            return seconds
        }
        else if let seconds = currentItem?.duration.seconds, !seconds.isNaN {`;
  if (!patched.includes(oldDuration)) throw new Error('SwiftAudioEx duration anchor missing');
  patched = patched.replace(oldDuration,
    'if let seconds = currentItem?.duration.seconds, seconds.isFinite {');
  if (/availableChapterLocales|availableMetadataFormats|asset\.duration/.test(patched)) {
    throw new Error('SwiftAudioEx synchronous asset probe remains');
  }
  return patched;
}

function applyToPods(podsRoot) {
  const root = path.join(podsRoot, 'SwiftAudioEx');
  const matches = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const filename = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(filename);
      else if (entry.name === 'AVPlayerWrapper.swift') matches.push(filename);
    }
  }
  if (!fs.existsSync(root)) throw new Error('SwiftAudioEx pod was not installed');
  walk(root);
  if (matches.length !== 1) throw new Error(`Expected one SwiftAudioEx wrapper, found ${matches.length}`);
  const file = matches[0];
  const source = fs.readFileSync(file, 'utf8');
  const patched = patchSource(source);
  if (patched !== source) {
    fs.chmodSync(file, 0o644);
    fs.writeFileSync(file, patched);
  }
  console.log('[MegaRadio] SwiftAudioEx live-radio asset fix verified');
}

if (require.main === module) applyToPods(process.argv[2] || path.join(__dirname, '../ios/Pods'));
module.exports = { patchSource, applyToPods, UPSTREAM_SHA256 };
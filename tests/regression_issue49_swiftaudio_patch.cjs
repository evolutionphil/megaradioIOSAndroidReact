const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const {
  patchSource,
  applyToPods,
  UPSTREAM_SHA256,
} = require('/app/frontend/scripts/patch-swiftaudioex.js');

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function mkPodsFixture(source, mode = 'single') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'issue49-pods-'));
  const swiftRoot = path.join(root, 'SwiftAudioEx');
  const srcDir1 = path.join(swiftRoot, 'Sources', 'Core');
  fs.mkdirSync(srcDir1, { recursive: true });
  fs.writeFileSync(path.join(srcDir1, 'AVPlayerWrapper.swift'), source);

  if (mode === 'multiple') {
    const srcDir2 = path.join(swiftRoot, 'Sources', 'Duplicate');
    fs.mkdirSync(srcDir2, { recursive: true });
    fs.writeFileSync(path.join(srcDir2, 'AVPlayerWrapper.swift'), source);
  }

  if (mode === 'missing') {
    fs.rmSync(path.join(srcDir1, 'AVPlayerWrapper.swift'));
  }
  return root;
}

function run() {
  const fixturePath = '/tmp/AVPlayerWrapper-1.1.0.swift';
  assert(fs.existsSync(fixturePath), 'Fixture missing: /tmp/AVPlayerWrapper-1.1.0.swift');
  const upstream = fs.readFileSync(fixturePath, 'utf8');

  // Validate fixture integrity matches pinned upstream.
  assert.strictEqual(sha256(upstream), UPSTREAM_SHA256, 'Upstream fixture SHA mismatch');
  assert.strictEqual(UPSTREAM_SHA256, 'e39f2561400166573c4970bd734dd8fd574e87695f67a74c7cebd219e7429c3c');

  // Primary transform checks.
  const patched = patchSource(upstream);
  assert(patched.includes('MEGARADIO_RADIO_ASSET_FIX_V1'));
  assert(!/availableChapterLocales|availableMetadataFormats|asset\.duration/.test(patched));
  assert(patched.includes('if let seconds = currentItem?.duration.seconds, seconds.isFinite {'));

  // Preserve intended duration fix behavior.
  assert(patched.includes('currentItem?.duration.seconds'));

  // Idempotent second run.
  const second = patchSource(patched);
  assert.strictEqual(second, patched, 'patchSource must be idempotent');

  // Unknown/altered source must fail closed.
  const altered = upstream.replace('class AVPlayerWrapper', 'class AVPlayerWrapperX');
  assert.throws(() => patchSource(altered), /Unexpected SwiftAudioEx source/);

  // Missing anchors must fail closed.
  const anchorBroken = upstream.replace('// Load metadata keys asynchronously and separate from playable', '// removed anchor');
  assert.throws(() => patchSource(anchorBroken), /Unexpected SwiftAudioEx source|metadata anchors missing/);

  // Apply inside temp Pods fixture only.
  const singlePods = mkPodsFixture(upstream, 'single');
  applyToPods(singlePods);
  const patchedFile = path.join(singlePods, 'SwiftAudioEx', 'Sources', 'Core', 'AVPlayerWrapper.swift');
  const once = fs.readFileSync(patchedFile, 'utf8');
  applyToPods(singlePods);
  const twice = fs.readFileSync(patchedFile, 'utf8');
  assert.strictEqual(once, twice, 'applyToPods should be idempotent');

  // Missing/multiple source file safety.
  const missingPods = mkPodsFixture(upstream, 'missing');
  assert.throws(() => applyToPods(missingPods), /Expected one SwiftAudioEx wrapper, found 0/);

  const multiplePods = mkPodsFixture(upstream, 'multiple');
  assert.throws(() => applyToPods(multiplePods), /Expected one SwiftAudioEx wrapper, found 2/);

  // CLI mode should work against temp pods root.
  const cliPods = mkPodsFixture(upstream, 'single');
  const cli = spawnSync('node', ['/app/frontend/scripts/patch-swiftaudioex.js', cliPods], {
    encoding: 'utf8',
  });
  assert.strictEqual(cli.status, 0, `CLI failed: ${cli.stderr || cli.stdout}`);

  console.log('PASS regression_issue49_swiftaudio_patch');
}

try {
  run();
} catch (err) {
  console.error('FAIL regression_issue49_swiftaudio_patch:', err);
  process.exit(1);
}

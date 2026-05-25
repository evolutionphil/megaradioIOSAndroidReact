#!/usr/bin/env node
/**
 * add-watchos-target.js
 *
 * Idempotently adds the MegaRadioWatch watchOS app target to
 * ios/MegaRadio.xcodeproj so you don't have to manually re-add it after
 * every `pod install` / `git pull`.
 *
 * Source watch files live at `frontend/watch/ios/MegaRadioWatch/` and are
 * copied (overwriting only if newer) into `frontend/ios/MegaRadioWatch/`
 * which is where Xcode expects them to be.
 *
 * What it does:
 *   1. Copies watch source files into ios/MegaRadioWatch/
 *   2. Adds the MegaRadioWatch target (WKApplication) with proper build
 *      settings (deployment target watchOS 8.0, signing inherited from
 *      main app team, bundle id com.visiongo.megaradio.watchkitapp).
 *   3. Registers every .swift / .plist / asset under that target.
 *   4. Creates the Embed Watch Content build phase on the iOS app target
 *      so the watch app is bundled inside the iPhone IPA.
 *   5. Adds the necessary target dependency.
 *
 * IDEMPOTENT — safe to re-run any number of times. Detects an existing
 * MegaRadioWatch target and exits early if found.
 *
 * Usage (from frontend/):
 *   node scripts/add-watchos-target.js
 *
 * Run AFTER `pod install` (because pod install may regenerate the pbxproj).
 */

const fs = require('fs');
const path = require('path');
const xcode = require('xcode');

const REPO_ROOT = path.resolve(__dirname, '..');
const IOS_DIR = path.join(REPO_ROOT, 'ios');
const PBX_PATH = path.join(IOS_DIR, 'MegaRadio.xcodeproj', 'project.pbxproj');
const WATCH_SRC = path.join(REPO_ROOT, 'watch', 'ios', 'MegaRadioWatch');
const WATCH_DEST = path.join(IOS_DIR, 'MegaRadioWatch');
const TARGET_NAME = 'MegaRadioWatch';
const WATCH_BUNDLE_ID = 'com.visiongo.megaradio.watchkitapp';
const MAIN_BUNDLE_ID = 'com.visiongo.megaradio';
const WATCHOS_DEPLOYMENT_TARGET = '9.0';

function log(msg) { console.log('[add-watchos-target] ' + msg); }
function fail(msg) { console.error('\u001b[31m[add-watchos-target] ERROR: ' + msg + '\u001b[0m'); process.exit(1); }

if (!fs.existsSync(PBX_PATH)) fail('pbxproj not found at: ' + PBX_PATH);
if (!fs.existsSync(WATCH_SRC)) fail('Watch source dir not found at: ' + WATCH_SRC);

// ─────────────────────────────────────────────────────────────────────
// 1. Copy watch sources into ios/MegaRadioWatch/
// ─────────────────────────────────────────────────────────────────────
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
log('Copying watch sources → ' + path.relative(REPO_ROOT, WATCH_DEST));
copyDir(WATCH_SRC, WATCH_DEST);

// Walk the destination tree and return relative paths for every regular file.
function walkFiles(dir, base = dir) {
  let out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out = out.concat(walkFiles(full, base));
    else out.push(path.relative(base, full));
  }
  return out;
}

const watchFiles = walkFiles(WATCH_DEST).filter((f) => !f.endsWith('.DS_Store'));
const swiftFiles = watchFiles.filter((f) => f.endsWith('.swift'));
const plistFiles = watchFiles.filter((f) => f.endsWith('.plist'));
const entitlementFiles = watchFiles.filter((f) => f.endsWith('.entitlements'));
const assetCatalogs = ['Assets.xcassets']; // single catalog, mounted as a folder ref

log('Found ' + swiftFiles.length + ' swift, ' + plistFiles.length + ' plist, ' + entitlementFiles.length + ' entitlements');

// ─────────────────────────────────────────────────────────────────────
// 2. Open pbxproj
// ─────────────────────────────────────────────────────────────────────
const proj = xcode.project(PBX_PATH);
proj.parseSync();

// Idempotency check — pbxTargetByName() is unreliable on freshly parsed
// projects, so we scan the native target objects directly.
function findTargetByName(name) {
  const native = proj.hash.project.objects['PBXNativeTarget'] || {};
  for (const k of Object.keys(native)) {
    if (k.endsWith('_comment')) continue;
    const t = native[k];
    if (t && (t.name === name || t.name === '"' + name + '"')) {
      return { uuid: k, target: t };
    }
  }
  return null;
}
// Scrub leaked watch sources from the iOS app target's Sources phase.
// Runs unconditionally — even on repeated invocations — so Xcode "Add Files"
// mistakes from earlier sessions (where the user accidentally ticked the
// MegaRadio target while adding watch .swift files) get cleaned up.
function scrubWatchSourcesFromIosTarget() {
  const nativeTargets = proj.hash.project.objects['PBXNativeTarget'] || {};
  let iosUuid = null;
  for (const k of Object.keys(nativeTargets)) {
    if (k.endsWith('_comment')) continue;
    const t = nativeTargets[k];
    const n = (t && t.name || '').replace(/^"|"$/g, '');
    if (n === 'MegaRadio') { iosUuid = k; break; }
  }
  if (!iosUuid) return 0;

  const iosTgt = nativeTargets[iosUuid];
  const sourcesPhases = proj.hash.project.objects['PBXSourcesBuildPhase'] || {};
  const buildFileSec = proj.pbxBuildFileSection();
  const fileRefSec = proj.pbxFileReferenceSection();
  let totalRemoved = 0;
  (iosTgt.buildPhases || []).forEach((bp) => {
    const phase = sourcesPhases[bp.value];
    if (!phase || !phase.files) return;
    const before = phase.files.length;
    phase.files = phase.files.filter((bf) => {
      const bfObj = buildFileSec[bf.value];
      if (!bfObj || !bfObj.fileRef) return true;
      const ref = fileRefSec[bfObj.fileRef];
      if (!ref) return true;
      const refPath = (ref.path || ref.name || '').replace(/^"|"$/g, '');
      // Strip anything under MegaRadioWatch/ — those belong to the watch target only.
      return !refPath.startsWith('MegaRadioWatch/');
    });
    totalRemoved += (before - phase.files.length);
  });
  return totalRemoved;
}

const scrubbed = scrubWatchSourcesFromIosTarget();
if (scrubbed > 0) {
  log('Removed ' + scrubbed + ' watch source file(s) leaked into iOS target Sources phase ✂️');
  fs.writeFileSync(PBX_PATH, proj.writeSync());
}

const existing = findTargetByName(TARGET_NAME);
if (existing) {
  log('Target "' + TARGET_NAME + '" already exists in pbxproj — nothing else to do. ✅');
  log('(Watch source files were re-synced from watch/ios/MegaRadioWatch/ above.)');
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────────
// 3. Add the MegaRadioWatch target as a watchOS application
//    (PRODUCT_TYPE = com.apple.product-type.application,
//     SDKROOT = watchos)
// ─────────────────────────────────────────────────────────────────────
log('Adding target ' + TARGET_NAME + '…');

// Create a PBXGroup so files appear under a folder in the navigator.
const groupKey = proj.pbxCreateGroup(TARGET_NAME, 'MegaRadioWatch');

const target = proj.addTarget(TARGET_NAME, 'application', TARGET_NAME, WATCH_BUNDLE_ID);

// addTarget creates an empty target with default Debug/Release configs
// pointing at iphoneos. We have to retro-fit watchOS settings.
const configList = proj.pbxXCConfigurationList()[target.uuid + '_comment'] || null;
const configListSection = proj.pbxXCConfigurationList();
let buildConfigUuids = [];
Object.keys(configListSection).forEach((k) => {
  if (k.endsWith('_comment')) return;
  const item = configListSection[k];
  if (item && Array.isArray(item.buildConfigurations) && configListSection[k + '_comment'] === 'Build configuration list for PBXNativeTarget "' + TARGET_NAME + '"') {
    buildConfigUuids = item.buildConfigurations.map((b) => b.value);
  }
});

const buildConfigSection = proj.pbxXCBuildConfigurationSection();
buildConfigUuids.forEach((uuid) => {
  const bc = buildConfigSection[uuid];
  if (!bc || !bc.buildSettings) return;
  const s = bc.buildSettings;
  s.SDKROOT = 'watchos';
  s.WATCHOS_DEPLOYMENT_TARGET = WATCHOS_DEPLOYMENT_TARGET;
  s.TARGETED_DEVICE_FAMILY = '"4"'; // 4 = Apple Watch
  s.SUPPORTED_PLATFORMS = '"watchsimulator watchos"';
  s.PRODUCT_BUNDLE_IDENTIFIER = WATCH_BUNDLE_ID;
  s.PRODUCT_NAME = '"$(TARGET_NAME)"';
  s.INFOPLIST_FILE = '"MegaRadioWatch/Info.plist"';
  s.CODE_SIGN_ENTITLEMENTS = '"MegaRadioWatch/MegaRadioWatch.entitlements"';
  s.CODE_SIGN_STYLE = 'Automatic';
  s.SWIFT_VERSION = '5.0';
  s.SWIFT_STRICT_CONCURRENCY = 'minimal';
  s.ASSETCATALOG_COMPILER_APPICON_NAME = 'AppIcon';
  s.ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = 'AccentColor';
  s.GENERATE_INFOPLIST_FILE = 'NO';
  s.ENABLE_PREVIEWS = 'YES';
  s.SKIP_INSTALL = 'NO';
  s.ENABLE_USER_SCRIPT_SANDBOXING = 'NO';
  s.IPHONEOS_DEPLOYMENT_TARGET = ''; // clear iOS-only setting
  delete s.IPHONEOS_DEPLOYMENT_TARGET;
  // Signing inheritance — picked up from project-level DEVELOPMENT_TEAM.
});

// ─────────────────────────────────────────────────────────────────────
// 4. Register watch source files under the new target
// ─────────────────────────────────────────────────────────────────────
log('Registering ' + swiftFiles.length + ' Swift source files…');
swiftFiles.forEach((rel) => {
  proj.addSourceFile('MegaRadioWatch/' + rel.replace(/\\/g, '/'), { target: target.uuid }, groupKey);
});

// Re-scrub after adding — xcode-npm's addSourceFile sometimes leaks the
// new build-file refs into BOTH targets. The unconditional scrub above
// already ran earlier but we run it once more after the fact to be safe.
scrubWatchSourcesFromIosTarget();

// Info.plist + entitlements should NOT be in Sources/Resources — Xcode picks
// them up via build settings (INFOPLIST_FILE, CODE_SIGN_ENTITLEMENTS).
// We still add them as file references so they appear in the navigator.
plistFiles.forEach((rel) => {
  proj.addFile('MegaRadioWatch/' + rel.replace(/\\/g, '/'), groupKey);
});
entitlementFiles.forEach((rel) => {
  proj.addFile('MegaRadioWatch/' + rel.replace(/\\/g, '/'), groupKey);
});

// Asset catalog → manual low-level registration.
// xcode-npm's addResourceFile has a bug where it calls pbxGroupByName(uuid)
// expecting a name, returns null, then crashes. We replicate the work it
// would have done by hand: create PBXFileReference (folder.assetcatalog),
// PBXBuildFile, and append to the watch target's PBXResourcesBuildPhase.
log('Registering Assets.xcassets…');

const xcassetsRelPath = 'MegaRadioWatch/Assets.xcassets';
const xcassetsFileRefUuid = proj.generateUuid();
const xcassetsBuildFileUuid = proj.generateUuid();

// PBXFileReference
const fileRefSection = proj.pbxFileReferenceSection();
fileRefSection[xcassetsFileRefUuid] = {
  isa: 'PBXFileReference',
  lastKnownFileType: 'folder.assetcatalog',
  name: 'Assets.xcassets',
  path: xcassetsRelPath,
  sourceTree: '"<group>"',
};
fileRefSection[xcassetsFileRefUuid + '_comment'] = 'Assets.xcassets';

// PBXBuildFile
const buildFileSection = proj.pbxBuildFileSection();
buildFileSection[xcassetsBuildFileUuid] = {
  isa: 'PBXBuildFile',
  fileRef: xcassetsFileRefUuid,
  fileRef_comment: 'Assets.xcassets',
};
buildFileSection[xcassetsBuildFileUuid + '_comment'] = 'Assets.xcassets in Resources';

// Append the file ref to the MegaRadioWatch group
const groupSection = proj.hash.project.objects['PBXGroup'];
if (groupSection && groupSection[groupKey]) {
  groupSection[groupKey].children = groupSection[groupKey].children || [];
  groupSection[groupKey].children.push({
    value: xcassetsFileRefUuid,
    comment: 'Assets.xcassets',
  });
}

// Find the watch target's PBXResourcesBuildPhase and append our build file.
// xcode-npm's addTarget() doesn't always create a Resources phase. If
// missing, synthesize one and wire it into the target's buildPhases list.
const watchTargetObj = proj.hash.project.objects['PBXNativeTarget'][target.uuid];
let resourcesPhaseUuid = (watchTargetObj.buildPhases || [])
  .map((bp) => bp.value)
  .find((uuid) => {
    const phase = proj.hash.project.objects['PBXResourcesBuildPhase'];
    return phase && phase[uuid];
  });
if (!resourcesPhaseUuid) {
  resourcesPhaseUuid = proj.generateUuid();
  if (!proj.hash.project.objects['PBXResourcesBuildPhase']) {
    proj.hash.project.objects['PBXResourcesBuildPhase'] = {};
  }
  proj.hash.project.objects['PBXResourcesBuildPhase'][resourcesPhaseUuid] = {
    isa: 'PBXResourcesBuildPhase',
    buildActionMask: 2147483647,
    files: [],
    runOnlyForDeploymentPostprocessing: 0,
  };
  proj.hash.project.objects['PBXResourcesBuildPhase'][resourcesPhaseUuid + '_comment'] = 'Resources';
  watchTargetObj.buildPhases = watchTargetObj.buildPhases || [];
  watchTargetObj.buildPhases.push({ value: resourcesPhaseUuid, comment: 'Resources' });
}
const phase = proj.hash.project.objects['PBXResourcesBuildPhase'][resourcesPhaseUuid];
phase.files = phase.files || [];
phase.files.push({
  value: xcassetsBuildFileUuid,
  comment: 'Assets.xcassets in Resources',
});

// ─────────────────────────────────────────────────────────────────────
// 5. Embed Watch Content build phase on the iOS app target
//
// xcode-npm's addBuildPhase mangles the dstPath / dstSubfolderSpec values
// for "watch_app", producing builds with $(CONTENTS_FOLDER_PATH) duplicated
// (e.g. MegaRadio.app/MegaRadio.app/Watch/MegaRadioWatch.app — a build
// cycle). We hand-roll the PBXCopyFilesBuildPhase to guarantee the canonical
// "$(CONTENTS_FOLDER_PATH)/Watch" copy-into-wrapper pattern Xcode generates
// from its own UI.
// ─────────────────────────────────────────────────────────────────────
log('Adding Embed Watch Content phase to MegaRadio (iOS) target…');
// pbxTargetByName returns { uuid, target } on success but signature changes
// between xcode-npm versions. Look up the iOS native target directly.
let iosTargetUuidFinal = null;
{
  const nt = proj.hash.project.objects['PBXNativeTarget'] || {};
  for (const k of Object.keys(nt)) {
    if (k.endsWith('_comment')) continue;
    const t = nt[k];
    const n = (t && t.name || '').replace(/^"|"$/g, '');
    if (n === 'MegaRadio') { iosTargetUuidFinal = k; break; }
  }
}
if (!iosTargetUuidFinal) fail('Main "MegaRadio" target not found — pbxproj corrupt?');
const iosTargetObj = proj.hash.project.objects['PBXNativeTarget'][iosTargetUuidFinal];

// PBXBuildFile for the watch product wrapper (the .app)
const watchProductRef = target.pbxNativeTarget.productReference;
const watchProductName = target.pbxNativeTarget.productReference_comment || (TARGET_NAME + '.app');
const embedBuildFileUuid = proj.generateUuid();
proj.pbxBuildFileSection()[embedBuildFileUuid] = {
  isa: 'PBXBuildFile',
  fileRef: watchProductRef,
  fileRef_comment: watchProductName,
  settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] },
};
proj.pbxBuildFileSection()[embedBuildFileUuid + '_comment'] = watchProductName + ' in Embed Watch Content';

// PBXCopyFilesBuildPhase — dstPath relative to wrapper, dstSubfolderSpec=16 (Wrapper)
const embedPhaseUuid = proj.generateUuid();
if (!proj.hash.project.objects['PBXCopyFilesBuildPhase']) {
  proj.hash.project.objects['PBXCopyFilesBuildPhase'] = {};
}
proj.hash.project.objects['PBXCopyFilesBuildPhase'][embedPhaseUuid] = {
  isa: 'PBXCopyFilesBuildPhase',
  buildActionMask: 2147483647,
  dstPath: '"$(CONTENTS_FOLDER_PATH)/Watch"',
  dstSubfolderSpec: 1, // 1 = Wrapper (resolves to wrapper root, ie MegaRadio.app)
  files: [
    { value: embedBuildFileUuid, comment: watchProductName + ' in Embed Watch Content' },
  ],
  name: '"Embed Watch Content"',
  runOnlyForDeploymentPostprocessing: 0,
};
proj.hash.project.objects['PBXCopyFilesBuildPhase'][embedPhaseUuid + '_comment'] = 'Embed Watch Content';

// Append the phase to the iOS target's buildPhases list (at the END so it
// runs after Code Sign etc. — Xcode default for embed phases).
iosTargetObj.buildPhases = iosTargetObj.buildPhases || [];
iosTargetObj.buildPhases.push({
  value: embedPhaseUuid,
  comment: 'Embed Watch Content',
});

// ─────────────────────────────────────────────────────────────────────
// 6. Target dependency: iOS app → watch app
// ─────────────────────────────────────────────────────────────────────
log('Adding target dependency: MegaRadio → MegaRadioWatch…');
proj.addTargetDependency(iosTargetUuidFinal, [target.uuid]);

// ─────────────────────────────────────────────────────────────────────
// 7. Save
// ─────────────────────────────────────────────────────────────────────
fs.writeFileSync(PBX_PATH, proj.writeSync());

// ─────────────────────────────────────────────────────────────────────
// 8. Run fix-xcode-cycle.js automatically
//
// The RNGoogleMobileAds CocoaPods [CP-User] script phase declares
// inputPaths/outputPaths that reference Info.plist, which creates a build
// cycle with our newly-added Embed Watch Content phase. fix-xcode-cycle.js
// clears those phantom paths and tags every [CP-User] phase with
// `alwaysOutOfDate = 1`, which is the canonical fix recommended by both
// CocoaPods and the React Native Firebase docs.
// ─────────────────────────────────────────────────────────────────────
try {
  log('');
  log('Running fix-xcode-cycle.js to scrub [CP-User] cycles…');
  require('./fix-xcode-cycle.js');
} catch (e) {
  log('  warning: fix-xcode-cycle.js failed: ' + (e && e.message ? e.message : String(e)));
  log('  please run it manually: node scripts/fix-xcode-cycle.js');
}

log('');
log('✅ MegaRadioWatch target added successfully.');
log('');
log('Next steps:');
log('  1. Open ios/MegaRadio.xcworkspace in Xcode');
log('  2. Select the MegaRadioWatch target → Signing & Capabilities');
log('     → set your Team if it didn\'t inherit');
log('  3. Build & Run on the "Apple Watch Series X" simulator');
log('');
log('To remove the target, just delete this script\'s output by either:');
log('  - reverting project.pbxproj via git, or');
log('  - re-running expo prebuild --clean (will rebuild ios/)');

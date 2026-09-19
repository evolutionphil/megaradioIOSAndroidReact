const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('/app/frontend/node_modules/typescript');

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

function compileTsModule(tsPath, mocks = {}, globals = {}) {
  const source = read(tsPath);
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
    fileName: tsPath,
  }).outputText;

  const module = { exports: {} };
  const dirname = path.dirname(tsPath);
  const localRequire = (spec) => {
    if (spec in mocks) return mocks[spec];
    if (spec.startsWith('.')) {
      const resolved = path.resolve(dirname, spec);
      if (resolved in mocks) return mocks[resolved];
    }
    throw new Error(`Missing mock for require(\"${spec}\")`);
  };

  const context = {
    module,
    exports: module.exports,
    require: localRequire,
    __filename: tsPath,
    __dirname: dirname,
    console,
    setTimeout,
    clearTimeout,
    URL,
    ...globals,
  };
  vm.runInNewContext(transpiled, context, { filename: tsPath });
  return module.exports;
}

function createHookRuntime() {
  const state = [];
  const deps = [];
  const pendingEffects = [];
  let hookIndex = 0;

  function beginRender() {
    hookIndex = 0;
  }

  function useState(initialValue) {
    const index = hookIndex++;
    if (!(index in state)) state[index] = initialValue;
    const setState = (next) => {
      state[index] = typeof next === 'function' ? next(state[index]) : next;
    };
    return [state[index], setState];
  }

  function useEffect(effectFn, effectDeps) {
    const index = hookIndex++;
    const prev = deps[index];
    const changed = !prev || !effectDeps || effectDeps.some((d, i) => d !== prev[i]);
    if (changed) {
      deps[index] = effectDeps;
      pendingEffects.push(effectFn);
    }
  }

  function flushEffects() {
    while (pendingEffects.length > 0) {
      const fn = pendingEffects.shift();
      fn();
    }
  }

  return { beginRender, useState, useEffect, flushEffects };
}

function createImageHarness() {
  const runtime = createHookRuntime();
  const reactMock = {
    createElement(type, props, ...children) {
      return { type, props: { ...(props || {}), children } };
    },
    useState: runtime.useState,
    useEffect: runtime.useEffect,
  };
  reactMock.default = reactMock;

  const mod = compileTsModule('/app/frontend/src/components/ImageWithFallback.tsx', {
    react: reactMock,
    'expo-image': { Image: (props) => ({ type: 'ExpoImage', props }) },
    '../utils/stationLogoHelper': {
      DEFAULT_STATION_LOGO_SOURCE: 'LOCAL_FALLBACK',
      DEFAULT_STATION_LOGO_URL: 'https://themegaradio.com/logo.png',
    },
  });

  function render(props) {
    runtime.beginRender();
    const out = mod.ImageWithFallback(props);
    runtime.flushEffects();
    return out;
  }
  return { render };
}

async function run() {
  // ---------- publicDirectoryService executable tests ----------
  const directoryMod = compileTsModule('/app/frontend/src/services/publicDirectoryService.ts', {
    './api': { __esModule: true, default: { get: async () => ({ data: { data: [] } }) } },
    '../constants/api': { API_ENDPOINTS: { publicProfiles: '/api/public-profiles' } },
  });

  const { normalizeDirectory, mergeDirectoryPages, nextDirectoryPage } = directoryMod;

  const normalized = normalizeDirectory({
    data: [
      { _id: 'u1', name: 'Alpha', isPublicProfile: true },
      { _id: 'u2', fullName: 'Beta', isPublicProfile: true },
      { _id: 'u2', name: 'Beta Duplicate', isPublicProfile: true },
      { _id: 'u3', name: 'Private', isPublicProfile: false },
      { _id: '', name: 'NoId', isPublicProfile: true },
    ],
  });
  assert.strictEqual(JSON.stringify(normalized.map((u) => u._id)), JSON.stringify(['u1', 'u2']));
  assert(['Beta', 'Beta Duplicate'].includes(normalized[1].name));

  const page1 = { page: 1, rawCount: 100, users: Array.from({ length: 100 }, (_, i) => ({ _id: `id-${i}`, name: `N${i}` })) };
  const page2Distinct = { page: 2, rawCount: 100, users: Array.from({ length: 100 }, (_, i) => ({ _id: `id-${100 + i}`, name: `N${100 + i}` })) };
  const page2Repeated = { page: 2, rawCount: 100, users: Array.from({ length: 100 }, (_, i) => ({ _id: `id-${i}`, name: `Dup${i}` })) };
  assert.strictEqual(nextDirectoryPage(page1, [page1]), 2);
  assert.strictEqual(nextDirectoryPage(page2Distinct, [page1, page2Distinct]), 3);
  assert.strictEqual(nextDirectoryPage(page2Repeated, [page1, page2Repeated]), undefined);

  const merged = mergeDirectoryPages([page1, page2Repeated]);
  assert.strictEqual(merged.length, 100, 'duplicate page must not create duplicate rows');

  // ---------- incomingLinks pure resolver tests ----------
  const incoming = compileTsModule('/app/frontend/src/utils/incomingLinks.ts', {
    'expo-constants': {
      __esModule: true,
      default: { expoConfig: { extra: { websiteUrl: 'https://themegaradio.com' } } },
      expoConfig: { extra: { websiteUrl: 'https://themegaradio.com' } },
    },
  });
  const { incomingLinkPath } = incoming;

  assert.strictEqual(incomingLinkPath('https://themegaradio.com/station/rock-fm'), '/open-link?type=station&identifier=rock-fm');
  assert.strictEqual(incomingLinkPath('https://themegaradio.com/tr/station/rock-fm'), '/open-link?type=station&identifier=rock-fm');
  assert.strictEqual(incomingLinkPath('https://themegaradio.com/user/123abc'), '/open-link?type=user&identifier=123abc');
  assert.strictEqual(incomingLinkPath('https://themegaradio.com/en/user/slug-user'), '/open-link?type=user&identifier=slug-user');
  assert.strictEqual(incomingLinkPath('https://themegaradio.com/genre/chill'), '/genre-detail?slug=chill');
  assert.strictEqual(incomingLinkPath('megaradio://station/68abc'), '/open-link?type=station&identifier=68abc');
  assert.strictEqual(incomingLinkPath('megaradio://user/slugx'), '/open-link?type=user&identifier=slugx');
  assert.strictEqual(incomingLinkPath('megaradio://genre/lounge'), '/genre-detail?slug=lounge');
  assert.strictEqual(incomingLinkPath('megaradio://?playLast=1'), 'megaradio://?playLast=1');
  assert.strictEqual(incomingLinkPath('megaradio://play?q=rock'), 'megaradio://play?q=rock');
  assert.strictEqual(incomingLinkPath('https://accounts.google.com/o/oauth2/v2/auth'), 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.strictEqual(incomingLinkPath('/player'), '/player');
  assert.strictEqual(incomingLinkPath('https://themegaradio.com/station/%2Fetc%2Fpasswd'), '/link-error');
  assert.strictEqual(incomingLinkPath('https://themegaradio.com/station/../x'), '/link-error');
  assert.strictEqual(incomingLinkPath('https://themegaradio.com/user/%2e%2e/x'), '/link-error');
  assert.strictEqual(incomingLinkPath('https://themegaradio.com/user/%252e%252e/x'), '/link-error');
  assert.strictEqual(incomingLinkPath('https://themegaradio.com/user/%2Fx'), '/link-error');
  assert.strictEqual(
    incomingLinkPath('https://themegaradio.com/station/rock-fm?note=v1.2.3...ok'),
    '/open-link?type=station&identifier=rock-fm'
  );
  const traversalResult = incomingLinkPath('https://themegaradio.com/station/../x');

  const nativeIntentSource = read('/app/frontend/app/+native-intent.tsx');
  assert(nativeIntentSource.includes('incomingLinkPath(path)'));

  // ---------- profileShare helper + profile share UI binding ----------
  let profileCalls = [];
  const profileShare = compileTsModule('/app/frontend/src/utils/profileShare.ts', {
    'expo-constants': {
      __esModule: true,
      default: { expoConfig: { extra: { websiteUrl: 'https://themegaradio.com' } } },
      expoConfig: { extra: { websiteUrl: 'https://themegaradio.com' } },
    },
    '../services/userService': {
      __esModule: true,
      default: {
        getProfile: async (idOrSlug) => {
          profileCalls.push(idOrSlug);
          if (idOrSlug === 'private-id') return { isPublicProfile: false };
          if (idOrSlug === 'err-id') throw new Error('network');
          return { _id: 'pub-id', isPublicProfile: true, name: 'Public User' };
        },
      },
    },
  });

  const shared = await profileShare.profileShareContent({ _id: 'id-1', slug: 'slug-1', name: 'Name1' });
  assert.strictEqual(profileCalls[0], 'slug-1', 'slug must be preferred when available');
  assert.strictEqual(shared.url, 'https://themegaradio.com/user/slug-1');
  assert.strictEqual((shared.message.match(/https:\/\//g) || []).length, 1, 'message must contain exactly one HTTPS URL');

  const sharedById = await profileShare.profileShareContent({ _id: 'id-only', name: 'OnlyId' });
  assert.strictEqual(sharedById.url, 'https://themegaradio.com/user/id-only');

  await assert.rejects(() => profileShare.profileShareContent({}), /giriş/i);
  await assert.rejects(() => profileShare.profileShareContent({ _id: 'private-id' }), /herkese açık/i);
  await assert.rejects(() => profileShare.profileShareContent({ _id: 'err-id' }), /network/i);

  const profileScreenSource = read('/app/frontend/app/(tabs)/profile.tsx');
  assert(profileScreenSource.includes('testID="profile-share-button"'));
  assert(profileScreenSource.includes('Share.share({ title, message })'), 'Share payload must avoid separate url field');

  // ---------- Community directory wiring checks ----------
  const communitySource = read('/app/frontend/src/components/CommunityDirectory.tsx');
  assert(communitySource.includes('Arama yüklenen profillerde yapılır.'), 'Search must clearly state loaded-profiles scope');
  assert(communitySource.includes('<AvatarWithFallback uri={item.profileImageUrl || item.profilePhoto || item.avatar} size={52}'));
  assert(read('/app/frontend/app/users.tsx').includes('CommunityDirectory'));
  assert(read('/app/frontend/app/public-profiles.tsx').includes('CommunityDirectory'));

  const followingSource = read('/app/frontend/src/hooks/useDirectoryFollowing.ts');
  assert(followingSource.includes('megaradio_follow_status:user:${owner}'));
  assert(followingSource.includes('Array.from({ length: 4 }'));
  assert(followingSource.includes('revision === (revisions.current[id] || 0)'));
  assert(followingSource.includes('Authorization: `Bearer ${token}`'));

  // ---------- Image fallback behavior for default logo URL + query ----------
  const img = createImageHarness();
  const logoDefault = 'https://themegaradio.com/logo.png?cachebust=1';
  const render1 = img.render({ uri: logoDefault, resizeMode: 'cover', style: { width: 48, height: 48 } });
  assert.strictEqual(render1.props.source, 'LOCAL_FALLBACK');
  assert.strictEqual(render1.props.contentFit, 'contain', 'default logo fallback must force contain');

  let render2 = img.render({ uri: 'https://bad-primary.example/logo.png', fallbackUri: 'https://bad-fallback.example/logo.png' });
  render2.props.onError?.({ nativeEvent: {} });
  render2 = img.render({ uri: 'https://bad-primary.example/logo.png', fallbackUri: 'https://bad-fallback.example/logo.png' });
  render2.props.onError?.({ nativeEvent: {} });
  render2 = img.render({ uri: 'https://bad-primary.example/logo.png', fallbackUri: 'https://bad-fallback.example/logo.png' });
  assert.strictEqual(render2.props.source, 'LOCAL_FALLBACK');

  const openLinkSource = read('/app/frontend/app/open-link.tsx');
  assert(openLinkSource.includes("state.currentStation?._id !== station._id || state.playbackState !== 'playing'"), 'same station must not toggle pause');
  assert(openLinkSource.includes("router.replace('/player')"));

  // Keep security expectation as final gate so earlier assertions still execute.
  assert.strictEqual(traversalResult, '/link-error');

  console.log('PASS regression_issue51_directory_links_share_logo');
}

run().catch((err) => {
  console.error('FAIL regression_issue51_directory_links_share_logo:', err);
  process.exit(1);
});

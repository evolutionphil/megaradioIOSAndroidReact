const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const ts = require('/app/frontend/node_modules/typescript/lib/typescript.js');

let assertions = 0;
const check = (condition, message) => {
  assertions += 1;
  assert.ok(condition, message);
};

function runTs(file, source, globals = {}) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
    fileName: file,
  }).outputText;
  const sandbox = {
    module: { exports: {} },
    exports: {},
    require,
    console,
    URL,
    URLSearchParams,
    ...globals,
  };
  vm.runInNewContext(compiled, sandbox, { filename: file });
  return sandbox.module.exports;
}

function testNormalizeHashQuery() {
  const file = '/app/frontend/tvanddesktop/apple-tv-and-macos/web-preview/src/lib/normalizeHashQuery.ts';
  const source = `${fs.readFileSync(file, 'utf8')}\nmodule.exports = { normalizeHashQuery };`;

  const firstHref = 'https://example.com/api/tv-app/?lang=en&station=OLD#/radio-playing?station=NEW&q=jazz';
  const historyCalls = [];
  const windowMock = {
    location: { href: firstHref, hash: '#/radio-playing?station=NEW&q=jazz' },
    history: {
      state: { mock: true },
      replaceState: (_state, _title, href) => {
        historyCalls.push(href);
        const u = new URL(href);
        windowMock.location.href = href;
        windowMock.location.hash = u.hash;
      },
    },
  };

  const { normalizeHashQuery } = runTs(file, source, { window: windowMock });
  normalizeHashQuery();

  check(historyCalls.length === 1, 'normalizeHashQuery should rewrite direct hash-query URLs');
  const normalized = new URL(historyCalls[0]);
  check(normalized.hash === '#/radio-playing', 'hash query should be stripped from hash path');
  check(normalized.searchParams.get('lang') === 'en', 'unrelated existing query should be preserved');
  check(normalized.searchParams.get('station') === 'NEW', 'hash query should override conflicting search values');
  check(normalized.searchParams.get('q') === 'jazz', 'hash query value should be promoted to search params');

  // No hash query: no-op
  const noopCalls = [];
  const noopWindow = {
    location: { href: 'https://example.com/api/tv-app/?q=rock#/search', hash: '#/search' },
    history: { state: null, replaceState: (...args) => noopCalls.push(args) },
  };
  const { normalizeHashQuery: normalizeNoop } = runTs(file, source, { window: noopWindow });
  normalizeNoop();
  check(noopCalls.length === 0, 'normalizeHashQuery should be noop when hash has no query');
}

function testIsTvBackKey() {
  const file = '/app/frontend/tvanddesktop/apple-tv-and-macos/web-preview/src/lib/navigationRestore.ts';
  const raw = fs.readFileSync(file, 'utf8');
  const source = `${raw
    .replace("import type { NavigationState } from '@/contexts/NavigationContext';", '')
    .replace("import { revealTvItem } from './tvLayout';", '')}\nmodule.exports = { isTvBackKey };`;
  const { isTvBackKey } = runTs(file, source);

  check(isTvBackKey({ key: 'Escape', keyCode: 27 }), 'Escape should be treated as TV back');
  check(isTvBackKey({ key: 'Backspace', keyCode: 8 }), 'Backspace should be treated as TV back');
  check(isTvBackKey({ key: 'BrowserBack', keyCode: 166 }), 'BrowserBack should be treated as TV back');
  check(isTvBackKey({ key: 'GoBack', keyCode: 0 }), 'GoBack should be treated as TV back');
  check(isTvBackKey({ key: '', keyCode: 461 }), 'Samsung RETURN keyCode 461 should be treated as back');
  check(isTvBackKey({ key: '', keyCode: 10009 }), 'Tizen RETURN keyCode 10009 should be treated as back');
  check(isTvBackKey({ key: '', keyCode: 4 }), 'Android BACK keyCode 4 should be treated as back');
  check(!isTvBackKey({ key: 'Enter', keyCode: 13 }), 'Enter must not be treated as back');
}

testNormalizeHashQuery();
testIsTvBackKey();

console.log(`PASS regression_iteration59_navigation_helpers (${assertions} assertions)`);

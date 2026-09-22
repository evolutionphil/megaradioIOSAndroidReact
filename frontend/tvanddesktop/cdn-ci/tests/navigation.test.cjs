const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const preview = path.resolve(__dirname, '../../apple-tv-and-macos/web-preview');
const ts = require(path.join(preview, 'node_modules/typescript'));
const jsx = (type, props) => ({ type, props });

function load(file, globals = {}, modules = {}) {
  const source = fs.readFileSync(path.join(preview, 'src', file), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const sandbox = { exports: {}, ...globals, require(name) {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name in modules) return modules[name];
    throw new Error(`Unexpected import ${name}`);
  } };
  vm.runInNewContext(output, sandbox);
  return sandbox.exports;
}

function router(hash) {
  const window = { location: { hash } };
  const { FocusRouterProvider } = load('contexts/FocusRouterContext.tsx', { window }, { react: {
    createContext: () => ({ Provider: 'Provider' }), useRef: v => ({ current: v }), useEffect: fn => fn(),
  } });
  return FocusRouterProvider({ children: null }).props.value;
}
function arrow(code, target = { tagName: 'DIV' }) {
  return { keyCode: code, key: { 37: 'ArrowLeft', 38: 'ArrowUp', 39: 'ArrowRight', 40: 'ArrowDown' }[code],
    target, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
}

for (const route of ['/discover-no-user', '/genres', '/radio-playing?station=123', '/genre-list/jazz', '/favorites', '/search']) {
  test(`${route}: routed arrows move page focus once and never scroll the stale browser focus`, () => {
    const r = router(`#${route}`);
    const handlerRoute = route.startsWith('/genre-list/') ? '/genre-list' : route.split('?')[0];
    let moves = 0, unintendedScroll = 0;
    r.registerHandler(handlerRoute, e => {
      assert.equal(e.defaultPrevented, false, 'page must receive the event before cancellation');
      moves++;
    });
    for (const code of [37, 38, 39, 40]) {
      const e = arrow(code, { tagName: 'DIV', dataset: { testid: 'card-foryou-old-focus' } });
      r.dispatch(e);
      // Browser default scrolling runs after bubbling listeners, if not cancelled.
      if (!e.defaultPrevented) unintendedScroll++;
    }
    assert.equal(moves, 4);
    assert.equal(unintendedScroll, 0);
  });
}
test('router preserves native text editing and leaves unregistered routes alone', () => {
  const r = router('#/search');
  r.registerHandler('/search', () => {});
  for (const target of [{ tagName: 'INPUT' }, { tagName: 'TEXTAREA' }, { tagName: 'SELECT' }, { tagName: 'DIV', isContentEditable: true }]) {
    const e = arrow(37, target); r.dispatch(e); assert.equal(e.defaultPrevented, false);
  }
  r.unregisterHandler('/search');
  const e = arrow(40); r.dispatch(e); assert.equal(e.defaultPrevented, false);
});
test('routed Enter and media keys retain page-owned handling', () => {
  const r = router('#/discover-no-user');
  r.registerHandler('/discover-no-user', () => {});
  const enter = { ...arrow(13), key: 'Enter' }; r.dispatch(enter); assert.equal(enter.defaultPrevented, false);
});

const { revealTvItem, revealTvItemHorizontally } = load('lib/tvLayout.ts');
function container(scale = 1) {
  const calls = [];
  return { calls, scrollTop: 100, scrollLeft: 200, offsetWidth: 1000, offsetHeight: 600,
    getBoundingClientRect: () => ({ top: 100, bottom: 100 + 600 * scale, height: 600 * scale,
      left: 200, right: 200 + 1000 * scale, width: 1000 * scale }),
    scrollTo(options) { calls.push(options); },
  };
}
const card = bounds => ({ getBoundingClientRect: () => bounds });
test('fully visible cards and subpixel rounding do not start extra scroll animations', () => {
  const c = container();
  const item = card({ top: 124, bottom: 676, left: 212, right: 1188.5 });
  revealTvItem(c, item, 24, 24, 'smooth'); revealTvItemHorizontally(c, item);
  assert.equal(c.calls.length, 0);
});
test('vertical reveal accounts for display scale and keeps horizontal position untouched', () => {
  const c = container(.5);
  revealTvItem(c, card({ top: 350, bottom: 500 }), 20, 0, 'smooth');
  assert.equal(c.calls[0].top, 300);
  assert.equal(c.calls[0].behavior, 'smooth');
  assert.equal(c.calls[0].left, undefined);
  assert.equal(c.scrollLeft, 200);
});
test('instant restore keeps its original scrollTop behavior', () => {
  const c = container(.5);
  revealTvItem(c, card({ top: 350, bottom: 500 }), 20, 0);
  assert.equal(c.scrollTop, 300); assert.equal(c.calls.length, 0);
});
test('horizontal reveal uses real scaled bounds instead of a guessed card stride', () => {
  const c = container(.5);
  revealTvItemHorizontally(c, card({ left: 650, right: 790 }));
  assert.equal(c.calls[0].left, 392);
  assert.equal(c.calls[0].top, undefined);
  const otherRow = container();
  assert.equal(otherRow.calls.length, 0);
  assert.equal(c.scrollTop, 100);
});
test('horizontal left reveal includes the focus-ring gap', () => {
  const c = container();
  revealTvItemHorizontally(c, card({ left: 190, right: 390 }));
  assert.equal(c.calls[0].left, 178);
});
test('carousel edge visibility bails out while scrolling between the same edges', () => {
  const listeners = {};
  let edges;
  let changes = 0;
  const element = { scrollLeft: 100, scrollWidth: 2400, clientWidth: 1580,
    addEventListener: (name, fn) => { listeners[name] = fn; }, removeEventListener() {},
  };
  const { HorizontalScrollCues } = load('components/HorizontalScrollCues.tsx', {
    window: { addEventListener() {}, removeEventListener() {} },
    requestAnimationFrame: fn => { fn(); return 1; }, cancelAnimationFrame() {},
  }, { react: {
    useState: initial => { edges = initial; return [edges, fn => {
      const next = fn(edges); if (next !== edges) changes++; edges = next;
    }]; }, useEffect: fn => fn(),
  }, 'lucide-react': { ChevronLeft: 'left', ChevronRight: 'right' } });
  HorizontalScrollCues({ id: 'test', scrollRef: { current: element }, count: 12 });
  assert.equal(changes, 1);
  for (let x = 110; x < 700; x += 10) { element.scrollLeft = x; listeners.scroll(); }
  assert.equal(changes, 1, 'no React update for each smooth-scroll frame');
  element.scrollLeft = 820; listeners.scroll();
  assert.equal(changes, 2);
});

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const ts = require('/app/frontend/node_modules/typescript/lib/typescript.js');

const file = '/app/frontend/tvanddesktop/apple-tv-and-macos/web-preview/src/lib/tvLayout.ts';
const source = fs.readFileSync(file, 'utf8');
const augmented = `${source}\nmodule.exports = { revealTvItem, contentBottomInset, TV_LAYOUT };`;

const compiled = ts.transpileModule(augmented, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
  },
  fileName: file,
}).outputText;

const sandbox = { module: { exports: {} }, exports: {}, require, console };
vm.runInNewContext(compiled, sandbox, { filename: file });
const { revealTvItem, contentBottomInset, TV_LAYOUT } = sandbox.module.exports;

let assertions = 0;
function check(condition, message) {
  assertions += 1;
  assert.ok(condition, message);
}

function makeContainer({ top, bottom, offsetHeight, scrollTop }) {
  return {
    offsetHeight,
    scrollTop,
    getBoundingClientRect() {
      return { top, bottom, height: bottom - top };
    },
  };
}

function makeItem({ top, bottom }) {
  return {
    getBoundingClientRect() {
      return { top, bottom, height: bottom - top };
    },
  };
}

// Regression critical: scaled viewport (0.5) + 100 physical px bottom overflow
// should translate to 200 scrollTop delta, not 100.
const scaledContainer = makeContainer({ top: 100, bottom: 400, offsetHeight: 600, scrollTop: 0 });
const overflowItem = makeItem({ top: 350, bottom: 500 }); // 100px below viewport bottom
revealTvItem(scaledContainer, overflowItem, 20, 0);
check(scaledContainer.scrollTop === 200, `Expected 200 scroll delta at scale 0.5, got ${scaledContainer.scrollTop}`);

// Unscaled sanity: same 100 overflow at scale 1 should move 100.
const normalContainer = makeContainer({ top: 100, bottom: 700, offsetHeight: 600, scrollTop: 0 });
const normalItem = makeItem({ top: 650, bottom: 800 });
revealTvItem(normalContainer, normalItem, 20, 0);
check(normalContainer.scrollTop === 100, `Expected 100 scroll delta at scale 1, got ${normalContainer.scrollTop}`);

// Top reveal path should scroll up when item is above by scaled gap.
const upContainer = makeContainer({ top: 100, bottom: 400, offsetHeight: 600, scrollTop: 300 });
const topItem = makeItem({ top: 80, bottom: 220 });
revealTvItem(upContainer, topItem, 20, 24);
check(upContainer.scrollTop < 300, 'Expected upward scroll adjustment when item is above visible window');

// Inset helper invariants used by page geometry checks.
check(contentBottomInset(true) === TV_LAYOUT.playerHeight + TV_LAYOUT.bottomGap, 'contentBottomInset(true) mismatch');
check(contentBottomInset(false) === TV_LAYOUT.bottomGap, 'contentBottomInset(false) mismatch');

console.log(`PASS regression_iteration57_reveal_tv_layout (${assertions} assertions)`);

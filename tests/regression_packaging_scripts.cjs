const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { rewritePackagedAssets } = require('/app/frontend/tvanddesktop/_shared/packaged-assets.js');

function testPackagedAssetsRewrite() {
  const rootHtml = '<link href="/api/tv-app/assets/app.css"><script src="https://cdn.example.com/api/tv-app/app.js"></script>';
  const rewrittenRoot = rewritePackagedAssets(rootHtml, '/tmp/pkg/index.html', '/tmp/pkg/app');
  assert(rewrittenRoot.includes('href="app/assets/app.css"'));
  assert(rewrittenRoot.includes('https://cdn.example.com/api/tv-app/app.js'), 'absolute URLs must be preserved');

  const nestedCss = 'body{background:url("/api/tv-app/images/bg.png")}';
  const rewrittenNested = rewritePackagedAssets(nestedCss, '/tmp/pkg/app/assets/styles/site.css', '/tmp/pkg/app');
  assert(rewrittenNested.includes('url("../../images/bg.png")'));
}

function runPrepareScriptWithDoubles(scriptPath, fileMap) {
  const source = fs.readFileSync(scriptPath, 'utf8');
  const captured = { execCalls: [], exitCode: null };

  const mockFs = {
    existsSync(p) {
      if (p === '/bin/bash') return true;
      return fileMap[p] !== undefined;
    },
    readFileSync(p) {
      if (!(p in fileMap)) throw new Error(`missing fixture: ${p}`);
      return fileMap[p];
    },
    writeFileSync() {},
    mkdirSync() {},
    rmSync() {},
    readdirSync() { return []; },
    copyFileSync() {},
  };

  const mockChildProcess = {
    execSync(cmd, options) {
      captured.execCalls.push({ cmd, options });
      throw new Error('simulated build failure');
    },
  };

  const contextProcess = {
    env: {},
    platform: 'linux',
    exit(code) {
      captured.exitCode = code;
      throw new Error(`EXIT_${code}`);
    },
  };

  function localRequire(spec) {
    if (spec === 'fs') return mockFs;
    if (spec === 'path') return path;
    if (spec === 'child_process') return mockChildProcess;
    if (spec === '../_shared/packaged-assets') return { rewritePackagedAssets: (s) => s };
    throw new Error(`unexpected require: ${spec}`);
  }

  try {
    vm.runInNewContext(source, {
      require: localRequire,
      console,
      process: contextProcess,
      __dirname: path.dirname(scriptPath),
      __filename: scriptPath,
    }, { filename: scriptPath });
  } catch (err) {
    if (!String(err.message || err).startsWith('EXIT_')) throw err;
  }

  return captured;
}

function testBuildFailureExitAndVersionInjection() {
  const tizenPath = '/app/frontend/tvanddesktop/samsung-tizen/prepare-tizen.js';
  const tizenConfigPath = '/app/frontend/tvanddesktop/samsung-tizen/config.xml';
  const tizenCapture = runPrepareScriptWithDoubles(tizenPath, {
    [tizenConfigPath]: '<widget version="1.2.3"></widget>',
  });
  assert.strictEqual(tizenCapture.exitCode, 1, 'Tizen prepare must exit 1 on build failure');

  const webosPath = '/app/frontend/tvanddesktop/lg-webos/prepare-webos.js';
  const webosAppInfo = '/app/frontend/tvanddesktop/lg-webos/appinfo.json';
  const webosCapture = runPrepareScriptWithDoubles(webosPath, {
    [webosAppInfo]: JSON.stringify({ version: '9.8.7' }),
  });
  assert.strictEqual(webosCapture.exitCode, 1, 'webOS prepare must exit 1 on build failure');
  assert.strictEqual(webosCapture.execCalls.length, 1);
  assert.strictEqual(webosCapture.execCalls[0].options.env.VITE_APP_VERSION, '9.8.7');
}

function testNoJsRewriteAndAssetRefsExist() {
  const tizenPrepare = fs.readFileSync('/app/frontend/tvanddesktop/samsung-tizen/prepare-tizen.js', 'utf8');
  const webosPrepare = fs.readFileSync('/app/frontend/tvanddesktop/lg-webos/prepare-webos.js', 'utf8');
  assert(/\(html\|css\)/.test(tizenPrepare), 'Tizen should rewrite only html/css');
  assert(/\(html\|css\)/.test(webosPrepare), 'webOS should rewrite only html/css');

  const distRoots = [
    '/app/frontend/tvanddesktop/samsung-tizen/dist/app/index.html',
    '/app/frontend/tvanddesktop/lg-webos/dist/app/index.html',
  ];

  for (const indexPath of distRoots) {
    if (!fs.existsSync(indexPath)) continue;
    const dir = path.dirname(indexPath);
    const html = fs.readFileSync(indexPath, 'utf8');
    const refs = [...html.matchAll(/(?:src|href)="([^"#?]+)"/g)]
      .map((m) => m[1])
      .filter((p) => !/^https?:\/\//.test(p) && !p.startsWith('data:'));
    for (const rel of refs) {
      const abs = path.resolve(dir, rel);
      assert(fs.existsSync(abs), `missing packaged asset reference: ${abs}`);
    }
  }
}

function run() {
  testPackagedAssetsRewrite();
  testBuildFailureExitAndVersionInjection();
  testNoJsRewriteAndAssetRefsExist();
  console.log('PASS regression_packaging_scripts');
}

try {
  run();
} catch (err) {
  console.error('FAIL regression_packaging_scripts:', err);
  process.exit(1);
}

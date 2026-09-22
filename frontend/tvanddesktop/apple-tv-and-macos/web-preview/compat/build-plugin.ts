import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { transformSync } from '@babel/core';
import { minify } from 'terser';
import postcss from 'postcss';
import colorFunctions from 'postcss-color-functional-notation';
import type { Plugin, ResolvedConfig } from 'vite';

const require = createRequire(import.meta.url);
const { legacyCss } = require('./legacy-css.cjs');

export function legacyTvSupport(): Plugin {
  let config: ResolvedConfig;
  const es5 = (code: string) => transformSync(code, {
    babelrc: false, configFile: false, sourceType: 'script', comments: false,
    presets: [[require.resolve('@babel/preset-env'), { targets: { chrome: '38' }, modules: false, forceAllTransforms: true, useBuiltIns: false }]],
  })!.code!;
  return {
    name: 'megaradio-legacy-tv-support', apply: 'build', enforce: 'post',
    configResolved(value) { config = value; },
    async buildStart() {
      const runtime = await build({ entryPoints: [path.join(config.root, 'compat/runtime-entry.js')],
        bundle: true, write: false, format: 'iife', platform: 'browser', target: 'es2015', logLevel: 'warning' });
      const output = await minify(es5(runtime.outputFiles[0].text), { ecma: 5, format: { ecma: 5, comments: false } });
      this.emitFile({ type: 'asset', fileName: 'js/compat-runtime.js', source: output.code! });
    },
    transformIndexHtml: {
      order: 'post',
      handler() {
        return [
          { tag: 'script', attrs: { src: `${config.base}js/compat-runtime.js`, 'data-mr-compat': 'true' }, injectTo: 'head-prepend' },
          { tag: 'link', attrs: { rel: 'stylesheet', href: `${config.base}css/legacy-compat.css` }, injectTo: 'head' },
        ];
      },
    },
    async writeBundle(options, bundle) {
      const out = path.resolve(options.dir || config.build.outDir);
      // public/ files are copied verbatim by Vite: explicitly downlevel helpers.
      const directory = path.join(out, 'js');
      if (fs.existsSync(directory)) for (const file of fs.readdirSync(directory)) {
        if (!file.endsWith('.js') || file === 'compat-runtime.js') continue;
        const filename = path.join(directory, file);
        fs.writeFileSync(filename, es5(fs.readFileSync(filename, 'utf8')));
      }
      const css = Object.values(bundle).filter(file => file.type === 'asset' && file.fileName.endsWith('.css'))
        .map(file => file.type === 'asset' ? String(file.source) : '').join('\n');
      if (!css.trim()) return; // The plugin's legacy JS pass has no CSS assets.
      const converted = await postcss([colorFunctions({ preserve: false })]).process(legacyCss(css), { from: undefined });
      fs.mkdirSync(path.join(out, 'css'), { recursive: true });
      fs.writeFileSync(path.join(out, 'css/legacy-compat.css'), converted.css +
        '\nhtml.mr-legacy-css .ring-2{box-shadow:0 0 0 2px #ff4199}' +
        '\nhtml.mr-legacy-css body{color:#fff}\n');
    },
  };
}
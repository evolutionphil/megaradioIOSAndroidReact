#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

function checkLegacy(directory) {
  const html = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
  const entries = [...html.matchAll(/<script\b[^>]*id=["']vite-legacy-(?:entry|polyfill)["'][^>]*>/g)];
  if (entries.length !== 2) throw new Error('Both legacy entry and polyfill scripts are required');
  const assets = entries.map(([tag]) => {
    const match = tag.match(/(?:src|data-src)=["'][^"']*?(assets\/[^"'?]+\.js)["']/);
    if (!match) throw new Error('Legacy asset path missing');
    return match[1];
  });
  const files = assets.concat(fs.readdirSync(path.join(directory, 'js')).filter(name => name.endsWith('.js')).map(name => 'js/' + name));
  for (const file of files) {
    const code = fs.readFileSync(path.join(directory, file), 'utf8');
    try { acorn.parse(code, { ecmaVersion: 5 }); }
    catch (error) { throw new Error(`Old-TV syntax failure in ${file}: ${error.message}`); }
  }
  const fallback = fs.readFileSync(path.join(directory, 'css/legacy-compat.css'), 'utf8');
  if (!fallback.includes('mr-legacy-css') || fallback.length < 500) throw new Error('Missing CSS variable fallbacks');
  if (!html.includes('compat-runtime.js') || !html.includes('startup-guard.js')) throw new Error('Startup support missing');
  console.log(`Legacy syntax PASS: ${files.length} ES5 scripts; CSS fallback present. Physical TV runtime still needs testing.`);
  return files;
}
module.exports = { checkLegacy };
if (require.main === module) {
  try { checkLegacy(path.resolve(process.argv[2] || 'dist')); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
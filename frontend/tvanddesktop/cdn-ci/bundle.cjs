const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const digest = data => crypto.createHash('sha256').update(data).digest('hex');

function listFiles(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const relative = prefix + entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Symlink forbidden: ${relative}`);
    if (entry.isDirectory()) return listFiles(path.join(dir, entry.name), relative + '/');
    if (!entry.isFile()) throw new Error(`Non-file forbidden: ${relative}`);
    return [relative];
  });
}

function entryReferences(html, base) {
  const root = new URL(base);
  const references = new Set();
  for (const match of html.matchAll(/<(?:script|link|img)\b[^>]*(?:src|href)=["']([^"']+)["']/gi)) {
    const url = new URL(match[1], base);
    if (url.origin !== root.origin) continue; // Public fonts, SDKs, etc. are external.
    if (!url.pathname.startsWith(root.pathname)) throw new Error(`Asset escapes CDN base: ${match[1]}`);
    const file = decodeURIComponent(url.pathname.slice(root.pathname.length));
    if (!file) continue; // preconnect to CDN origin
    if (file.split('/').some(part => part === '..' || part === '.') || file.includes('\\')) throw new Error('Unsafe asset path');
    references.add(file);
  }
  return [...references];
}

function validateBundle(directory, base) {
  const files = listFiles(directory);
  if (files.length > 20000) throw new Error('CDN exceeds conservative 20,000-file limit; review retention, do not auto-delete history.');
  for (const file of files) {
    if (fs.statSync(path.join(directory, file)).size > 25 * 1024 * 1024) throw new Error(`Asset exceeds 25MiB: ${file}`);
    if (/(^|\/)(\.env[^/]*|node_modules|\.git)(\/|$)|\.(pem|p12|key)$/i.test(file)) throw new Error(`Private/source file in CDN: ${file}`);
  }
  const html = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'version.json'), 'utf8'));
  if (!manifest.version || typeof manifest.killSwitch !== 'boolean' || !/<script\b/i.test(html)) throw new Error('Invalid CDN entry or manifest');
  const references = entryReferences(html, base);
  if (!references.some(file => file.startsWith('assets/') && file.endsWith('.js'))) throw new Error('Missing bundled JS entry');
  for (const file of references) {
    if (!files.includes(file)) throw new Error(`Missing entry dependency: ${file}`);
  }
  return { files, references, manifest, html };
}

module.exports = { digest, listFiles, entryReferences, validateBundle };
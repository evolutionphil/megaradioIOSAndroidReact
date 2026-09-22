/** Packaged file:// apps use classic SystemJS even on newer engines: no ESM CORS. */
function activateLegacyEntry(html) {
  if (!/id=["']vite-legacy-polyfill["']/.test(html) || !/id=["']vite-legacy-entry["']/.test(html)) {
    throw new Error('Refusing a TV package without legacy entry + polyfill assets');
  }
  return html
    // Always-classic packages do not need Safari's inline nomodule/module probe.
    .replace(/<script\b([^>]*)>[\s\S]*?<\/script>/gi, (tag, attributes) => {
      if (/\bnomodule\b/i.test(attributes) && !/\bid=["']vite-legacy-(entry|polyfill)["']/i.test(attributes)) return '';
      return tag;
    })
    .replace(/<script\b[^>]*\btype=["']module["'][^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<link\b[^>]*rel=["']modulepreload["'][^>]*>/gi, '')
    .replace(/(<script\b[^>]*?)\snomodule(?:=["'][^"']*["'])?/gi, '$1');
}
module.exports = { activateLegacyEntry };
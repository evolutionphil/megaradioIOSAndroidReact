/**
 * Resolve a path to an asset bundled inside `public/` so the app can find
 * it in three very different runtimes:
 *
 *  1. Web preview (https://music-premium-fix.preview.emergentagent.com/api/tv-app/)
 *     → BASE_URL is "/api/tv-app/", needs absolute paths.
 *
 *  2. Tizen `.wgt` / WebOS `.ipk` (file:// protocol)
 *     → BASE_URL is still "/api/tv-app/" (baked in by Vite at build time)
 *       BUT under file:// the browser treats "/api/tv-app/images/x.png" as
 *       "file:///api/tv-app/images/x.png" → ERR_ACCESS_DENIED.
 *     → We MUST emit a relative path "./images/x.png" instead.
 *
 *  3. Desktop Electron loading https://desktop.themegaradio.com/api/tv-app/
 *     → same as (1).
 *
 * Detection rule: if `window.location.protocol === 'file:'` we strip the
 * baked-in base and return "./<path>" — which file:// resolves relative
 * to the current index.html and works on Tizen / WebOS / Apple TV WKWebView.
 */
export function assetPath(path: string): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  try {
    // file:// runtime → always relative (Tizen `.wgt`, WebOS `.ipk`).
    if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
      return './' + cleanPath;
    }
  } catch (_) { /* SSR / very old engines */ }

  // Web / Electron https → use the build-time base (Vite's `base` option).
  const base = (import.meta as any).env?.BASE_URL || '/';
  return `${base}${cleanPath}`;
}

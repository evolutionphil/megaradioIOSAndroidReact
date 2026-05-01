const IMAGE_API_BASE = 'https://api.themegaradio.com';

// Backend HTTPS icon-proxy — upgrades legacy http://…/favicon.png URLs to
// https://…/api/tv-proxy/icon?url=… so Chrome/Electron don't fire Mixed-Content
// warnings when we embed them in <img>. Derived from the TV preview origin so
// it works in dev, staging and production with zero config.
const ICON_PROXY = (() => {
  // When served from /api/tv-app/ the backend is the same origin.
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/api/tv-icon-proxy?url=`;
})();

export function resolveStationImageUrl(favicon: string | undefined | null): string | null {
  if (!favicon || favicon === 'null' || favicon.trim() === '') return null;

  if (favicon.startsWith('http://')) {
    // Upgrade insecure origins through the backend icon-proxy.
    return ICON_PROXY + encodeURIComponent(favicon);
  }
  if (favicon.startsWith('https://')) return favicon;

  return IMAGE_API_BASE + '/api/image/' + encodeURIComponent(favicon);
}

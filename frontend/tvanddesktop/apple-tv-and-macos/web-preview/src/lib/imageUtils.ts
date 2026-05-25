const IMAGE_API_BASE = 'https://api.themegaradio.com';

// Backend HTTPS icon-proxy — upgrades legacy http://…/favicon.png URLs to
// https://…/api/tv-icon-proxy?url=… so Chrome/Electron don't fire Mixed-Content
// warnings when we embed them in <img>.
//
// IMPORTANT: under file:// (Tizen .wgt / WebOS .ipk / Apple TV WKWebView),
// `window.location.origin` is the empty string OR "file://", neither of
// which can serve our backend. Force the absolute production host in that
// case. Same `detectApiBase()` logic AuthContext / useSubscriptionLink use.
const ICON_PROXY = (() => {
  if (typeof window === 'undefined') return IMAGE_API_BASE + '/api/tv-icon-proxy?url=';
  const protocol = window.location.protocol;
  // file:// → use the production backend's full URL.
  if (protocol === 'file:' || !window.location.origin || window.location.origin === 'null') {
    return IMAGE_API_BASE + '/api/tv-icon-proxy?url=';
  }
  // Web preview / Electron https — same-origin proxy works.
  return `${window.location.origin}/api/tv-icon-proxy?url=`;
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

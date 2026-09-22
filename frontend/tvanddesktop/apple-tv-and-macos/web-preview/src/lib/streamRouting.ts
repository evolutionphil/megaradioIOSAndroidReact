import { detectPlatform } from './platform';

/** Only the browser preview is served alongside FastAPI's stream helpers. */
export function usesPreviewStreamRoutes(): boolean {
  return detectPlatform() === 'web' && typeof window !== 'undefined' &&
    /^https?:$/.test(window.location.protocol);
}

export function parseStationPlaylist(text: string, sourceUrl: string): string {
  if (/^\s*</.test(text)) return sourceUrl; // Error/login HTML is not a playlist.
  // HLS manifests belong to the player; never return a segment URL as a station.
  if (/^#EXT-X-/m.test(text)) return sourceUrl;
  for (const line of text.split(/\r?\n/)) {
    const entry = line.match(/^\s*File\d+\s*=\s*(.+)$/i)?.[1] || line.trim();
    if (!entry || entry.startsWith('#') || entry.startsWith('[') || /^[\w-]+=/.test(entry)) continue;
    try {
      const url = new URL(entry.trim(), sourceUrl);
      if (/^https?:$/.test(url.protocol)) return url.href;
    } catch { /* Try the next playlist entry. */ }
  }
  return sourceUrl;
}
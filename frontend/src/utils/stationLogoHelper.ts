// Station Logo Helper - Centralized logo URL resolution
// Based on: MegaRadio Mobile - Station Logo/Favicon Kullanım Rehberi (Mart 2026)
// Use this helper in ALL components that display station logos

import type { Station } from '../types';

// MegaRadio pink logo - LOCAL asset for fallback (no network required)
export const DEFAULT_STATION_LOGO_SOURCE = require('../../assets/images/default-station-logo.png');

// For components that need a URL string (like CarPlay)
export const DEFAULT_STATION_LOGO_URL = 'https://themegaradio.com/logo.png';

/**
 * Encode HTTP URL for image proxy (URL-safe Base64)
 * Proxy: https://themegaradio.com/api/image/{encoded}
 */
const encodeForProxy = (httpUrl: string): string => {
  // Use a simple btoa polyfill for React Native
  const base64 = typeof btoa !== 'undefined'
    ? btoa(httpUrl)
    : Buffer.from(httpUrl).toString('base64');
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

/**
 * Sanitize and normalize a favicon/external URL
 * Handles: protocol-relative, missing protocol, HTTP→proxy
 */
const sanitizeFaviconUrl = (rawUrl: string): string | null => {
  let url = rawUrl.trim();

  if (!url || url === 'null' || url === 'undefined') return null;

  // Protocol-relative URL
  if (url.startsWith('//')) {
    url = 'https:' + url;
  }
  // Missing protocol entirely (not data: or /)
  if (!url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('/')) {
    url = 'https://' + url;
  }
  // Relative path on themegaradio
  if (url.startsWith('/')) {
    url = `https://themegaradio.com${url}`;
  }

  // CRITICAL: HTTP URLs must go through proxy (iOS ATS + mixed content)
  if (url.startsWith('http://')) {
    const encoded = encodeForProxy(url);
    return `https://themegaradio.com/api/image/${encoded}`;
  }

  return url;
};

/**
 * Get the best available logo URL for a station.
 *
 * Priority order (from documentation):
 *   1. logoAssets.webp256 (S3, optimized, most reliable)  — status must be 'completed'
 *   2. localImagePath      (legacy server file)
 *   3. favicon              (external URL, lowest reliability)
 *   4. null                 → caller must show local placeholder
 *
 * @param station   Station object (can be partial / any)
 * @param preferSize  'large' uses webp256 first, 'small' uses webp96 first
 */
export const getStationLogoUrl = (
  station: Station | any | null | undefined,
  preferSize: 'large' | 'small' = 'small',
): string | null => {
  if (!station) return null;

  try {
    // ── 1. S3 optimized logo (best quality, fastest) ──────────────
    if (station.logoAssets?.status === 'completed' && station.logoAssets?.folder) {
      // Pick best available size based on preference
      const webpUrl = preferSize === 'large'
        ? (station.logoAssets.webp256 || station.logoAssets.webp96 || station.logoAssets.webp48)
        : (station.logoAssets.webp256 || station.logoAssets.webp96 || station.logoAssets.webp48);

      if (webpUrl && typeof webpUrl === 'string' && webpUrl.trim()) {
        // New data: full URL (https://megaradio-station-logos.s3...)
        if (webpUrl.startsWith('https://') || webpUrl.startsWith('http://')) {
          return webpUrl;
        }
        // Old data: just filename (logo-256.webp)
        return `https://themegaradio.com/station-logos/${station.logoAssets.folder}/${webpUrl}`;
      }
    }

    // ── 2. Legacy local image path (server file) ──────────────────
    if (station.localImagePath && typeof station.localImagePath === 'string' && station.localImagePath.trim()) {
      return `https://themegaradio.com/station-images/${station.localImagePath}`;
    }

    // ── 3. External favicon URL (least reliable) ──────────────────
    if (station.favicon && typeof station.favicon === 'string') {
      const result = sanitizeFaviconUrl(station.favicon);
      if (result) return result;
    }

    // ── Fallback: logo field (some older stations) ────────────────
    if (station.logo && typeof station.logo === 'string') {
      const result = sanitizeFaviconUrl(station.logo);
      if (result) return result;
    }
  } catch (e) {
    console.log('[StationLogoHelper] Error:', e);
  }

  // 4. No logo available → caller should use DEFAULT_STATION_LOGO_SOURCE
  return null;
};

/**
 * Check if a station has a valid custom logo (not default)
 */
export const hasCustomLogo = (station: Station | null | undefined): boolean => {
  return getStationLogoUrl(station) !== null;
};

// Legacy export for backward compatibility
export const DEFAULT_STATION_LOGO = DEFAULT_STATION_LOGO_URL;

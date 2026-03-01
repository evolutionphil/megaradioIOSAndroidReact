// Station Logo Helper - Centralized logo URL resolution
// Use this helper in ALL components that display station logos

// MegaRadio pink logo - used as fallback for all stations without valid logo
const DEFAULT_STATION_LOGO = 'https://themegaradio.com/logo.png';

import type { Station } from '../types';

/**
 * Get a reliable logo URL for a station
 * Priority: logoAssets.webp96 > favicon > logo > DEFAULT
 * 
 * @param station - Station object (can be partial)
 * @returns Valid URL string for the logo
 */
export const getStationLogoUrl = (station: Station | null | undefined): string => {
  if (!station) return DEFAULT_STATION_LOGO;

  try {
    // Priority 1: logoAssets (best quality, our CDN)
    if (station.logoAssets?.webp96 && station.logoAssets?.folder) {
      const folder = encodeURIComponent(station.logoAssets.folder);
      const file = encodeURIComponent(station.logoAssets.webp96);
      return `https://themegaradio.com/station-logos/${folder}/${file}`;
    }

    // Priority 2: favicon field (most common)
    if (station.favicon && typeof station.favicon === 'string' && station.favicon.trim()) {
      const favicon = station.favicon.trim();
      // Skip invalid URLs
      if (favicon === '' || favicon === 'null' || favicon === 'undefined') {
        // Continue to next priority
      } else if (favicon.startsWith('http://') || favicon.startsWith('https://')) {
        return favicon;
      } else if (favicon.startsWith('/')) {
        return `https://themegaradio.com${favicon}`;
      }
    }

    // Priority 3: logo field
    if (station.logo && typeof station.logo === 'string' && station.logo.trim()) {
      const logo = station.logo.trim();
      // Skip invalid URLs
      if (logo === '' || logo === 'null' || logo === 'undefined') {
        // Continue to default
      } else if (logo.startsWith('http://') || logo.startsWith('https://')) {
        return logo;
      } else if (logo.startsWith('/')) {
        return `https://themegaradio.com${logo}`;
      }
    }

    // Priority 4: img field (some stations use this)
    if ((station as any).img && typeof (station as any).img === 'string' && (station as any).img.trim()) {
      const img = (station as any).img.trim();
      if (img.startsWith('http://') || img.startsWith('https://')) {
        return img;
      } else if (img.startsWith('/')) {
        return `https://themegaradio.com${img}`;
      }
    }

  } catch (e) {
    console.log('[StationLogoHelper] Error:', e);
  }

  // Fallback: Default station logo
  return DEFAULT_STATION_LOGO;
};

/**
 * Check if a station has a valid custom logo (not default)
 */
export const hasCustomLogo = (station: Station | null | undefined): boolean => {
  const logoUrl = getStationLogoUrl(station);
  return logoUrl !== DEFAULT_STATION_LOGO;
};

export { DEFAULT_STATION_LOGO };

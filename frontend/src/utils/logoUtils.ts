// Logo utility functions for consistent logo URL handling across the app
import type { Station } from '../types';

// Default station logo URL - fallback when no logo available
export const DEFAULT_STATION_LOGO = 'https://themegaradio.com/logo.png';

/**
 * Get the best available logo URL for a station
 * Priority: logoAssets (if completed) > favicon > logo > default
 * Always returns a valid URL (never null)
 */
export const getStationLogoUrl = (station: Station | null | undefined): string => {
  if (!station) return DEFAULT_STATION_LOGO;
  
  try {
    // Priority 1: logoAssets (best quality, our own CDN) - only if status is completed
    if (station.logoAssets?.webp96 && 
        station.logoAssets?.folder && 
        station.logoAssets?.status === 'completed') {
      const folder = encodeURIComponent(station.logoAssets.folder);
      const file = encodeURIComponent(station.logoAssets.webp96);
      return `https://themegaradio.com/station-logos/${folder}/${file}`;
    }
    
    // Priority 2: favicon field (skip if it's a known bad URL pattern)
    if (station.favicon && station.favicon.trim()) {
      const favicon = station.favicon.trim();
      // Skip known bad favicon patterns
      if (favicon.includes('favicon.ico') || 
          favicon.includes('wix.com') ||
          favicon.length < 10) {
        // Skip to next priority
      } else if (favicon.startsWith('http://') || favicon.startsWith('https://')) {
        return favicon;
      } else if (favicon.startsWith('/')) {
        return `https://themegaradio.com${favicon}`;
      }
    }
    
    // Priority 3: logo field
    if (station.logo && station.logo.trim()) {
      const logo = station.logo.trim();
      if (logo.startsWith('http://') || logo.startsWith('https://')) {
        return logo;
      } else if (logo.startsWith('/')) {
        return `https://themegaradio.com${logo}`;
      }
    }
  } catch (e) {
    console.log('[logoUtils] Error getting logo URL:', e);
  }
  
  // Fallback: Default station logo
  return DEFAULT_STATION_LOGO;
};

/**
 * Check if station has a custom logo (not the default)
 */
export const hasCustomLogo = (station: Station | null | undefined): boolean => {
  if (!station) return false;
  
  return !!(
    (station.logoAssets?.webp96 && station.logoAssets?.folder) ||
    (station.favicon && station.favicon.trim()) ||
    (station.logo && station.logo.trim())
  );
};

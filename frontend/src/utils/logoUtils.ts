// Logo utility functions - delegates to centralized stationLogoHelper
// Keep this file for backward compatibility only
import { getStationLogoUrl as centralGetUrl, hasCustomLogo as centralHasLogo, DEFAULT_STATION_LOGO_URL } from './stationLogoHelper';
import type { Station } from '../types';

export const DEFAULT_STATION_LOGO = DEFAULT_STATION_LOGO_URL;

/**
 * Get the best available logo URL for a station (always returns a valid URL)
 */
export const getStationLogoUrl = (station: Station | null | undefined): string => {
  return centralGetUrl(station) || DEFAULT_STATION_LOGO;
};

/**
 * Check if station has a custom logo (not the default)
 */
export const hasCustomLogo = centralHasLogo;

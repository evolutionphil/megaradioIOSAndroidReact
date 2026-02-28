// CarPlay Image Cache Service
// Downloads and caches station logos locally for CarPlay display
// CarPlay does NOT support remote URLs - images must be local file paths

import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const CACHE_DIR = `${FileSystem.cacheDirectory}carplay_images/`;
const DEFAULT_LOGO_URL = 'https://themegaradio.com/logo.png';

// Ensure cache directory exists
let cacheInitialized = false;

const initCache = async (): Promise<void> => {
  if (cacheInitialized) return;
  
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
    cacheInitialized = true;
    console.log('[CarPlayImageCache] Cache directory initialized:', CACHE_DIR);
  } catch (error) {
    console.error('[CarPlayImageCache] Failed to create cache directory:', error);
  }
};

// Generate a safe filename from station ID or URL
const getSafeFilename = (identifier: string): string => {
  return identifier.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
};

// Get local path for cached image
const getLocalPath = (identifier: string): string => {
  return `${CACHE_DIR}${getSafeFilename(identifier)}.png`;
};

// Check if image is already cached
const isCached = async (identifier: string): Promise<boolean> => {
  try {
    const localPath = getLocalPath(identifier);
    const info = await FileSystem.getInfoAsync(localPath);
    return info.exists;
  } catch {
    return false;
  }
};

// Download and cache a single image
export const downloadAndCacheImage = async (
  imageUrl: string,
  identifier: string
): Promise<string> => {
  // Only run on iOS for CarPlay
  if (Platform.OS !== 'ios') {
    return imageUrl;
  }
  
  await initCache();
  
  const localPath = getLocalPath(identifier);
  
  // Check if already cached
  if (await isCached(identifier)) {
    console.log('[CarPlayImageCache] Using cached:', identifier);
    return localPath;
  }
  
  // Validate URL
  if (!imageUrl || !imageUrl.startsWith('http')) {
    console.log('[CarPlayImageCache] Invalid URL, using default:', imageUrl);
    return '';
  }
  
  // Ensure HTTPS
  const secureUrl = imageUrl.replace('http://', 'https://');
  
  try {
    console.log('[CarPlayImageCache] Downloading:', identifier);
    
    const downloadResult = await FileSystem.downloadAsync(secureUrl, localPath);
    
    if (downloadResult.status === 200) {
      console.log('[CarPlayImageCache] Cached successfully:', identifier);
      return localPath;
    } else {
      console.warn('[CarPlayImageCache] Download failed, status:', downloadResult.status);
      // Try to clean up failed download
      await FileSystem.deleteAsync(localPath, { idempotent: true });
      return '';
    }
  } catch (error) {
    console.error('[CarPlayImageCache] Download error:', error);
    return '';
  }
};

// Batch download multiple images (for station lists)
export const cacheStationImages = async (
  stations: Array<{ _id?: string; id?: string; favicon?: string; logo?: string; logoAssets?: { webp256?: string; webp96?: string } }>
): Promise<Map<string, string>> => {
  if (Platform.OS !== 'ios') {
    return new Map();
  }
  
  await initCache();
  
  const results = new Map<string, string>();
  
  // Process in parallel with limit
  const BATCH_SIZE = 10;
  const batches = [];
  
  for (let i = 0; i < stations.length; i += BATCH_SIZE) {
    batches.push(stations.slice(i, i + BATCH_SIZE));
  }
  
  for (const batch of batches) {
    const promises = batch.map(async (station) => {
      const id = station._id || station.id || '';
      if (!id) return;
      
      // Get best available logo URL
      const logoUrl = 
        station.logoAssets?.webp256 ||
        station.logoAssets?.webp96 ||
        (station.favicon?.startsWith('http') ? station.favicon : null) ||
        (station.logo?.startsWith('http') ? station.logo : null) ||
        '';
      
      if (logoUrl) {
        const localPath = await downloadAndCacheImage(logoUrl, id);
        if (localPath) {
          results.set(id, localPath);
        }
      }
    });
    
    await Promise.all(promises);
  }
  
  console.log('[CarPlayImageCache] Cached', results.size, 'of', stations.length, 'images');
  return results;
};

// Get station image for CarPlay (returns local path or empty string)
export const getCarPlayImagePath = async (
  station: { _id?: string; id?: string; favicon?: string; logo?: string; logoAssets?: { webp256?: string; webp96?: string } }
): Promise<string> => {
  if (Platform.OS !== 'ios') {
    return '';
  }
  
  const id = station._id || station.id || '';
  if (!id) return '';
  
  // Check cache first
  if (await isCached(id)) {
    return getLocalPath(id);
  }
  
  // Get best available logo URL
  const logoUrl = 
    station.logoAssets?.webp256 ||
    station.logoAssets?.webp96 ||
    (station.favicon?.startsWith('http') ? station.favicon : null) ||
    (station.logo?.startsWith('http') ? station.logo : null) ||
    '';
  
  if (logoUrl) {
    return await downloadAndCacheImage(logoUrl, id);
  }
  
  return '';
};

// Clear all cached images
export const clearCache = async (): Promise<void> => {
  try {
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    cacheInitialized = false;
    console.log('[CarPlayImageCache] Cache cleared');
  } catch (error) {
    console.error('[CarPlayImageCache] Clear cache error:', error);
  }
};

// Get cache size
export const getCacheSize = async (): Promise<number> => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    return (dirInfo as any).size || 0;
  } catch {
    return 0;
  }
};

export default {
  downloadAndCacheImage,
  cacheStationImages,
  getCarPlayImagePath,
  clearCache,
  getCacheSize,
};

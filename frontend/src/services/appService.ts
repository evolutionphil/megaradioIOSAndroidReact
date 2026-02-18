import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PAGES_CACHE_KEY = '@megaradio_app_pages';
const INFO_CACHE_KEY = '@megaradio_app_info';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export interface AppPage {
  title: string;
  content: string;
}

export interface AppPages {
  about: AppPage;
  terms: AppPage;
  privacy: AppPage;
}

export interface AppInfo {
  name: string;
  version: string;
  website: string;
  supportEmail: string;
  social: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
  };
  links: {
    appStore?: string;
    playStore?: string;
  };
}

const appService = {
  // Get static pages (About, Terms, Privacy)
  async getPages(): Promise<AppPages | null> {
    try {
      // Check cache first
      const cached = await AsyncStorage.getItem(PAGES_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          console.log('[AppService] Using cached pages');
          return data;
        }
      }

      // Fetch from API
      const response = await api.get('https://themegaradio.com/api/app/pages');
      const pages = response.data?.pages;

      if (pages) {
        // Cache the data
        await AsyncStorage.setItem(PAGES_CACHE_KEY, JSON.stringify({
          data: pages,
          timestamp: Date.now(),
        }));
        console.log('[AppService] Pages fetched and cached');
      }

      return pages || null;
    } catch (error) {
      console.error('[AppService] Failed to fetch pages:', error);
      return null;
    }
  },

  // Get app info
  async getAppInfo(): Promise<AppInfo | null> {
    try {
      // Check cache first
      const cached = await AsyncStorage.getItem(INFO_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          console.log('[AppService] Using cached app info');
          return data;
        }
      }

      // Fetch from API
      const response = await api.get('https://themegaradio.com/api/app/info');
      const appInfo = response.data?.app;

      if (appInfo) {
        // Cache the data
        await AsyncStorage.setItem(INFO_CACHE_KEY, JSON.stringify({
          data: appInfo,
          timestamp: Date.now(),
        }));
        console.log('[AppService] App info fetched and cached');
      }

      return appInfo || null;
    } catch (error) {
      console.error('[AppService] Failed to fetch app info:', error);
      return null;
    }
  },

  // Clear cache
  async clearCache() {
    await AsyncStorage.multiRemove([PAGES_CACHE_KEY, INFO_CACHE_KEY]);
  },
};

export default appService;

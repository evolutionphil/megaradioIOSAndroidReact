// Firebase Analytics Service for MegaRadio
// Provides centralized event tracking for GA4
// Uses dynamic import to avoid web bundling issues
import { Platform } from 'react-native';

let analytics: any = null;

// Lazy load analytics module (native only)
const getAnalytics = async () => {
  if (analytics) return analytics;
  if (Platform.OS === 'web') return null;
  try {
    const mod = require('@react-native-firebase/analytics');
    analytics = mod.default || mod;
    return analytics;
  } catch (e) {
    console.warn('[Analytics] Firebase Analytics not available:', e);
    return null;
  }
};

class AnalyticsService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized || Platform.OS === 'web') return;
    try {
      const a = await getAnalytics();
      if (a) {
        await a().setAnalyticsCollectionEnabled(true);
        this.initialized = true;
        console.log('[Analytics] Firebase Analytics initialized');
      }
    } catch (error) {
      console.warn('[Analytics] Failed to initialize:', error);
    }
  }

  // Screen tracking
  async logScreenView(screenName: string, screenClass?: string): Promise<void> {
    try {
      const a = await getAnalytics();
      if (a) await a().logScreenView({ screen_name: screenName, screen_class: screenClass || screenName });
    } catch (e) {}
  }

  // App open
  async logAppOpen(): Promise<void> {
    try {
      const a = await getAnalytics();
      if (a) await a().logAppOpen();
    } catch (e) {}
  }

  // Station play
  async logStationPlay(stationId: string, stationName: string, genre?: string): Promise<void> {
    try {
      const a = await getAnalytics();
      if (a) await a().logEvent('station_play', {
        station_id: stationId,
        station_name: stationName.substring(0, 100),
        genre: genre || 'unknown',
        platform: Platform.OS,
      });
    } catch (e) {}
  }

  // Station favorite
  async logStationFavorite(stationId: string, stationName: string, isFavorite: boolean): Promise<void> {
    try {
      const a = await getAnalytics();
      if (a) await a().logEvent('station_favorite', {
        station_id: stationId,
        station_name: stationName.substring(0, 100),
        action: isFavorite ? 'add' : 'remove',
      });
    } catch (e) {}
  }

  // Premium purchase
  async logPremiumPurchase(productId: string, price?: string): Promise<void> {
    try {
      const a = await getAnalytics();
      if (a) await a().logEvent('premium_purchase', {
        product_id: productId,
        price: price || 'unknown',
        platform: Platform.OS,
      });
    } catch (e) {}
  }

  // Premium paywall view
  async logPaywallView(source: string): Promise<void> {
    try {
      const a = await getAnalytics();
      if (a) await a().logEvent('paywall_view', { source, platform: Platform.OS });
    } catch (e) {}
  }

  // Ad watched
  async logAdWatched(adType: string, stationId?: string): Promise<void> {
    try {
      const a = await getAnalytics();
      if (a) await a().logEvent('ad_watched', { ad_type: adType, station_id: stationId || 'none', platform: Platform.OS });
    } catch (e) {}
  }

  // Search
  async logSearch(searchTerm: string, resultsCount: number): Promise<void> {
    try {
      const a = await getAnalytics();
      if (a) {
        await a().logSearch({ search_term: searchTerm.substring(0, 100) });
        await a().logEvent('search_results', { search_term: searchTerm.substring(0, 100), results_count: resultsCount });
      }
    } catch (e) {}
  }

  // Genre browse
  async logGenreBrowse(genreName: string): Promise<void> {
    try {
      const a = await getAnalytics();
      if (a) await a().logEvent('genre_browse', { genre_name: genreName });
    } catch (e) {}
  }

  // CarPlay / Android Auto connect
  async logCarConnect(platform: 'carplay' | 'android_auto'): Promise<void> {
    try {
      const a = await getAnalytics();
      if (a) await a().logEvent('car_connect', { car_platform: platform });
    } catch (e) {}
  }

  // User login
  async logLogin(method: string): Promise<void> {
    try {
      const a = await getAnalytics();
      if (a) await a().logLogin({ method });
    } catch (e) {}
  }

  // User signup
  async logSignUp(method: string): Promise<void> {
    try {
      const a = await getAnalytics();
      if (a) await a().logSignUp({ method });
    } catch (e) {}
  }

  // Set user properties
  async setUserId(userId: string): Promise<void> {
    try {
      const a = await getAnalytics();
      if (a) await a().setUserId(userId);
    } catch (e) {}
  }

  async setUserProperty(name: string, value: string): Promise<void> {
    try {
      const a = await getAnalytics();
      if (a) await a().setUserProperty(name, value);
    } catch (e) {}
  }

  async setIsPremium(isPremium: boolean): Promise<void> {
    try {
      const a = await getAnalytics();
      if (a) await a().setUserProperty('is_premium', isPremium ? 'true' : 'false');
    } catch (e) {}
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;

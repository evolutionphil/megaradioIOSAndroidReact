// Firebase Analytics Service for MegaRadio
// Provides centralized event tracking for GA4
import analytics from '@react-native-firebase/analytics';
import { Platform } from 'react-native';

class AnalyticsService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      await analytics().setAnalyticsCollectionEnabled(true);
      this.initialized = true;
      console.log('[Analytics] Firebase Analytics initialized');
    } catch (error) {
      console.warn('[Analytics] Failed to initialize:', error);
    }
  }

  // Screen tracking
  async logScreenView(screenName: string, screenClass?: string): Promise<void> {
    try {
      await analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
    } catch (e) {
      // Silent fail - analytics should never crash the app
    }
  }

  // App open
  async logAppOpen(): Promise<void> {
    try {
      await analytics().logAppOpen();
    } catch (e) {}
  }

  // Station play
  async logStationPlay(stationId: string, stationName: string, genre?: string): Promise<void> {
    try {
      await analytics().logEvent('station_play', {
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
      await analytics().logEvent('station_favorite', {
        station_id: stationId,
        station_name: stationName.substring(0, 100),
        action: isFavorite ? 'add' : 'remove',
      });
    } catch (e) {}
  }

  // Premium purchase
  async logPremiumPurchase(productId: string, price?: string): Promise<void> {
    try {
      await analytics().logEvent('premium_purchase', {
        product_id: productId,
        price: price || 'unknown',
        platform: Platform.OS,
      });
    } catch (e) {}
  }

  // Premium paywall view
  async logPaywallView(source: string): Promise<void> {
    try {
      await analytics().logEvent('paywall_view', {
        source,
        platform: Platform.OS,
      });
    } catch (e) {}
  }

  // Ad watched
  async logAdWatched(adType: string, stationId?: string): Promise<void> {
    try {
      await analytics().logEvent('ad_watched', {
        ad_type: adType,
        station_id: stationId || 'none',
        platform: Platform.OS,
      });
    } catch (e) {}
  }

  // Search
  async logSearch(searchTerm: string, resultsCount: number): Promise<void> {
    try {
      await analytics().logSearch({
        search_term: searchTerm.substring(0, 100),
      });
      await analytics().logEvent('search_results', {
        search_term: searchTerm.substring(0, 100),
        results_count: resultsCount,
      });
    } catch (e) {}
  }

  // Genre browse
  async logGenreBrowse(genreName: string): Promise<void> {
    try {
      await analytics().logEvent('genre_browse', {
        genre_name: genreName,
      });
    } catch (e) {}
  }

  // CarPlay / Android Auto connect
  async logCarConnect(platform: 'carplay' | 'android_auto'): Promise<void> {
    try {
      await analytics().logEvent('car_connect', {
        car_platform: platform,
      });
    } catch (e) {}
  }

  // User login
  async logLogin(method: string): Promise<void> {
    try {
      await analytics().logLogin({ method });
    } catch (e) {}
  }

  // User signup
  async logSignUp(method: string): Promise<void> {
    try {
      await analytics().logSignUp({ method });
    } catch (e) {}
  }

  // Set user properties
  async setUserId(userId: string): Promise<void> {
    try {
      await analytics().setUserId(userId);
    } catch (e) {}
  }

  async setUserProperty(name: string, value: string): Promise<void> {
    try {
      await analytics().setUserProperty(name, value);
    } catch (e) {}
  }

  async setIsPremium(isPremium: boolean): Promise<void> {
    try {
      await analytics().setUserProperty('is_premium', isPremium ? 'true' : 'false');
    } catch (e) {}
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;

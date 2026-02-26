/**
 * FlowAlive Analytics Service
 * 
 * Privacy-first mobile analytics for MegaRadio.
 * Tracks user sessions, events, and screen navigation.
 */

import { Flowalive } from 'flowalive-analytics/expo';
import type { User } from '../types';

// Event names for consistent tracking
export const ANALYTICS_EVENTS = {
  // App lifecycle
  APP_OPENED: 'app_opened',
  APP_BACKGROUNDED: 'app_backgrounded',
  
  // Authentication
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',
  USER_SIGNED_UP: 'user_signed_up',
  
  // Playback
  STATION_PLAYED: 'station_played',
  STATION_PAUSED: 'station_paused',
  STATION_STOPPED: 'station_stopped',
  PLAYBACK_ERROR: 'playback_error',
  
  // Favorites
  STATION_FAVORITED: 'station_favorited',
  STATION_UNFAVORITED: 'station_unfavorited',
  
  // Navigation
  SCREEN_VIEWED: 'screen_viewed',
  SEARCH_PERFORMED: 'search_performed',
  GENRE_SELECTED: 'genre_selected',
  
  // Engagement
  NOTIFICATION_OPENED: 'notification_opened',
  SHARE_CLICKED: 'share_clicked',
  
  // CarPlay / Android Auto
  CARPLAY_CONNECTED: 'carplay_connected',
  ANDROID_AUTO_CONNECTED: 'android_auto_connected',
  
  // Ads
  AD_VIEWED: 'ad_viewed',
  AD_CLICKED: 'ad_clicked',
  AD_REWARDED: 'ad_rewarded',
} as const;

type AnalyticsEvent = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];

/**
 * FlowAlive Analytics helper functions
 */
class FlowaliveService {
  private isInitialized = false;

  /**
   * Initialize device tracking (call after app loads)
   */
  async initDevice(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      await Flowalive.setDevice();
      this.isInitialized = true;
      console.log('[FlowaliveService] Device initialized');
    } catch (error) {
      console.error('[FlowaliveService] Failed to initialize device:', error);
    }
  }

  /**
   * Set user identity after login (with consent)
   */
  async setUser(user: User): Promise<void> {
    try {
      await Flowalive.setDevice({
        appUserId: user.id,
        appUserName: user.name || user.username,
        appUserEmail: user.email,
        metadata: {
          isPremium: user.isPremium || false,
          hasAvatar: !!user.avatar,
          registrationDate: user.createdAt || null,
        },
      });
      console.log('[FlowaliveService] User identity set:', user.id);
    } catch (error) {
      console.error('[FlowaliveService] Failed to set user:', error);
    }
  }

  /**
   * Clear user identity on logout
   */
  async clearUser(): Promise<void> {
    try {
      await Flowalive.setDevice();
      console.log('[FlowaliveService] User identity cleared');
    } catch (error) {
      console.error('[FlowaliveService] Failed to clear user:', error);
    }
  }

  /**
   * Track a custom event
   */
  track(event: AnalyticsEvent | string, params?: Record<string, string | number | boolean | null>): void {
    try {
      Flowalive.track(event, params);
      console.log('[FlowaliveService] Event tracked:', event, params);
    } catch (error) {
      console.error('[FlowaliveService] Failed to track event:', error);
    }
  }

  // Convenience methods for common events

  trackStationPlayed(stationId: string, stationName: string, genre?: string): void {
    this.track(ANALYTICS_EVENTS.STATION_PLAYED, {
      station_id: stationId,
      station_name: stationName,
      genre: genre || null,
    });
  }

  trackStationPaused(stationId: string, stationName: string): void {
    this.track(ANALYTICS_EVENTS.STATION_PAUSED, {
      station_id: stationId,
      station_name: stationName,
    });
  }

  trackStationFavorited(stationId: string, stationName: string): void {
    this.track(ANALYTICS_EVENTS.STATION_FAVORITED, {
      station_id: stationId,
      station_name: stationName,
    });
  }

  trackStationUnfavorited(stationId: string, stationName: string): void {
    this.track(ANALYTICS_EVENTS.STATION_UNFAVORITED, {
      station_id: stationId,
      station_name: stationName,
    });
  }

  trackSearch(query: string, resultsCount: number): void {
    this.track(ANALYTICS_EVENTS.SEARCH_PERFORMED, {
      query,
      results_count: resultsCount,
    });
  }

  trackGenreSelected(genreId: string, genreName: string): void {
    this.track(ANALYTICS_EVENTS.GENRE_SELECTED, {
      genre_id: genreId,
      genre_name: genreName,
    });
  }

  trackAdViewed(adType: 'interstitial' | 'rewarded' | 'banner'): void {
    this.track(ANALYTICS_EVENTS.AD_VIEWED, {
      ad_type: adType,
    });
  }

  trackAdRewarded(rewardType: string, rewardAmount: number): void {
    this.track(ANALYTICS_EVENTS.AD_REWARDED, {
      reward_type: rewardType,
      reward_amount: rewardAmount,
    });
  }

  trackPlaybackError(stationId: string, errorMessage: string): void {
    this.track(ANALYTICS_EVENTS.PLAYBACK_ERROR, {
      station_id: stationId,
      error_message: errorMessage,
    });
  }

  trackUserLogin(method: 'email' | 'google' | 'apple'): void {
    this.track(ANALYTICS_EVENTS.USER_LOGGED_IN, {
      method,
    });
  }

  trackUserSignup(method: 'email' | 'google' | 'apple'): void {
    this.track(ANALYTICS_EVENTS.USER_SIGNED_UP, {
      method,
    });
  }

  trackUserLogout(): void {
    this.track(ANALYTICS_EVENTS.USER_LOGGED_OUT);
  }

  trackNotificationOpened(notificationType: string): void {
    this.track(ANALYTICS_EVENTS.NOTIFICATION_OPENED, {
      notification_type: notificationType,
    });
  }
}

// Export singleton instance
export const flowaliveService = new FlowaliveService();
export default flowaliveService;

/**
 * FlowAlive Analytics Service - DISABLED
 * 
 * NOTE: FlowAlive NPM package (v0.0.32) has a bug - contains yalc reference.
 * This mock version provides no-op implementations until the package is fixed.
 * 
 * Issue: The package.json in flowalive-analytics contains:
 *   "flowalive-analytics": "file:.yalc/flowalive-analytics"
 * 
 * Once fixed by maintainer, re-enable by:
 * 1. yarn add flowalive-analytics
 * 2. Uncomment FlowAliveProvider in _layout.tsx
 * 3. Replace this file with real implementation
 */

import type { User } from '../types';

export const ANALYTICS_EVENTS = {
  APP_OPENED: 'app_opened',
  APP_BACKGROUNDED: 'app_backgrounded',
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',
  USER_SIGNED_UP: 'user_signed_up',
  STATION_PLAYED: 'station_played',
  STATION_PAUSED: 'station_paused',
  STATION_STOPPED: 'station_stopped',
  PLAYBACK_ERROR: 'playback_error',
  STATION_FAVORITED: 'station_favorited',
  STATION_UNFAVORITED: 'station_unfavorited',
  SCREEN_VIEWED: 'screen_viewed',
  SEARCH_PERFORMED: 'search_performed',
  GENRE_SELECTED: 'genre_selected',
  NOTIFICATION_OPENED: 'notification_opened',
  SHARE_CLICKED: 'share_clicked',
  CARPLAY_CONNECTED: 'carplay_connected',
  ANDROID_AUTO_CONNECTED: 'android_auto_connected',
  AD_VIEWED: 'ad_viewed',
  AD_CLICKED: 'ad_clicked',
  AD_REWARDED: 'ad_rewarded',
} as const;

class FlowaliveServiceMock {
  async initDevice(): Promise<void> {
    // Mock - FlowAlive disabled
  }

  async setUser(_user: User): Promise<void> {
    // Mock - FlowAlive disabled
  }

  async clearUser(): Promise<void> {
    // Mock - FlowAlive disabled
  }

  track(_event: string, _params?: Record<string, unknown>): void {
    // Mock - FlowAlive disabled
  }

  trackStationPlayed(_stationId: string, _stationName: string, _genre?: string): void {}
  trackStationPaused(_stationId: string, _stationName: string): void {}
  trackStationFavorited(_stationId: string, _stationName: string): void {}
  trackStationUnfavorited(_stationId: string, _stationName: string): void {}
  trackSearch(_query: string, _resultsCount: number): void {}
  trackGenreSelected(_genreId: string, _genreName: string): void {}
  trackAdViewed(_adType: string): void {}
  trackAdRewarded(_rewardType: string, _rewardAmount: number): void {}
  trackPlaybackError(_stationId: string, _errorMessage: string): void {}
  trackUserLogin(_method: string): void {}
  trackUserSignup(_method: string): void {}
  trackUserLogout(): void {}
  trackNotificationOpened(_notificationType: string): void {}
}

export const flowaliveService = new FlowaliveServiceMock();
export default flowaliveService;

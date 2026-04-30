import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * RateUsService — manages when the rate-us prompt should appear.
 *
 * Strategy:
 *  - Track app launches and station plays
 *  - Trigger the prompt after the user has played at least 3 stations OR
 *    opened the app 3 times (whichever comes first)
 *  - Re-prompt every 30 days if user dismissed (and didn't rate)
 *  - Never show again if user rated
 */

const KEYS = {
  launches: '@rateus/launches',
  stationPlays: '@rateus/station_plays',
  lastShown: '@rateus/last_shown',
  rated: '@rateus/rated',
  dismissed: '@rateus/dismissed_count',
};

// Triggers
const MIN_STATION_PLAYS = 3;
const MIN_APP_LAUNCHES = 3;
const RE_PROMPT_DAYS = 30;
const MAX_DISMISS_COUNT = 3; // After 3 dismissals, stop showing

class RateUsService {
  private listeners: Array<() => void> = [];

  /** Subscribe to be notified when modal should show */
  onShouldShow(cb: () => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private async getInt(key: string): Promise<number> {
    const v = await AsyncStorage.getItem(key);
    return v ? parseInt(v, 10) || 0 : 0;
  }

  /** Increment app launch counter — call once on app startup */
  async trackAppLaunch(): Promise<void> {
    const current = await this.getInt(KEYS.launches);
    await AsyncStorage.setItem(KEYS.launches, String(current + 1));
    await this.maybeShow();
  }

  /** Increment station play counter — call when station starts playing */
  async trackStationPlay(): Promise<void> {
    const current = await this.getInt(KEYS.stationPlays);
    await AsyncStorage.setItem(KEYS.stationPlays, String(current + 1));
    await this.maybeShow();
  }

  /** Mark user as rated — never prompt again */
  async markRated(): Promise<void> {
    await AsyncStorage.setItem(KEYS.rated, '1');
  }

  /** Mark dismissed — re-prompt later */
  async markDismissed(): Promise<void> {
    const count = await this.getInt(KEYS.dismissed);
    await AsyncStorage.multiSet([
      [KEYS.dismissed, String(count + 1)],
      [KEYS.lastShown, String(Date.now())],
    ]);
  }

  /** Reset all counters (for testing) */
  async reset(): Promise<void> {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  }

  /** Internal: decide if modal should show now */
  private async maybeShow(): Promise<void> {
    try {
      // Already rated → never show again
      const rated = await AsyncStorage.getItem(KEYS.rated);
      if (rated === '1') return;

      // Dismissed too many times → give up
      const dismissCount = await this.getInt(KEYS.dismissed);
      if (dismissCount >= MAX_DISMISS_COUNT) return;

      // Check cooldown since last shown
      const lastShownStr = await AsyncStorage.getItem(KEYS.lastShown);
      if (lastShownStr) {
        const lastShown = parseInt(lastShownStr, 10);
        const daysSince = (Date.now() - lastShown) / (1000 * 60 * 60 * 24);
        if (daysSince < RE_PROMPT_DAYS) return;
      }

      // Engagement threshold — at least 3 station plays OR 3 app launches
      const plays = await this.getInt(KEYS.stationPlays);
      const launches = await this.getInt(KEYS.launches);

      if (plays < MIN_STATION_PLAYS && launches < MIN_APP_LAUNCHES) return;

      // All conditions met → notify listeners
      console.log('[RateUs] Triggering rate-us prompt', { plays, launches, dismissCount });
      this.listeners.forEach((l) => {
        try {
          l();
        } catch (e) {
          console.log('[RateUs] Listener error:', e);
        }
      });
    } catch (e) {
      console.log('[RateUs] maybeShow error:', e);
    }
  }
}

export const rateUsService = new RateUsService();
export default rateUsService;

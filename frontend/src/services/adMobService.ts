// adMobService.ts
// Google AdMob Integration Service for MegaRadio
// TEMPORARILY DISABLED - Mock implementation

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const AD_FREE_UNTIL_KEY = '@megaradio_ad_free_until';
const STATION_CHANGE_COUNT_KEY = '@megaradio_station_change_count';

class AdMobService {
  private isInitialized = false;
  private stationChangeCount = 0;

  // Initialize AdMob SDK - MOCK
  async initialize(): Promise<boolean> {
    console.log('[AdMob] MOCK - AdMob temporarily disabled');
    this.isInitialized = true;
    
    // Load station change count from storage
    const countStr = await AsyncStorage.getItem(STATION_CHANGE_COUNT_KEY);
    this.stationChangeCount = countStr ? parseInt(countStr, 10) : 0;
    
    return true;
  }

  // Check if user has ad-free time remaining
  async isAdFree(): Promise<boolean> {
    try {
      const adFreeUntil = await AsyncStorage.getItem(AD_FREE_UNTIL_KEY);
      if (!adFreeUntil) return true; // Default to ad-free when disabled
      
      const expiryTime = parseInt(adFreeUntil, 10);
      return Date.now() < expiryTime;
    } catch (error) {
      return true;
    }
  }

  // Get remaining ad-free time in minutes
  async getAdFreeMinutesRemaining(): Promise<number> {
    return 999; // Mock - always has time
  }

  // Grant ad-free time
  async grantAdFreeTime(minutes: number = 30): Promise<void> {
    try {
      const baseTime = Date.now();
      const newExpiry = baseTime + (minutes * 60 * 1000);
      await AsyncStorage.setItem(AD_FREE_UNTIL_KEY, String(newExpiry));
      console.log('[AdMob] MOCK - Granted', minutes, 'minutes ad-free time');
    } catch (error) {
      console.error('[AdMob] Error granting ad-free time:', error);
    }
  }

  // Track station change - MOCK
  async onStationChange(): Promise<boolean> {
    console.log('[AdMob] MOCK - Station change tracked');
    return false; // Never show ads when disabled
  }

  // Show Interstitial Ad - MOCK
  async showInterstitialAd(): Promise<boolean> {
    console.log('[AdMob] MOCK - Interstitial ad skipped');
    return false;
  }

  // Show Rewarded Ad - MOCK
  async showRewardedAd(): Promise<{ success: boolean; reward?: { type: string; amount: number } }> {
    console.log('[AdMob] MOCK - Rewarded ad simulated');
    // Simulate reward for testing
    await this.grantAdFreeTime(30);
    return { 
      success: true, 
      reward: { type: 'ad_free_time', amount: 30 } 
    };
  }

  // Check if rewarded ad is ready - MOCK
  isRewardedAdReady(): boolean {
    return true; // Always "ready" for testing
  }

  // Check if interstitial ad is ready - MOCK
  isInterstitialAdReady(): boolean {
    return false;
  }
}

// Export singleton instance
export const adMobService = new AdMobService();
export default adMobService;

// adMobService.native.ts
// Google AdMob Integration Service for MegaRadio
// TEMPORARILY DISABLED: react-native-google-mobile-ads causes crash with RN 0.81+ Fabric
// TODO: Re-enable when library is updated for Fabric compatibility

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const AD_FREE_UNTIL_KEY = '@megaradio_ad_free_until';
const STATION_CHANGE_COUNT_KEY = '@megaradio_station_change_count';

console.log('[AdMob] Service DISABLED - Fabric compatibility issue');

class AdMobService {
  private isInitialized = false;
  private stationChangeCount = 0;

  // Initialize - DISABLED
  async initialize(): Promise<boolean> {
    console.log('[AdMob] SDK DISABLED - Fabric compatibility issue with RN 0.81+');
    
    // Load station change count from storage (for when ads are re-enabled)
    try {
      const countStr = await AsyncStorage.getItem(STATION_CHANGE_COUNT_KEY);
      this.stationChangeCount = countStr ? parseInt(countStr, 10) : 0;
    } catch (e) {
      // Ignore
    }
    
    this.isInitialized = true;
    return false; // Return false since ads are disabled
  }

  // Load Interstitial Ad - DISABLED
  async loadInterstitialAd(): Promise<void> {
    // No-op
  }

  // Load Rewarded Ad - DISABLED
  async loadRewardedAd(): Promise<void> {
    // No-op
  }

  // Check if user has ad-free time remaining
  async isAdFree(): Promise<boolean> {
    try {
      const adFreeUntil = await AsyncStorage.getItem(AD_FREE_UNTIL_KEY);
      if (!adFreeUntil) return true; // Return true since ads are disabled
      
      const expiryTime = parseInt(adFreeUntil, 10);
      return Date.now() < expiryTime || true; // Always ad-free while disabled
    } catch (error) {
      return true;
    }
  }

  // Get remaining ad-free time in minutes
  async getAdFreeMinutesRemaining(): Promise<number> {
    return 999; // Ads disabled, essentially infinite ad-free
  }

  // Grant ad-free time
  async grantAdFreeTime(minutes: number = 30): Promise<void> {
    try {
      const currentAdFree = await AsyncStorage.getItem(AD_FREE_UNTIL_KEY);
      const currentExpiry = currentAdFree ? parseInt(currentAdFree, 10) : Date.now();
      
      const baseTime = currentExpiry > Date.now() ? currentExpiry : Date.now();
      const newExpiry = baseTime + (minutes * 60 * 1000);
      
      await AsyncStorage.setItem(AD_FREE_UNTIL_KEY, String(newExpiry));
    } catch (error) {
      // Ignore
    }
  }

  // Track station change - DISABLED
  async onStationChange(): Promise<boolean> {
    return false; // Never show ads
  }

  // Show Interstitial Ad - DISABLED
  async showInterstitialAd(): Promise<boolean> {
    console.log('[AdMob] Interstitial DISABLED');
    return false;
  }

  // Show Rewarded Ad - DISABLED
  async showRewardedAd(): Promise<{ success: boolean; reward?: { type: string; amount: number } }> {
    console.log('[AdMob] Rewarded ads DISABLED');
    // Simulate reward for testing/user experience
    await this.grantAdFreeTime(30);
    return { 
      success: true, 
      reward: { type: 'ad_free_time', amount: 30 } 
    };
  }

  // Check if rewarded ad is ready - DISABLED
  isRewardedAdReady(): boolean {
    return false;
  }

  // Check if interstitial ad is ready - DISABLED
  isInterstitialAdReady(): boolean {
    return false;
  }
}

// Export singleton instance
export const adMobService = new AdMobService();
export default adMobService;

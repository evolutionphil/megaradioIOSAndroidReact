// adMobService.ts
// Google AdMob Integration Service for MegaRadio
// Handles Interstitial and Rewarded ads

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const AD_FREE_UNTIL_KEY = '@megaradio_ad_free_until';
const STATION_CHANGE_COUNT_KEY = '@megaradio_station_change_count';
const INTERSTITIAL_FREQUENCY = 4; // Show ad every 4 station changes

// Ad Unit IDs (Production)
const AD_UNITS = {
  ios: {
    interstitial: 'ca-app-pub-8771434485570434/6008042825',
    rewarded: 'ca-app-pub-8771434485570434/3488497756',
  },
  android: {
    interstitial: 'ca-app-pub-8771434485570434/7220363780',
    rewarded: 'ca-app-pub-8771434485570434/8745886806',
  },
};

// Test Ad Unit IDs (for development)
const TEST_AD_UNITS = {
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
};

class AdMobService {
  private interstitialAd: any = null;
  private rewardedAd: any = null;
  private isInterstitialLoaded = false;
  private isRewardedLoaded = false;
  private isInitialized = false;
  private stationChangeCount = 0;

  // Get the correct ad unit ID based on platform and environment
  getAdUnitId(type: 'interstitial' | 'rewarded'): string {
    if (__DEV__) {
      return TEST_AD_UNITS[type];
    }
    
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    return AD_UNITS[platform][type];
  }

  // Initialize AdMob SDK
  async initialize(): Promise<boolean> {
    if (Platform.OS === 'web') {
      console.log('[AdMob] Not available on web');
      return false;
    }

    if (this.isInitialized) {
      return true;
    }

    try {
      const mobileAds = require('react-native-google-mobile-ads').default;
      
      await mobileAds().initialize();
      console.log('[AdMob] SDK initialized successfully');
      
      this.isInitialized = true;
      
      // Load initial ads
      await this.loadInterstitialAd();
      await this.loadRewardedAd();
      
      // Load station change count from storage
      const countStr = await AsyncStorage.getItem(STATION_CHANGE_COUNT_KEY);
      this.stationChangeCount = countStr ? parseInt(countStr, 10) : 0;
      
      return true;
    } catch (error) {
      console.error('[AdMob] Initialization error:', error);
      return false;
    }
  }

  // Load Interstitial Ad
  async loadInterstitialAd(): Promise<void> {
    if (Platform.OS === 'web' || !this.isInitialized) return;

    try {
      const { InterstitialAd, AdEventType } = require('react-native-google-mobile-ads');
      
      const adUnitId = this.getAdUnitId('interstitial');
      this.interstitialAd = InterstitialAd.createForAdRequest(adUnitId, {
        keywords: ['music', 'radio', 'streaming', 'entertainment'],
      });

      this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        console.log('[AdMob] Interstitial ad loaded');
        this.isInterstitialLoaded = true;
      });

      this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('[AdMob] Interstitial ad closed');
        this.isInterstitialLoaded = false;
        // Reload for next time
        this.loadInterstitialAd();
      });

      this.interstitialAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
        console.error('[AdMob] Interstitial ad error:', error);
        this.isInterstitialLoaded = false;
      });

      this.interstitialAd.load();
    } catch (error) {
      console.error('[AdMob] Error loading interstitial:', error);
    }
  }

  // Load Rewarded Ad
  async loadRewardedAd(): Promise<void> {
    if (Platform.OS === 'web' || !this.isInitialized) return;

    try {
      const { RewardedAd, RewardedAdEventType } = require('react-native-google-mobile-ads');
      
      const adUnitId = this.getAdUnitId('rewarded');
      this.rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
        keywords: ['music', 'radio', 'streaming', 'entertainment'],
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        console.log('[AdMob] Rewarded ad loaded');
        this.isRewardedLoaded = true;
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.CLOSED, () => {
        console.log('[AdMob] Rewarded ad closed');
        this.isRewardedLoaded = false;
        // Reload for next time
        this.loadRewardedAd();
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.ERROR, (error: any) => {
        console.error('[AdMob] Rewarded ad error:', error);
        this.isRewardedLoaded = false;
      });

      this.rewardedAd.load();
    } catch (error) {
      console.error('[AdMob] Error loading rewarded ad:', error);
    }
  }

  // Check if user has ad-free time remaining
  async isAdFree(): Promise<boolean> {
    try {
      const adFreeUntil = await AsyncStorage.getItem(AD_FREE_UNTIL_KEY);
      if (!adFreeUntil) return false;
      
      const expiryTime = parseInt(adFreeUntil, 10);
      return Date.now() < expiryTime;
    } catch (error) {
      return false;
    }
  }

  // Get remaining ad-free time in minutes
  async getAdFreeMinutesRemaining(): Promise<number> {
    try {
      const adFreeUntil = await AsyncStorage.getItem(AD_FREE_UNTIL_KEY);
      if (!adFreeUntil) return 0;
      
      const expiryTime = parseInt(adFreeUntil, 10);
      const remaining = expiryTime - Date.now();
      
      if (remaining <= 0) return 0;
      return Math.ceil(remaining / 60000); // Convert to minutes
    } catch (error) {
      return 0;
    }
  }

  // Grant ad-free time (called after watching rewarded ad)
  async grantAdFreeTime(minutes: number = 30): Promise<void> {
    try {
      const currentAdFree = await AsyncStorage.getItem(AD_FREE_UNTIL_KEY);
      const currentExpiry = currentAdFree ? parseInt(currentAdFree, 10) : Date.now();
      
      // Add time to current expiry (or from now if expired)
      const baseTime = currentExpiry > Date.now() ? currentExpiry : Date.now();
      const newExpiry = baseTime + (minutes * 60 * 1000);
      
      await AsyncStorage.setItem(AD_FREE_UNTIL_KEY, String(newExpiry));
      console.log('[AdMob] Granted', minutes, 'minutes ad-free time');
    } catch (error) {
      console.error('[AdMob] Error granting ad-free time:', error);
    }
  }

  // Track station change and show interstitial if needed
  async onStationChange(): Promise<boolean> {
    // Check if user is ad-free
    if (await this.isAdFree()) {
      console.log('[AdMob] User is ad-free, skipping interstitial');
      return false;
    }

    this.stationChangeCount++;
    await AsyncStorage.setItem(STATION_CHANGE_COUNT_KEY, String(this.stationChangeCount));

    // Show interstitial every N station changes
    if (this.stationChangeCount >= INTERSTITIAL_FREQUENCY) {
      this.stationChangeCount = 0;
      await AsyncStorage.setItem(STATION_CHANGE_COUNT_KEY, '0');
      
      return await this.showInterstitialAd();
    }

    return false;
  }

  // Show Interstitial Ad
  async showInterstitialAd(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    
    // Check if user is ad-free
    if (await this.isAdFree()) {
      console.log('[AdMob] User is ad-free, skipping interstitial');
      return false;
    }

    if (!this.isInterstitialLoaded || !this.interstitialAd) {
      console.log('[AdMob] Interstitial not ready');
      return false;
    }

    try {
      await this.interstitialAd.show();
      return true;
    } catch (error) {
      console.error('[AdMob] Error showing interstitial:', error);
      return false;
    }
  }

  // Show Rewarded Ad and return promise that resolves when reward is earned
  async showRewardedAd(): Promise<{ success: boolean; reward?: { type: string; amount: number } }> {
    if (Platform.OS === 'web') {
      return { success: false };
    }

    if (!this.isRewardedLoaded || !this.rewardedAd) {
      console.log('[AdMob] Rewarded ad not ready');
      return { success: false };
    }

    return new Promise((resolve) => {
      const { RewardedAdEventType } = require('react-native-google-mobile-ads');
      
      // Listen for reward earned
      const rewardListener = this.rewardedAd.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        async (reward: { type: string; amount: number }) => {
          console.log('[AdMob] Reward earned:', reward);
          
          // Grant 30 minutes ad-free time
          await this.grantAdFreeTime(30);
          
          rewardListener();
          resolve({ success: true, reward });
        }
      );

      // Show the ad
      this.rewardedAd.show().catch((error: any) => {
        console.error('[AdMob] Error showing rewarded ad:', error);
        rewardListener();
        resolve({ success: false });
      });
    });
  }

  // Check if rewarded ad is ready
  isRewardedAdReady(): boolean {
    return this.isRewardedLoaded && this.rewardedAd !== null;
  }

  // Check if interstitial ad is ready
  isInterstitialAdReady(): boolean {
    return this.isInterstitialLoaded && this.interstitialAd !== null;
  }
}

// Export singleton instance
export const adMobService = new AdMobService();
export default adMobService;

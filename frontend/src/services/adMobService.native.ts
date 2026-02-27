// adMobService.native.ts
// Google AdMob Integration Service for MegaRadio
// Uses react-native-google-mobile-ads with safe initialization

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const AD_FREE_UNTIL_KEY = '@megaradio_ad_free_until';
const STATION_CHANGE_COUNT_KEY = '@megaradio_station_change_count';

// Dynamic imports for safety - will be set after initialization
let mobileAds: any = null;
let InterstitialAd: any = null;
let RewardedAd: any = null;
let AdEventType: any = null;
let RewardedAdEventType: any = null;
let TestIds: any = null;

// Ad Unit IDs (using test IDs for development, production IDs should come from env)
const AD_UNIT_IDS = {
  interstitial: {
    ios: __DEV__ ? 'ca-app-pub-3940256099942544/4411468910' : 'ca-app-pub-XXXXX/XXXXX', // Replace with production
    android: __DEV__ ? 'ca-app-pub-3940256099942544/1033173712' : 'ca-app-pub-XXXXX/XXXXX', // Replace with production
  },
  rewarded: {
    ios: __DEV__ ? 'ca-app-pub-3940256099942544/1712485313' : 'ca-app-pub-XXXXX/XXXXX', // Replace with production
    android: __DEV__ ? 'ca-app-pub-3940256099942544/5224354917' : 'ca-app-pub-XXXXX/XXXXX', // Replace with production
  },
};

class AdMobService {
  private isInitialized = false;
  private stationChangeCount = 0;
  private interstitialAd: any = null;
  private rewardedAd: any = null;
  private interstitialLoaded = false;
  private rewardedLoaded = false;
  private sdkAvailable = false;

  // Safely load the AdMob SDK
  private async loadSdk(): Promise<boolean> {
    try {
      // Dynamic import to prevent crash if library is not installed
      const admobModule = await import('react-native-google-mobile-ads');
      mobileAds = admobModule.default;
      InterstitialAd = admobModule.InterstitialAd;
      RewardedAd = admobModule.RewardedAd;
      AdEventType = admobModule.AdEventType;
      RewardedAdEventType = admobModule.RewardedAdEventType;
      TestIds = admobModule.TestIds;
      
      console.log('[AdMob] SDK module loaded successfully');
      return true;
    } catch (error) {
      console.warn('[AdMob] SDK not available:', error);
      return false;
    }
  }

  // Initialize AdMob SDK
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return this.sdkAvailable;
    }

    console.log('[AdMob] Initializing...');
    
    // Load station change count from storage
    try {
      const countStr = await AsyncStorage.getItem(STATION_CHANGE_COUNT_KEY);
      this.stationChangeCount = countStr ? parseInt(countStr, 10) : 0;
    } catch (e) {
      // Ignore
    }

    // Try to load SDK
    this.sdkAvailable = await this.loadSdk();
    
    if (!this.sdkAvailable) {
      console.log('[AdMob] SDK not available - ads will be disabled');
      this.isInitialized = true;
      return false;
    }

    try {
      // Initialize Google Mobile Ads SDK
      const adapterStatuses = await mobileAds().initialize();
      console.log('[AdMob] SDK initialized:', adapterStatuses);
      
      // Preload ads
      this.loadInterstitialAd();
      this.loadRewardedAd();
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('[AdMob] Initialization error:', error);
      this.sdkAvailable = false;
      this.isInitialized = true;
      return false;
    }
  }

  // Load Interstitial Ad
  async loadInterstitialAd(): Promise<void> {
    if (!this.sdkAvailable || !InterstitialAd) {
      console.log('[AdMob] Cannot load interstitial - SDK not available');
      return;
    }

    try {
      const adUnitId = Platform.OS === 'ios' 
        ? AD_UNIT_IDS.interstitial.ios 
        : AD_UNIT_IDS.interstitial.android;

      this.interstitialAd = InterstitialAd.createForAdRequest(adUnitId, {
        keywords: ['radio', 'music', 'streaming'],
      });

      this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        console.log('[AdMob] Interstitial loaded');
        this.interstitialLoaded = true;
      });

      this.interstitialAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
        console.warn('[AdMob] Interstitial error:', error);
        this.interstitialLoaded = false;
        // Retry after delay
        setTimeout(() => this.loadInterstitialAd(), 30000);
      });

      this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('[AdMob] Interstitial closed');
        this.interstitialLoaded = false;
        // Reload for next time
        this.loadInterstitialAd();
      });

      await this.interstitialAd.load();
    } catch (error) {
      console.error('[AdMob] Error loading interstitial:', error);
    }
  }

  // Load Rewarded Ad
  async loadRewardedAd(): Promise<void> {
    if (!this.sdkAvailable || !RewardedAd) {
      console.log('[AdMob] Cannot load rewarded - SDK not available');
      return;
    }

    try {
      const adUnitId = Platform.OS === 'ios'
        ? AD_UNIT_IDS.rewarded.ios
        : AD_UNIT_IDS.rewarded.android;

      this.rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
        keywords: ['radio', 'music', 'streaming'],
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        console.log('[AdMob] Rewarded loaded');
        this.rewardedLoaded = true;
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.ERROR, (error: any) => {
        console.warn('[AdMob] Rewarded error:', error);
        this.rewardedLoaded = false;
        // Retry after delay
        setTimeout(() => this.loadRewardedAd(), 30000);
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.CLOSED, () => {
        console.log('[AdMob] Rewarded closed');
        this.rewardedLoaded = false;
        // Reload for next time
        this.loadRewardedAd();
      });

      await this.rewardedAd.load();
    } catch (error) {
      console.error('[AdMob] Error loading rewarded:', error);
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
      return remaining > 0 ? Math.ceil(remaining / (60 * 1000)) : 0;
    } catch (error) {
      return 0;
    }
  }

  // Grant ad-free time
  async grantAdFreeTime(minutes: number = 30): Promise<void> {
    try {
      const currentAdFree = await AsyncStorage.getItem(AD_FREE_UNTIL_KEY);
      const currentExpiry = currentAdFree ? parseInt(currentAdFree, 10) : Date.now();
      
      const baseTime = currentExpiry > Date.now() ? currentExpiry : Date.now();
      const newExpiry = baseTime + (minutes * 60 * 1000);
      
      await AsyncStorage.setItem(AD_FREE_UNTIL_KEY, String(newExpiry));
      console.log(`[AdMob] Granted ${minutes} minutes ad-free time`);
    } catch (error) {
      console.error('[AdMob] Error granting ad-free time:', error);
    }
  }

  // Track station change and potentially show ad
  async onStationChange(): Promise<boolean> {
    // Check if ad-free
    const adFree = await this.isAdFree();
    if (adFree) {
      console.log('[AdMob] User is ad-free, skipping interstitial');
      return false;
    }

    this.stationChangeCount++;
    
    try {
      await AsyncStorage.setItem(STATION_CHANGE_COUNT_KEY, String(this.stationChangeCount));
    } catch (e) {
      // Ignore
    }

    // Show interstitial every 5 station changes
    if (this.stationChangeCount >= 5) {
      this.stationChangeCount = 0;
      await AsyncStorage.setItem(STATION_CHANGE_COUNT_KEY, '0');
      return await this.showInterstitialAd();
    }

    return false;
  }

  // Show Interstitial Ad
  async showInterstitialAd(): Promise<boolean> {
    if (!this.sdkAvailable) {
      console.log('[AdMob] SDK not available');
      return false;
    }

    // Check if ad-free
    const adFree = await this.isAdFree();
    if (adFree) {
      console.log('[AdMob] User is ad-free, not showing interstitial');
      return false;
    }

    if (!this.interstitialLoaded || !this.interstitialAd) {
      console.log('[AdMob] Interstitial not ready');
      this.loadInterstitialAd();
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

  // Show Rewarded Ad
  async showRewardedAd(): Promise<{ success: boolean; reward?: { type: string; amount: number } }> {
    if (!this.sdkAvailable) {
      console.log('[AdMob] SDK not available - granting mock reward');
      await this.grantAdFreeTime(30);
      return { success: true, reward: { type: 'ad_free_time', amount: 30 } };
    }

    if (!this.rewardedLoaded || !this.rewardedAd) {
      console.log('[AdMob] Rewarded ad not ready');
      this.loadRewardedAd();
      return { success: false };
    }

    return new Promise((resolve) => {
      const rewardListener = this.rewardedAd.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        async (reward: { type: string; amount: number }) => {
          console.log('[AdMob] User earned reward:', reward);
          await this.grantAdFreeTime(30);
          rewardListener();
          resolve({ success: true, reward: { type: 'ad_free_time', amount: 30 } });
        }
      );

      this.rewardedAd.show().catch((error: any) => {
        console.error('[AdMob] Error showing rewarded:', error);
        rewardListener();
        resolve({ success: false });
      });
    });
  }

  // Check if rewarded ad is ready
  isRewardedAdReady(): boolean {
    return this.sdkAvailable && this.rewardedLoaded;
  }

  // Check if interstitial ad is ready
  isInterstitialAdReady(): boolean {
    return this.sdkAvailable && this.interstitialLoaded;
  }
}

// Export singleton instance
export const adMobService = new AdMobService();
export default adMobService;

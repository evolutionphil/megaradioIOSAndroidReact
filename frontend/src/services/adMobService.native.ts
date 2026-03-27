// adMobService.ts
// Google AdMob Integration Service for MegaRadio
// Handles Interstitial and Rewarded ads

import { Platform, NativeModules, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const AD_FREE_UNTIL_KEY = '@megaradio_ad_free_until';
const STATION_CHANGE_COUNT_KEY = '@megaradio_station_change_count';
const INTERSTITIAL_FREQUENCY = 3; // Show ad every 3 station changes

// Ad Unit IDs (Production)
const AD_UNITS = {
  ios: {
    interstitial: 'ca-app-pub-8771434485570434/6008042825',
    appOpenInterstitial: 'ca-app-pub-8771434485570434/4798357761', // First-launch interstitial
    rewarded: 'ca-app-pub-8771434485570434/3488497756',
  },
  android: {
    interstitial: 'ca-app-pub-8771434485570434/7220363780',
    appOpenInterstitial: 'ca-app-pub-8771434485570434/7220363780', // Same as regular for now
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
  private appOpenAd: any = null;
  private isInterstitialLoaded = false;
  private isRewardedLoaded = false;
  private isAppOpenLoaded = false;
  private isInitialized = false;
  private stationChangeCount = 0;
  private firstStationAdShown = false; // Per-session flag for first station rewarded ad

  // Get the correct ad unit ID based on platform and environment
  getAdUnitId(type: 'interstitial' | 'rewarded' | 'appOpenInterstitial'): string {
    if (__DEV__) {
      // Test ads don't have appOpenInterstitial, use regular interstitial
      return TEST_AD_UNITS[type === 'appOpenInterstitial' ? 'interstitial' : type];
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
      const { MaxAdContentRating } = require('react-native-google-mobile-ads');
      
      // CRITICAL: Set request configuration BEFORE initializing
      // requestNonPersonalizedAdsOnly ensures ads serve even when ATT is denied
      try {
        await mobileAds().setRequestConfiguration({
          maxAdContentRating: MaxAdContentRating.T,
          tagForChildDirectedTreatment: false,
          tagForUnderAgeOfConsent: false,
          requestNonPersonalizedAdsOnly: true,
        });
        console.log('[AdMob] Request configuration set (non-personalized ads enabled)');
      } catch (configError) {
        console.error('[AdMob] Request configuration error (non-fatal):', configError);
      }
      
      // iOS 14+: Request ATT (App Tracking Transparency) BEFORE initializing ads
      // Without ATT permission, AdMob cannot access IDFA and ads won't serve (or very low fill rate)
      if (Platform.OS === 'ios') {
        try {
          // STEP 1: Request native iOS ATT permission via our custom native module
          // ATTModule is defined in ios/MegaRadio/ATTModule.swift - zero dependencies
          const { ATTModule } = NativeModules;
          if (ATTModule) {
            const status = await ATTModule.requestPermission();
            console.log('[AdMob] ATT permission status:', status);
          } else {
            console.log('[AdMob] ATTModule not available (non-fatal)');
          }
          // Continue regardless of status - AdMob will serve non-personalized ads if denied
        } catch (attError) {
          console.log('[AdMob] ATT request error (non-fatal):', attError);
        }
        
        try {
          // STEP 2: Request Google UMP consent (for GDPR regions)
          const { AdsConsent, AdsConsentStatus } = require('react-native-google-mobile-ads');
          
          const consentInfo = await AdsConsent.requestInfoUpdate();
          console.log('[AdMob] UMP Consent info:', consentInfo.status);
          
          if (consentInfo.isConsentFormAvailable && 
              (consentInfo.status === AdsConsentStatus.REQUIRED || 
               consentInfo.status === AdsConsentStatus.UNKNOWN)) {
            console.log('[AdMob] Showing UMP consent form...');
            await AdsConsent.showForm();
          }
        } catch (consentError) {
          console.log('[AdMob] UMP consent request error (non-fatal):', consentError);
        }
      }
      
      await mobileAds().initialize();
      console.log('[AdMob] SDK initialized successfully');
      
      this.isInitialized = true;
      
      // Load initial ads IN PARALLEL (not sequential)
      await Promise.allSettled([
        this.loadInterstitialAd(),
        this.loadRewardedAd(),
        this.loadAppOpenAd(),
      ]);
      console.log('[AdMob] Initial ads loading started');
      
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
      
      // CRITICAL: Clean up old instance before creating new one
      if (this.interstitialAd) {
        try {
          this.interstitialAd.removeAllListeners();
        } catch (e) {
          // Ignore cleanup errors
        }
        this.interstitialAd = null;
      }
      this.isInterstitialLoaded = false;
      
      const adUnitId = this.getAdUnitId('interstitial');
      console.log('[AdMob] Loading interstitial with adUnitId:', adUnitId);
      
      this.interstitialAd = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
        keywords: ['music', 'radio', 'streaming', 'entertainment'],
      });

      this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        console.log('[AdMob] Interstitial ad LOADED successfully');
        this.isInterstitialLoaded = true;
      });

      // iOS: Hide status bar when ad opens to prevent display issues
      this.interstitialAd.addAdEventListener(AdEventType.OPENED, () => {
        console.log('[AdMob] Interstitial ad OPENED');
        if (Platform.OS === 'ios') {
          StatusBar.setHidden(true);
        }
      });

      this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('[AdMob] Interstitial ad closed by user');
        if (Platform.OS === 'ios') {
          StatusBar.setHidden(false);
        }
        this.isInterstitialLoaded = false;
        this.loadInterstitialAd();
      });

      this.interstitialAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
        console.error('[AdMob] Interstitial ad ERROR:', error?.message || error);
        this.isInterstitialLoaded = false;
        setTimeout(() => {
          console.log('[AdMob] Retrying interstitial ad load...');
          this.loadInterstitialAd();
        }, 15000);
      });

      this.interstitialAd.load();
    } catch (error) {
      console.error('[AdMob] Error creating interstitial:', error);
    }
  }

  // Load App Open Ad (separate ad unit - App Open type in AdMob)
  async loadAppOpenAd(): Promise<void> {
    if (Platform.OS === 'web' || !this.isInitialized) return;

    try {
      const { AppOpenAd, AdEventType } = require('react-native-google-mobile-ads');
      
      if (this.appOpenAd) {
        try { this.appOpenAd.removeAllListeners(); } catch (e) {}
        this.appOpenAd = null;
      }
      this.isAppOpenLoaded = false;
      
      const adUnitId = this.getAdUnitId('appOpenInterstitial');
      console.log('[AdMob] Loading App Open ad with adUnitId:', adUnitId);
      
      // Use AppOpenAd (NOT InterstitialAd) for App Open ad units
      this.appOpenAd = AppOpenAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      this.appOpenAd.addAdEventListener(AdEventType.LOADED, () => {
        console.log('[AdMob] App Open ad LOADED');
        this.isAppOpenLoaded = true;
      });

      this.appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('[AdMob] App Open ad closed');
        this.isAppOpenLoaded = false;
      });

      this.appOpenAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
        console.error('[AdMob] App Open ad ERROR:', error?.message || error);
        this.isAppOpenLoaded = false;
      });

      this.appOpenAd.load();
    } catch (error) {
      console.error('[AdMob] Error creating App Open ad:', error);
    }
  }

  // Show App Open Ad (with rewarded fallback if no-fill)
  async showAppOpenAd(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    
    // Check ad-free time
    const adFreeUntil = await AsyncStorage.getItem(AD_FREE_UNTIL_KEY);
    if (adFreeUntil && new Date(adFreeUntil) > new Date()) {
      console.log('[AdMob] User has ad-free time, skipping app-open ad');
      return false;
    }

    // Try App Open ad first
    if (this.isAppOpenLoaded && this.appOpenAd) {
      try {
        await this.appOpenAd.show();
        console.log('[AdMob] App Open ad shown');
        this.isAppOpenLoaded = false;
        return true;
      } catch (error) {
        console.error('[AdMob] Error showing App Open ad:', error);
      }
    }
    
    // Fallback: Try rewarded ad if app open not available
    console.log('[AdMob] App Open ad not loaded, trying rewarded fallback...');
    if (this.isRewardedLoaded && this.rewardedAd) {
      try {
        await this.rewardedAd.show();
        console.log('[AdMob] Rewarded ad shown as fallback for app open');
        this.isRewardedLoaded = false;
        // Do NOT grant ad-free time for auto-shown ads
        // Only manual "watch ad" button grants ad-free time
        this.loadRewardedAd();
        return true;
      } catch (error) {
        console.error('[AdMob] Rewarded fallback error:', error);
      }
    }

    console.log('[AdMob] No ad available for app open');
    return false;
  }


  // Load Rewarded Interstitial Ad
  async loadRewardedAd(): Promise<void> {
    if (Platform.OS === 'web' || !this.isInitialized) return;

    try {
      const { RewardedInterstitialAd, RewardedAdEventType, AdEventType } = require('react-native-google-mobile-ads');
      
      // CRITICAL: Clean up old instance before creating new one
      if (this.rewardedAd) {
        try {
          this.rewardedAd.removeAllListeners();
        } catch (e) {
          // Ignore cleanup errors
        }
        this.rewardedAd = null;
      }
      this.isRewardedLoaded = false;
      
      const adUnitId = this.getAdUnitId('rewarded');
      console.log('[AdMob] Loading rewarded interstitial with adUnitId:', adUnitId);
      
      this.rewardedAd = RewardedInterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
        keywords: ['music', 'radio', 'streaming', 'entertainment'],
      });

      // RewardedInterstitialAd requires RewardedAdEventType for LOADED
      this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        console.log('[AdMob] Rewarded interstitial ad LOADED successfully');
        this.isRewardedLoaded = true;
      });

      // Use addAdEventsListener for ERROR and CLOSED (not available via RewardedAdEventType)
      this.rewardedAd.addAdEventsListener(({ type, payload }: { type: string; payload?: any }) => {
        if (type === AdEventType.CLOSED || type === 'closed') {
          console.log('[AdMob] Rewarded interstitial ad closed');
          this.isRewardedLoaded = false;
          this.loadRewardedAd();
        } else if (type === AdEventType.ERROR || type === 'error') {
          console.error('[AdMob] Rewarded interstitial ad ERROR:', payload?.message || payload);
          this.isRewardedLoaded = false;
          setTimeout(() => {
            console.log('[AdMob] Retrying rewarded interstitial ad load...');
            this.loadRewardedAd();
          }, 15000);
        }
      });

      this.rewardedAd.load();
    } catch (error) {
      console.error('[AdMob] Error creating rewarded interstitial ad:', error);
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
    // Don't track if not initialized yet
    if (Platform.OS === 'web' || !this.isInitialized) {
      console.log('[AdMob] onStationChange skipped - not initialized');
      return false;
    }
    
    // Check if user is ad-free
    if (await this.isAdFree()) {
      console.log('[AdMob] User is ad-free, skipping interstitial');
      return false;
    }

    this.stationChangeCount++;
    await AsyncStorage.setItem(STATION_CHANGE_COUNT_KEY, String(this.stationChangeCount));
    console.log('[AdMob] Station change count:', this.stationChangeCount, '/ frequency:', INTERSTITIAL_FREQUENCY);

    // Show interstitial every INTERSTITIAL_FREQUENCY station changes (3, 6, 9, 12...)
    if (this.stationChangeCount % INTERSTITIAL_FREQUENCY === 0) {
      console.log('[AdMob] Frequency hit! Attempting to show interstitial...');
      console.log('[AdMob] isInterstitialLoaded:', this.isInterstitialLoaded);
      
      // Try interstitial first
      let adShown = await this.showInterstitialAd();
      
      if (adShown) {
        console.log('[AdMob] Interstitial shown successfully');
        return true;
      }
      
      // Fallback: Try rewarded ad if interstitial not available
      console.log('[AdMob] Interstitial not ready, trying rewarded fallback...');
      if (this.isRewardedLoaded && this.rewardedAd) {
        try {
          await this.rewardedAd.show();
          console.log('[AdMob] Rewarded ad shown as fallback');
          this.isRewardedLoaded = false;
          await this.grantAdFreeTime(30);
          this.loadRewardedAd();
          return true;
        } catch (error) {
          console.log('[AdMob] Rewarded fallback error:', error);
        }
      }

      // Neither worked - preload both for next time
      console.log('[AdMob] No ads available, preloading for next time...');
      this.loadInterstitialAd();
      this.loadRewardedAd();
      return false;
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

  // Show Rewarded Interstitial Ad and return promise that resolves when reward is earned
  async showRewardedAd(): Promise<{ success: boolean; reward?: { type: string; amount: number } }> {
    if (Platform.OS === 'web') {
      return { success: false };
    }

    if (!this.isRewardedLoaded || !this.rewardedAd) {
      console.log('[AdMob] Rewarded interstitial ad not ready');
      return { success: false };
    }

    return new Promise((resolve) => {
      const { RewardedAdEventType, AdEventType } = require('react-native-google-mobile-ads');
      let resolved = false;
      
      // Listen for reward earned
      const rewardListener = this.rewardedAd.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        async (reward: { type: string; amount: number }) => {
          console.log('[AdMob] Reward earned:', reward);
          
          // Grant 30 minutes ad-free time
          await this.grantAdFreeTime(30);
          
          resolved = true;
          rewardListener();
          closeListener();
          resolve({ success: true, reward });
        }
      );

      // CRITICAL: Listen for ad close WITHOUT earning reward (user cancelled)
      // Without this, the promise would NEVER resolve and the button stays in loading state
      const closeListener = this.rewardedAd.addAdEventsListener(({ type }: { type: string }) => {
        if (type === AdEventType.CLOSED || type === 'closed') {
          if (!resolved) {
            console.log('[AdMob] Rewarded ad closed WITHOUT earning reward (user cancelled)');
            resolved = true;
            rewardListener();
            closeListener();
            resolve({ success: false });
          }
        }
      });

      // Show the ad
      this.rewardedAd.show().catch((error: any) => {
        console.error('[AdMob] Error showing rewarded interstitial ad:', error);
        if (!resolved) {
          resolved = true;
          rewardListener();
          closeListener();
          resolve({ success: false });
        }
      });
    });
  }

  // Check if rewarded ad is ready
  isRewardedAdReady(): boolean {
    return this.isRewardedLoaded && this.rewardedAd !== null;
  }

  // Check if first station rewarded ad should be shown (per session)
  shouldShowFirstStationAd(): boolean {
    return !this.firstStationAdShown && this.isRewardedLoaded && this.rewardedAd !== null;
  }

  // Mark first station ad as shown (per session)
  markFirstStationAdShown(): void {
    this.firstStationAdShown = true;
  }

  // Check if interstitial ad is ready
  isInterstitialAdReady(): boolean {
    return this.isInterstitialLoaded && this.interstitialAd !== null;
  }
}

// Export singleton instance
export const adMobService = new AdMobService();
export default adMobService;

// Firebase Crashlytics Service for MegaRadio
// Provides crash reporting, error logging, and custom keys for debugging
// Uses lazy loading to avoid web bundling issues
import { Platform } from 'react-native';

let crashlytics: any = null;

// Lazy load crashlytics module (native only)
const getCrashlytics = () => {
  if (crashlytics) return crashlytics;
  if (Platform.OS === 'web') return null;
  try {
    const mod = require('@react-native-firebase/crashlytics');
    crashlytics = mod.default || mod;
    return crashlytics;
  } catch (e) {
    console.warn('[Crashlytics] Firebase Crashlytics not available:', e);
    return null;
  }
};

class CrashlyticsService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized || Platform.OS === 'web') return;
    try {
      const c = getCrashlytics();
      if (c) {
        await c().setCrashlyticsCollectionEnabled(true);
        this.initialized = true;
        console.log('[Crashlytics] Firebase Crashlytics initialized');
      }
    } catch (error) {
      console.warn('[Crashlytics] Failed to initialize:', error);
    }
  }

  // Record a non-fatal error
  recordError(error: Error, context?: string): void {
    try {
      const c = getCrashlytics();
      if (c) {
        if (context) {
          c().log(`[${context}] ${error.message}`);
        }
        c().recordError(error);
      }
    } catch (e) {
      // Silent fail - don't crash while reporting crashes
    }
  }

  // Log a message (appears in Crashlytics logs for the next crash)
  log(message: string): void {
    try {
      const c = getCrashlytics();
      if (c) c().log(message);
    } catch (e) {}
  }

  // Set user identifier for crash reports
  setUserId(userId: string): void {
    try {
      const c = getCrashlytics();
      if (c) c().setUserId(userId);
    } catch (e) {}
  }

  // Set custom key-value pairs for crash context
  setAttribute(key: string, value: string): void {
    try {
      const c = getCrashlytics();
      if (c) c().setAttribute(key, value);
    } catch (e) {}
  }

  // Set multiple attributes at once
  setAttributes(attributes: Record<string, string>): void {
    try {
      const c = getCrashlytics();
      if (c) c().setAttributes(attributes);
    } catch (e) {}
  }

  // Set premium status for crash filtering
  setIsPremium(isPremium: boolean): void {
    this.setAttribute('is_premium', isPremium ? 'true' : 'false');
  }

  // Set current playing station for crash context
  setCurrentStation(stationId: string, stationName: string): void {
    this.setAttributes({
      current_station_id: stationId,
      current_station_name: stationName.substring(0, 100),
    });
  }

  // Set CarPlay/Android Auto connection state
  setCarPlayConnected(connected: boolean, platform: 'carplay' | 'android_auto'): void {
    this.setAttributes({
      car_connected: connected ? 'true' : 'false',
      car_platform: platform,
    });
  }

  // Force a test crash (for development only)
  testCrash(): void {
    try {
      const c = getCrashlytics();
      if (c) c().crash();
    } catch (e) {}
  }

  // Setup global JS error handler to report uncaught errors
  setupGlobalErrorHandler(): void {
    if (Platform.OS === 'web') return;
    
    const originalHandler = ErrorUtils.getGlobalHandler();
    
    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      try {
        const c = getCrashlytics();
        if (c) {
          c().log(`[GlobalError] isFatal=${isFatal} message=${error.message}`);
          c().recordError(error);
        }
      } catch (e) {
        // Silent fail
      }
      
      // Call the original handler
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });
    
    console.log('[Crashlytics] Global error handler installed');
  }
}

export const crashlyticsService = new CrashlyticsService();
export default crashlyticsService;

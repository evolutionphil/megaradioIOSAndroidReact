// Firebase Crashlytics Service - Web stub
// Crashlytics is not available on web, all methods are no-ops

class CrashlyticsService {
  async initialize(): Promise<void> {}
  recordError(_error: Error, _context?: string): void {}
  log(_message: string): void {}
  setUserId(_userId: string): void {}
  setAttribute(_key: string, _value: string): void {}
  setAttributes(_attributes: Record<string, string>): void {}
  setIsPremium(_isPremium: boolean): void {}
  setCurrentStation(_stationId: string, _stationName: string): void {}
  setCarPlayConnected(_connected: boolean, _platform: 'carplay' | 'android_auto'): void {}
  testCrash(): void {}
  setupGlobalErrorHandler(): void {}
}

export const crashlyticsService = new CrashlyticsService();
export default crashlyticsService;

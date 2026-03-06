// deviceTokenService - Register device tokens for push notifications
// Supports both APNs (iOS) and FCM (Android)

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import useLocationStore from '../store/locationStore';

const DEVICE_TOKEN_KEY = '@megaradio_device_token';
const DEVICE_TOKEN_REGISTERED_KEY = '@megaradio_device_token_registered';

interface DeviceTokenPayload {
  platform: 'ios' | 'android';
  token: string;
  userId?: string;
  country?: string;
  countryCode?: string;
  language?: string;
  appVersion?: string;
  deviceModel?: string;
  osVersion?: string;
}

class DeviceTokenService {
  private static instance: DeviceTokenService;
  private currentToken: string | null = null;
  private isRegistering: boolean = false;

  private constructor() {}

  static getInstance(): DeviceTokenService {
    if (!DeviceTokenService.instance) {
      DeviceTokenService.instance = new DeviceTokenService();
    }
    return DeviceTokenService.instance;
  }

  /**
   * Store device token locally
   * Called from AppDelegate (iOS) and MainApplication (Android)
   */
  async storeToken(token: string): Promise<void> {
    try {
      this.currentToken = token;
      await AsyncStorage.setItem(DEVICE_TOKEN_KEY, token);
      console.log('[DeviceToken] Token stored locally:', token.substring(0, 20) + '...');
    } catch (error) {
      console.error('[DeviceToken] Failed to store token:', error);
    }
  }

  /**
   * Get stored device token
   */
  async getStoredToken(): Promise<string | null> {
    try {
      if (this.currentToken) {
        return this.currentToken;
      }
      const token = await AsyncStorage.getItem(DEVICE_TOKEN_KEY);
      this.currentToken = token;
      return token;
    } catch (error) {
      console.error('[DeviceToken] Failed to get token:', error);
      return null;
    }
  }

  /**
   * Check if token was already registered
   */
  async isTokenRegistered(): Promise<boolean> {
    try {
      const registered = await AsyncStorage.getItem(DEVICE_TOKEN_REGISTERED_KEY);
      return registered === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Register device token with backend
   * Called after app launch and when user logs in
   */
  async registerToken(userId?: string): Promise<boolean> {
    // Prevent duplicate registrations
    if (this.isRegistering) {
      console.log('[DeviceToken] Registration already in progress');
      return false;
    }

    try {
      this.isRegistering = true;
      
      const token = await this.getStoredToken();
      if (!token) {
        console.log('[DeviceToken] No token available');
        return false;
      }

      // Check if already registered (unless userId changed)
      const alreadyRegistered = await this.isTokenRegistered();
      if (alreadyRegistered && !userId) {
        console.log('[DeviceToken] Token already registered');
        return true;
      }

      // Get location info
      const { country, countryCode, countryEnglish } = useLocationStore.getState();

      const payload: DeviceTokenPayload = {
        platform: Platform.OS as 'ios' | 'android',
        token: token,
        userId: userId,
        country: countryEnglish || country || undefined,
        countryCode: countryCode || undefined,
        language: undefined, // Will be set from i18n
        appVersion: '1.0.58', // TODO: Get from app.json
        deviceModel: undefined, // TODO: Get from device info
        osVersion: Platform.Version?.toString(),
      };

      console.log('[DeviceToken] Registering token:', {
        platform: payload.platform,
        country: payload.country,
        hasUserId: !!payload.userId,
      });

      // Call backend API
      const response = await api.post('/api/devices/register', payload);

      if (response.data.success) {
        await AsyncStorage.setItem(DEVICE_TOKEN_REGISTERED_KEY, 'true');
        console.log('[DeviceToken] Registration successful');
        return true;
      }

      console.log('[DeviceToken] Registration failed:', response.data);
      return false;
    } catch (error: any) {
      // 409 Conflict means already registered - that's OK
      if (error.response?.status === 409) {
        await AsyncStorage.setItem(DEVICE_TOKEN_REGISTERED_KEY, 'true');
        console.log('[DeviceToken] Token already registered (409)');
        return true;
      }
      console.error('[DeviceToken] Registration error:', error.message);
      return false;
    } finally {
      this.isRegistering = false;
    }
  }

  /**
   * Unregister device token (on logout)
   */
  async unregisterToken(): Promise<boolean> {
    try {
      const token = await this.getStoredToken();
      if (!token) {
        return true;
      }

      await api.post('/api/devices/unregister', {
        platform: Platform.OS,
        token: token,
      });

      await AsyncStorage.removeItem(DEVICE_TOKEN_REGISTERED_KEY);
      console.log('[DeviceToken] Token unregistered');
      return true;
    } catch (error) {
      console.error('[DeviceToken] Unregister error:', error);
      return false;
    }
  }

  /**
   * Update user association (after login)
   */
  async updateUser(userId: string): Promise<boolean> {
    return this.registerToken(userId);
  }

  /**
   * Clear registration status (for re-registration)
   */
  async clearRegistrationStatus(): Promise<void> {
    await AsyncStorage.removeItem(DEVICE_TOKEN_REGISTERED_KEY);
    console.log('[DeviceToken] Registration status cleared');
  }
}

export const deviceTokenService = DeviceTokenService.getInstance();
export default deviceTokenService;

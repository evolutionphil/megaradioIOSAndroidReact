// deviceTokenService - Register device tokens for push notifications
// Supports both APNs (iOS) and FCM (Android)
// BACKEND ENDPOINT: /api/user/push-token (POST for register, DELETE for unregister)

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import useLocationStore from '../store/locationStore';
import i18n from 'i18next';

const DEVICE_TOKEN_KEY = '@megaradio_device_token';
const DEVICE_TOKEN_REGISTERED_KEY = '@megaradio_device_token_registered';

// Backend expects this payload format
interface DeviceTokenPayload {
  token: string;
  platform: 'ios' | 'android';
  deviceName?: string;
  country?: string;
  language?: string;
  tokenType?: 'apns' | 'fcm';
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
   * NOTE: userId is extracted from Authorization header by backend, not sent in body
   */
  async registerToken(): Promise<boolean> {
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

      // Check if already registered
      const alreadyRegistered = await this.isTokenRegistered();
      if (alreadyRegistered) {
        console.log('[DeviceToken] Token already registered');
        return true;
      }

      // Get location and language info
      const { country, countryEnglish } = useLocationStore.getState();
      const currentLanguage = i18n.language || 'en';

      // Backend expects this exact payload format
      const payload: DeviceTokenPayload = {
        token: token,
        platform: Platform.OS as 'ios' | 'android',
        deviceName: undefined, // Optional
        country: countryEnglish || country || undefined,
        language: currentLanguage,
        tokenType: Platform.OS === 'ios' ? 'apns' : 'fcm',
      };

      console.log('[DeviceToken] Registering token:', {
        platform: payload.platform,
        tokenType: payload.tokenType,
        country: payload.country,
        language: payload.language,
      });

      // CORRECT ENDPOINT: /api/user/push-token (POST)
      const response = await api.post('/api/user/push-token', payload);

      if (response.data.success || response.status === 200 || response.status === 201) {
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
   * CORRECT: Uses DELETE method, not POST
   */
  async unregisterToken(): Promise<boolean> {
    try {
      const token = await this.getStoredToken();
      if (!token) {
        return true;
      }

      // CORRECT ENDPOINT: /api/user/push-token (DELETE)
      await api.delete('/api/user/push-token', {
        data: {
          token: token,
          platform: Platform.OS,
        }
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
   * Re-register token (after login - user association happens via auth header)
   */
  async updateUser(): Promise<boolean> {
    // Clear old registration and re-register
    await this.clearRegistrationStatus();
    return this.registerToken();
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

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import api from './api';
import { API_ENDPOINTS } from '../constants/api';

const PUSH_TOKEN_KEY = '@megaradio_push_token';
const NOTIFICATIONS_ENABLED_KEY = '@megaradio_notifications_enabled';

// Only configure notification handler on native platforms
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export interface PushNotificationService {
  registerForPushNotifications: () => Promise<string | null>;
  sendPushTokenToBackend: (token: string) => Promise<void>;
  deletePushTokenFromBackend: (token: string) => Promise<void>;
  getStoredPushToken: () => Promise<string | null>;
  addNotificationListener: (callback: (notification: Notifications.Notification) => void) => () => void;
  addNotificationResponseListener: (callback: (response: Notifications.NotificationResponse) => void) => () => void;
  handleNotificationNavigation: (data: any) => void;
  isNotificationsEnabled: () => Promise<boolean>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
}

const pushNotificationService: PushNotificationService = {
  /**
   * Register for push notifications and get the Expo Push Token
   * Call this AFTER user logs in
   */
  async registerForPushNotifications(): Promise<string | null> {
    let token: string | null = null;

    // Check if it's a real device (notifications don't work on simulators)
    if (!Device.isDevice) {
      console.log('[PushNotification] Must use physical device for Push Notifications');
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PushNotification] Permission not granted');
      return null;
    }

    try {
      // Get project ID from Expo constants
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      console.log('[PushNotification] Project ID:', projectId);
      
      // Get Expo Push Token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      token = tokenData.data;
      console.log('[PushNotification] Token:', token);

      // Store token locally
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
      await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'true');

      // Android specific channel setup
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF4199',
        });

        // Create channel for followers
        await Notifications.setNotificationChannelAsync('followers', {
          name: 'New Followers',
          description: 'Notifications when someone follows you',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
        });

        // Create channel for radio updates
        await Notifications.setNotificationChannelAsync('radio', {
          name: 'Radio Updates',
          description: 'Notifications about your favorite radio stations',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
        });

        // Create channel for new stations
        await Notifications.setNotificationChannelAsync('new-stations', {
          name: 'New Stations',
          description: 'Notifications about new radio stations',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      return token;
    } catch (error) {
      console.error('[PushNotification] Error getting token:', error);
      return null;
    }
  },

  /**
   * Send push token to backend for storage
   * Token is sent with Authorization header (via api interceptor)
   */
  async sendPushTokenToBackend(token: string): Promise<void> {
    try {
      await api.post(API_ENDPOINTS.user.pushToken, {
        token,                                        // "ExponentPushToken[xxxxxxx]"
        platform: Platform.OS,                        // 'ios' or 'android'
        deviceName: Device.deviceName ?? 'Unknown',   // Device name
      });
      console.log('[PushNotification] Token sent to backend successfully');
    } catch (error) {
      console.error('[PushNotification] Failed to send token to backend:', error);
    }
  },

  /**
   * Delete push token from backend (call on logout)
   */
  async deletePushTokenFromBackend(token: string): Promise<void> {
    try {
      await api.delete(API_ENDPOINTS.user.deletePushToken, {
        data: { token }
      });
      console.log('[PushNotification] Token deleted from backend');
      
      // Clear local storage
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    } catch (error) {
      console.error('[PushNotification] Failed to delete token from backend:', error);
    }
  },

  /**
   * Get stored push token
   */
  async getStoredPushToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Add listener for incoming notifications (when app is in foreground)
   */
  addNotificationListener(callback: (notification: Notifications.Notification) => void): () => void {
    const subscription = Notifications.addNotificationReceivedListener(callback);
    return () => subscription.remove();
  },

  /**
   * Add listener for notification interactions (when user taps on notification)
   */
  addNotificationResponseListener(callback: (response: Notifications.NotificationResponse) => void): () => void {
    const subscription = Notifications.addNotificationResponseReceivedListener(callback);
    return () => subscription.remove();
  },

  /**
   * Handle navigation based on notification data
   */
  handleNotificationNavigation(data: any): void {
    console.log('[PushNotification] Handling navigation with data:', data);
    
    if (!data) return;

    // Handle follow notification
    if (data.type === 'follow' && data.followerSlug) {
      router.push({
        pathname: '/user-profile',
        params: { 
          userId: data.followerSlug,
          userName: data.followerName || 'User',
        }
      });
      return;
    }

    // Navigate based on screen field
    if (data.screen === 'player' && data.stationId) {
      router.push({
        pathname: '/player',
        params: { stationId: data.stationId }
      });
    } else if (data.screen === 'genre' && data.genreSlug) {
      router.push({
        pathname: '/genre-detail',
        params: { slug: data.genreSlug }
      });
    } else if (data.screen === 'user-profile' && (data.userId || data.userSlug)) {
      router.push({
        pathname: '/user-profile',
        params: { userId: data.userId || data.userSlug }
      });
    } else if (data.screen === 'notifications') {
      router.push('/notifications');
    } else if (data.url) {
      router.push(data.url);
    }
  },

  /**
   * Check if notifications are enabled
   */
  async isNotificationsEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
      return enabled === 'true';
    } catch {
      return false;
    }
  },

  /**
   * Set notifications enabled/disabled
   */
  async setNotificationsEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false');
    } catch (error) {
      console.error('[PushNotification] Failed to set notifications enabled:', error);
    }
  },
};

export default pushNotificationService;

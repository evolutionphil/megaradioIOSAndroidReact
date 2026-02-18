import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import api from './api';

const PUSH_TOKEN_KEY = '@megaradio_push_token';
const NOTIFICATIONS_ENABLED_KEY = '@megaradio_notifications_enabled';

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationService {
  registerForPushNotifications: () => Promise<string | null>;
  sendPushTokenToBackend: (token: string, userId?: string) => Promise<void>;
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
      // Get project ID from Expo constants (automatically set by EAS Build)
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

        // Create channel for favorites
        await Notifications.setNotificationChannelAsync('favorites', {
          name: 'Favorites',
          description: 'Updates about your favorite stations',
          importance: Notifications.AndroidImportance.HIGH,
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
   */
  async sendPushTokenToBackend(token: string, userId?: string): Promise<void> {
    try {
      await api.post('https://themegaradio.com/api/user/push-token', {
        token,
        userId,
        platform: Platform.OS,
        deviceName: Device.deviceName,
      });
      console.log('[PushNotification] Token sent to backend');
    } catch (error) {
      console.error('[PushNotification] Failed to send token to backend:', error);
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
};

export default pushNotificationService;

/**
 * =====================================================
 * BACKEND API ENDPOINT GEREKSİNİMİ
 * =====================================================
 * 
 * POST /api/user/push-token
 * 
 * Request Body:
 * {
 *   "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
 *   "userId": "user_id_here",  // optional, null for guests
 *   "platform": "ios" | "android",
 *   "deviceName": "iPhone 15 Pro"
 * }
 * 
 * Response:
 * { "success": true }
 * 
 * =====================================================
 * NOTIFICATION GÖNDERME (Backend'den)
 * =====================================================
 * 
 * POST https://exp.host/--/api/v2/push/send
 * 
 * Headers:
 * {
 *   "Accept": "application/json",
 *   "Content-Type": "application/json"
 * }
 * 
 * Body:
 * {
 *   "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
 *   "sound": "default",
 *   "title": "MegaRadio",
 *   "body": "Power FM şu an canlı yayında!",
 *   "data": { 
 *     "stationId": "123",
 *     "screen": "player" 
 *   },
 *   "channelId": "radio"  // Android only
 * }
 * 
 * Birden fazla cihaza göndermek için:
 * {
 *   "to": ["token1", "token2", "token3"],
 *   ...
 * }
 */

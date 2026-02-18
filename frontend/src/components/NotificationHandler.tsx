// NotificationHandler - Manages push notification registration and handling
// Must be used at the top level of the app to catch all notifications
// NOTE: This component only works on native platforms (iOS/Android), not web

import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';

// Only import notification modules on native platforms
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

export const NotificationHandler: React.FC = () => {
  const hasRegistered = useRef(false);
  const { isAuthenticated, user } = useAuthStore();
  
  // Register for push notifications (native only)
  useEffect(() => {
    // Skip entirely on web
    if (!isNative) {
      console.log('[NotificationHandler] Skipping - not a native platform');
      return;
    }
    
    const registerForNotifications = async () => {
      // Only register once per app session
      if (hasRegistered.current) return;
      
      try {
        // Dynamically import the service only on native
        const pushNotificationService = (await import('../services/pushNotificationService')).default;
        
        console.log('[NotificationHandler] Registering for push notifications...');
        
        // Wait for app to fully initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Register and get token
        const token = await pushNotificationService.registerForPushNotifications();
        
        if (token) {
          console.log('[NotificationHandler] Got push token:', token.substring(0, 30) + '...');
          hasRegistered.current = true;
          
          // Send token to backend (with user ID if authenticated)
          await pushNotificationService.sendPushTokenToBackend(
            token,
            isAuthenticated && user?._id ? user._id : undefined
          );
        }
      } catch (error) {
        console.error('[NotificationHandler] Failed to register:', error);
      }
    };
    
    registerForNotifications();
  }, [isAuthenticated, user?._id]);
  
  // Re-send token when user logs in (native only)
  useEffect(() => {
    if (!isNative) return;
    
    const updateTokenWithUser = async () => {
      if (!isAuthenticated || !user?._id) return;
      
      try {
        const pushNotificationService = (await import('../services/pushNotificationService')).default;
        const storedToken = await pushNotificationService.getStoredPushToken();
        
        if (storedToken) {
          console.log('[NotificationHandler] User logged in, updating token with user ID');
          await pushNotificationService.sendPushTokenToBackend(storedToken, user._id);
        }
      } catch (error) {
        console.error('[NotificationHandler] Failed to update token:', error);
      }
    };
    
    updateTokenWithUser();
  }, [isAuthenticated, user?._id]);
  
  // Set up notification listeners (native only)
  useEffect(() => {
    if (!isNative) {
      return;
    }
    
    let foregroundSubscription: (() => void) | null = null;
    let responseSubscription: (() => void) | null = null;
    
    const setupListeners = async () => {
      try {
        const pushNotificationService = (await import('../services/pushNotificationService')).default;
        const Notifications = await import('expo-notifications');
        
        console.log('[NotificationHandler] Setting up notification listeners...');
        
        // Listener for when notification is received while app is in foreground
        foregroundSubscription = pushNotificationService.addNotificationListener(
          (notification: any) => {
            console.log('[NotificationHandler] Received notification in foreground');
            const title = notification.request.content.title;
            const body = notification.request.content.body;
            console.log('[NotificationHandler] Notification content:', { title, body });
          }
        );
        
        // Listener for when user taps on a notification
        responseSubscription = pushNotificationService.addNotificationResponseListener(
          (response: any) => {
            console.log('[NotificationHandler] User tapped notification');
            const data = response.notification.request.content.data;
            if (data) {
              pushNotificationService.handleNotificationNavigation(data);
            }
          }
        );
        
        // Handle notification that opened the app (cold start)
        try {
          const lastNotificationResponse = await Notifications.getLastNotificationResponseAsync();
          
          if (lastNotificationResponse) {
            console.log('[NotificationHandler] App opened from notification');
            const data = lastNotificationResponse.notification.request.content.data;
            
            setTimeout(() => {
              if (data) {
                pushNotificationService.handleNotificationNavigation(data);
              }
            }, 1000);
          }
        } catch (e) {
          // Silently ignore - method not available
        }
        
      } catch (error) {
        console.error('[NotificationHandler] Failed to setup listeners:', error);
      }
    };
    
    setupListeners();
    
    // Cleanup
    return () => {
      console.log('[NotificationHandler] Cleaning up listeners');
      if (foregroundSubscription) foregroundSubscription();
      if (responseSubscription) responseSubscription();
    };
  }, []);
  
  // This component doesn't render anything
  return null;
};

export default NotificationHandler;

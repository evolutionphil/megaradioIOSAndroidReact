// NotificationHandler - Manages push notification registration and handling
// Must be used at the top level of the app to catch all notifications

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../store/authStore';
import pushNotificationService from '../services/pushNotificationService';

export const NotificationHandler: React.FC = () => {
  const hasRegistered = useRef(false);
  const { isAuthenticated, user } = useAuthStore();
  
  // Register for push notifications
  useEffect(() => {
    const registerForNotifications = async () => {
      // Only register once per app session
      if (hasRegistered.current) return;
      
      try {
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
  
  // Re-send token when user logs in
  useEffect(() => {
    const updateTokenWithUser = async () => {
      if (!isAuthenticated || !user?._id) return;
      
      const storedToken = await pushNotificationService.getStoredPushToken();
      if (storedToken) {
        console.log('[NotificationHandler] User logged in, updating token with user ID');
        await pushNotificationService.sendPushTokenToBackend(storedToken, user._id);
      }
    };
    
    updateTokenWithUser();
  }, [isAuthenticated, user?._id]);
  
  // Set up notification listeners
  useEffect(() => {
    console.log('[NotificationHandler] Setting up notification listeners...');
    
    // Listener for when notification is received while app is in foreground
    const foregroundSubscription = pushNotificationService.addNotificationListener(
      (notification) => {
        console.log('[NotificationHandler] Received notification in foreground:', notification);
        
        // You can show a custom in-app notification here if needed
        const title = notification.request.content.title;
        const body = notification.request.content.body;
        console.log('[NotificationHandler] Notification content:', { title, body });
      }
    );
    
    // Listener for when user taps on a notification
    const responseSubscription = pushNotificationService.addNotificationResponseListener(
      (response) => {
        console.log('[NotificationHandler] User tapped notification');
        
        // Get data from notification
        const data = response.notification.request.content.data;
        
        // Handle navigation
        if (data) {
          pushNotificationService.handleNotificationNavigation(data);
        }
      }
    );
    
    // Handle notification that opened the app (cold start)
    const checkInitialNotification = async () => {
      const lastNotificationResponse = await Notifications.getLastNotificationResponseAsync();
      
      if (lastNotificationResponse) {
        console.log('[NotificationHandler] App opened from notification');
        const data = lastNotificationResponse.notification.request.content.data;
        
        // Wait a bit for navigation to be ready
        setTimeout(() => {
          if (data) {
            pushNotificationService.handleNotificationNavigation(data);
          }
        }, 1000);
      }
    };
    
    checkInitialNotification();
    
    // Cleanup
    return () => {
      console.log('[NotificationHandler] Cleaning up listeners');
      foregroundSubscription();
      responseSubscription();
    };
  }, []);
  
  // This component doesn't render anything
  return null;
};

export default NotificationHandler;

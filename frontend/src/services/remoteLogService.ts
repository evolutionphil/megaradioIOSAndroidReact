// Remote Logging Service
// Sends logs to backend for debugging TestFlight/production issues

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_BASE_URL = 'https://themegaradio.com';
const LOG_ENDPOINT = `${API_BASE_URL}/api/logs/remote`;
const DEVICE_ID_KEY = '@megaradio_device_id';

// Generate or get device ID
const getDeviceId = async (): Promise<string> => {
  try {
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    return `${Platform.OS}_unknown_${Date.now()}`;
  }
};

// Log queue for batching
let logQueue: Array<{
  level: string;
  message: string;
  timestamp: string;
  data?: any;
}> = [];

let isSending = false;
let deviceId: string | null = null;

// Initialize device ID
getDeviceId().then(id => {
  deviceId = id;
});

// Send logs to backend
const sendLogs = async () => {
  if (isSending || logQueue.length === 0) return;
  
  isSending = true;
  const logsToSend = [...logQueue];
  logQueue = [];
  
  try {
    const response = await fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw',
      },
      body: JSON.stringify({
        logs: logsToSend,
        deviceId: deviceId || 'unknown',
        appVersion: Constants.expoConfig?.version || '1.0.0',
        buildNumber: Constants.expoConfig?.ios?.buildNumber || '1',
        platform: Platform.OS,
      }),
    });
    
    if (!response.ok) {
      // If endpoint doesn't exist yet, just log locally
      console.log('[RemoteLog] Endpoint not ready, logs:', logsToSend.length);
    }
  } catch (error) {
    // Silently fail - don't break app if logging fails
    console.log('[RemoteLog] Failed to send:', error);
    // Re-add failed logs to queue (max 50)
    logQueue = [...logsToSend.slice(-25), ...logQueue.slice(0, 25)];
  } finally {
    isSending = false;
  }
};

// Debounced send (every 5 seconds max)
let sendTimeout: NodeJS.Timeout | null = null;
const scheduleSend = () => {
  if (sendTimeout) return;
  sendTimeout = setTimeout(() => {
    sendTimeout = null;
    sendLogs();
  }, 5000);
};

// Main logging function
const log = (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
  const logEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    data,
  };
  
  // Always log to console
  const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  consoleMethod(`[${level.toUpperCase()}] ${message}`, data || '');
  
  // Add to queue for remote sending
  logQueue.push(logEntry);
  
  // Keep queue size manageable
  if (logQueue.length > 100) {
    logQueue = logQueue.slice(-50);
  }
  
  // Schedule send
  scheduleSend();
  
  // Send immediately for errors
  if (level === 'error') {
    sendLogs();
  }
};

// Export logging functions
export const RemoteLog = {
  info: (message: string, data?: any) => log('info', message, data),
  warn: (message: string, data?: any) => log('warn', message, data),
  error: (message: string, data?: any) => log('error', message, data),
  
  // Force send all pending logs
  flush: () => sendLogs(),
  
  // Log app lifecycle events
  appStart: () => log('info', 'APP_START', { 
    platform: Platform.OS,
    version: Constants.expoConfig?.version,
  }),
  
  appReady: () => log('info', 'APP_READY'),
  
  navigationReady: () => log('info', 'NAVIGATION_READY'),
  
  screenView: (screenName: string) => log('info', 'SCREEN_VIEW', { screen: screenName }),
  
  // Log crashes/errors
  crash: (error: Error, componentStack?: string) => log('error', 'APP_CRASH', {
    message: error.message,
    stack: error.stack,
    componentStack,
  }),
};

export default RemoteLog;

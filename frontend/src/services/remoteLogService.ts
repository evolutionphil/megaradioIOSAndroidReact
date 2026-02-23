// Remote Logging Service - Safe version
// Sends logs to backend for debugging TestFlight/production issues

import { Platform } from 'react-native';

const API_BASE_URL = 'https://themegaradio.com';
const LOG_ENDPOINT = `${API_BASE_URL}/api/logs/remote`;
const API_KEY = 'mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw';

// Simple device ID based on timestamp
const deviceId = `${Platform.OS}_${Date.now()}`;

// Send a single log immediately
const sendLog = async (level: string, message: string, data?: any) => {
  try {
    await fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        logs: [{
          level,
          message,
          timestamp: new Date().toISOString(),
          data,
        }],
        deviceId,
        appVersion: '1.0.18',
        buildNumber: '1',
        platform: Platform.OS,
      }),
    });
  } catch (e) {
    // Silently fail - don't break app
    console.log('[RemoteLog] Failed:', e);
  }
};

export const RemoteLog = {
  info: (msg: string, data?: any) => sendLog('info', msg, data),
  error: (msg: string, data?: any) => sendLog('error', msg, data),
  crash: (error: Error, stack?: string) => sendLog('error', 'APP_CRASH', {
    message: error.message,
    stack: error.stack,
    componentStack: stack,
  }),
};

export default RemoteLog;

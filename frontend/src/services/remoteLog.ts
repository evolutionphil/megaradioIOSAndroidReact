// Remote Logging Service - Minimal safe version
import { Platform } from 'react-native';

const LOG_ENDPOINT = 'https://themegaradio.com/api/logs/remote';
const API_KEY = 'mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw';
const deviceId = `${Platform.OS}_${Date.now()}`;

export const sendLog = (message: string, data?: any) => {
  // Fire and forget - don't await, don't block
  fetch(LOG_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      logs: [{ level: 'info', message, timestamp: new Date().toISOString(), data }],
      deviceId,
      appVersion: '1.0.18',
      buildNumber: '1',
      platform: Platform.OS,
    }),
  }).catch(() => {}); // Silent fail
};

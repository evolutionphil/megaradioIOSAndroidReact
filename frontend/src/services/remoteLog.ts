// Remote Logging Service - Minimal safe version
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';

const LOG_ENDPOINT = 'https://themegaradio.com/api/logs/remote';
const API_KEY = 'mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw';
const deviceId = `${Platform.OS}_${Date.now()}`;

// Get version info dynamically
const getAppVersion = () => {
  return Application.nativeApplicationVersion || 
         Constants.expoConfig?.version || 
         '1.0.26';
};

const getBuildNumber = () => {
  return Application.nativeBuildVersion || 
         Constants.expoConfig?.ios?.buildNumber ||
         Constants.expoConfig?.android?.versionCode?.toString() ||
         '25';
};

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
      appVersion: getAppVersion(),
      buildNumber: getBuildNumber(),
      platform: Platform.OS,
    }),
  }).catch(() => {}); // Silent fail
};

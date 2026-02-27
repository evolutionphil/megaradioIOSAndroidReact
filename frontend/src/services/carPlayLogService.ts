// CarPlay Remote Logging Service
// Sends detailed CarPlay debug logs to backend for remote debugging

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';

const LOG_ENDPOINT = 'https://themegaradio.com/api/logs/remote';
const API_KEY = 'mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw';

interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug' | 'fatal';
  message: string;
  timestamp: string;
  data: Record<string, any>;
}

interface LogBuffer {
  logs: LogEntry[];
  deviceId: string;
  platform: string;
  appVersion: string;
  buildNumber: string;
}

// Buffer to collect logs before sending
const logBuffer: LogBuffer = {
  logs: [],
  deviceId: '',
  platform: Platform.OS,
  appVersion: '',
  buildNumber: '',
};

// Initialize device info
const initDeviceInfo = async () => {
  try {
    // Get unique device identifier
    const deviceUUID = Device.osBuildId || Device.modelId || `${Date.now()}`;
    logBuffer.deviceId = `${Platform.OS}_${deviceUUID}`;
    logBuffer.platform = Platform.OS;
    logBuffer.appVersion = Application.nativeApplicationVersion || '1.0.0';
    logBuffer.buildNumber = Application.nativeBuildVersion || '1';
    
    console.log('[CarPlayLogger] Device info initialized:', {
      deviceId: logBuffer.deviceId,
      platform: logBuffer.platform,
      appVersion: logBuffer.appVersion,
      buildNumber: logBuffer.buildNumber,
    });
  } catch (e) {
    logBuffer.deviceId = `${Platform.OS}_${Date.now()}`;
    logBuffer.platform = Platform.OS;
    logBuffer.appVersion = '1.0.26';
    logBuffer.buildNumber = '9';
    console.warn('[CarPlayLogger] Error initializing device info:', e);
  }
};

// Initialize on import
initDeviceInfo();

// Flush interval
let flushInterval: ReturnType<typeof setInterval> | null = null;
let isStarted = false;

const startFlushInterval = () => {
  if (flushInterval) return;
  
  flushInterval = setInterval(() => {
    if (logBuffer.logs.length > 0) {
      flushLogs();
    }
  }, 3000); // Her 3 saniyede bir gönder
};

const stopFlushInterval = () => {
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
  }
};

// Send logs to backend - EXACT FORMAT per API docs
const flushLogs = async () => {
  if (logBuffer.logs.length === 0) return;
  
  const logsToSend = [...logBuffer.logs].slice(0, 100); // Max 100 logs per request
  logBuffer.logs = logBuffer.logs.slice(100); // Keep remaining
  
  // Build request body per API documentation
  const requestBody = {
    deviceId: logBuffer.deviceId,
    platform: logBuffer.platform,
    appVersion: logBuffer.appVersion,
    buildNumber: logBuffer.buildNumber,
    logs: logsToSend.map(log => ({
      level: log.level,
      message: log.message.substring(0, 500), // Max 500 chars
      timestamp: log.timestamp,
      data: log.data || {},
    })),
  };
  
  console.log('[CarPlayLogger] Sending', logsToSend.length, 'logs to server...');
  
  try {
    const response = await fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify(requestBody),
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('[CarPlayLogger] Logs sent successfully:', result);
    } else {
      // Put logs back if send failed
      console.warn('[CarPlayLogger] Failed to send logs:', response.status);
      logBuffer.logs = [...logsToSend, ...logBuffer.logs].slice(-100);
    }
  } catch (error) {
    // Put logs back if send failed
    console.warn('[CarPlayLogger] Error sending logs:', error);
    logBuffer.logs = [...logsToSend, ...logBuffer.logs].slice(-100);
  }
};
        appVersion: logBuffer.appVersion,
        buildNumber: logBuffer.buildNumber,
        platform: logBuffer.platform,
        source: 'carplay',
      }),
    });
    
    if (!response.ok) {
      // Put logs back if send failed
      logBuffer.logs = [...logsToSend, ...logBuffer.logs].slice(-100); // Max 100 log tut
    }
  } catch (error) {
    // Put logs back if send failed
    logBuffer.logs = [...logsToSend, ...logBuffer.logs].slice(-100);
  }
};

// Add log to buffer
const addLog = (
  level: LogEntry['level'], 
  message: string, 
  data?: Record<string, any>,
  category?: string
) => {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    data,
    category: category || 'carplay',
  };
  
  logBuffer.logs.push(entry);
  
  // Also log locally for Xcode console
  const prefix = `[CarPlay][${level.toUpperCase()}]`;
  if (level === 'error') {
    console.error(prefix, message, data || '');
  } else if (level === 'warn') {
    console.warn(prefix, message, data || '');
  } else {
    console.log(prefix, message, data || '');
  }
  
  // Immediately flush if error or buffer is large
  if (level === 'error' || logBuffer.logs.length >= 5) {
    flushLogs();
  }
};

// Public API
export const CarPlayLogger = {
  // Start collecting and sending logs
  start: () => {
    if (isStarted) return;
    isStarted = true;
    initDeviceInfo();
    addLog('info', '🚀 CarPlay Logger STARTED', {
      deviceId: logBuffer.deviceId,
      deviceModel: logBuffer.deviceModel,
      osVersion: logBuffer.osVersion,
      appVersion: logBuffer.appVersion,
    }, 'system');
    startFlushInterval();
  },
  
  // Stop collecting logs
  stop: () => {
    if (!isStarted) return;
    addLog('info', '🛑 CarPlay Logger STOPPED', undefined, 'system');
    flushLogs();
    stopFlushInterval();
    isStarted = false;
  },
  
  // Log methods
  info: (message: string, data?: Record<string, any>) => addLog('info', message, data),
  warn: (message: string, data?: Record<string, any>) => addLog('warn', message, data),
  error: (message: string, data?: Record<string, any>) => addLog('error', message, data),
  debug: (message: string, data?: Record<string, any>) => addLog('debug', message, data),
  
  // ============ CarPlay Connection Events ============
  
  connected: (details?: Record<string, any>) => {
    addLog('info', '🚗 CarPlay CONNECTED', {
      ...details,
      connectionTime: new Date().toISOString(),
    }, 'connection');
  },
  
  disconnected: (details?: Record<string, any>) => {
    addLog('info', '🚗 CarPlay DISCONNECTED', {
      ...details,
      disconnectionTime: new Date().toISOString(),
    }, 'connection');
  },
  
  alreadyConnected: () => {
    addLog('info', '🚗 CarPlay ALREADY CONNECTED (race condition handled)', undefined, 'connection');
  },
  
  // ============ Template Events ============
  
  templateCreating: (templateType: string) => {
    addLog('debug', `📋 Creating template: ${templateType}`, { templateType }, 'template');
  },
  
  templateCreated: (templateType: string, details?: Record<string, any>) => {
    addLog('info', `✅ Template created: ${templateType}`, { templateType, ...details }, 'template');
  },
  
  templateError: (templateType: string, error: any) => {
    addLog('error', `❌ Template ERROR: ${templateType}`, { 
      templateType,
      error: error?.message || String(error),
      stack: error?.stack?.substring(0, 500),
    }, 'template');
  },
  
  templateFailed: (templateType: string, reason: string) => {
    addLog('warn', `⚠️ Template failed: ${templateType}`, { templateType, reason }, 'template');
  },
  
  rootTemplateSet: (tabCount: number) => {
    addLog('info', `🎯 Root template SET`, { tabCount, tabs: tabCount }, 'template');
  },
  
  fallbackTemplateShown: (reason: string) => {
    addLog('warn', `⚠️ Fallback template shown`, { reason }, 'template');
  },
  
  tabSelected: (index: number, tabName?: string) => {
    addLog('info', `👆 Tab selected: ${tabName || index}`, { index, tabName }, 'template');
  },
  
  // ============ Data Loading Events ============
  
  dataLoading: (dataType: string) => {
    addLog('debug', `📥 Loading data: ${dataType}`, { dataType }, 'data');
  },
  
  dataLoaded: (dataType: string, count: number) => {
    addLog('info', `📦 Data loaded: ${dataType}`, { dataType, itemCount: count }, 'data');
  },
  
  dataError: (dataType: string, error: any) => {
    addLog('error', `❌ Data load ERROR: ${dataType}`, {
      dataType,
      error: error?.message || String(error),
    }, 'data');
  },
  
  // ============ Station Events ============
  
  stationSelected: (stationName: string, stationId: string) => {
    addLog('info', `🎵 Station SELECTED: ${stationName}`, { 
      stationName, 
      stationId,
      selectTime: new Date().toISOString(),
    }, 'playback');
  },
  
  stationLoading: (stationName: string) => {
    addLog('debug', `⏳ Station loading: ${stationName}`, { stationName }, 'playback');
  },
  
  // ============ Playback Events ============
  
  playbackStarted: (stationName: string, streamUrl?: string) => {
    addLog('info', `▶️ Playback STARTED: ${stationName}`, { 
      stationName,
      streamUrl: streamUrl?.substring(0, 100),
    }, 'playback');
  },
  
  playbackStopped: (stationName?: string) => {
    addLog('info', `⏹️ Playback STOPPED`, { stationName }, 'playback');
  },
  
  playbackError: (error: any, stationName?: string) => {
    addLog('error', `❌ Playback ERROR`, {
      stationName,
      error: error?.message || String(error),
      code: error?.code,
    }, 'playback');
  },
  
  nowPlayingUpdated: (stationName: string, songTitle?: string, artistName?: string) => {
    addLog('debug', `🎶 Now playing updated`, { stationName, songTitle, artistName }, 'playback');
  },
  
  // ============ Module Events ============
  
  moduleLoaded: (moduleName: string, available: boolean) => {
    addLog('info', `📦 Module: ${moduleName}`, { moduleName, available }, 'system');
  },
  
  moduleError: (moduleName: string, error: any) => {
    addLog('error', `❌ Module ERROR: ${moduleName}`, {
      moduleName,
      error: error?.message || String(error),
    }, 'system');
  },
  
  // ============ Service Events ============
  
  serviceInitializing: () => {
    addLog('info', `🔧 CarPlay service INITIALIZING`, {
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
    }, 'system');
  },
  
  serviceInitialized: () => {
    addLog('info', `✅ CarPlay service INITIALIZED`, undefined, 'system');
  },
  
  serviceDisconnecting: () => {
    addLog('info', `🔌 CarPlay service DISCONNECTING`, undefined, 'system');
  },
  
  // Force send all buffered logs
  flush: flushLogs,
  
  // Get current buffer status (for debugging)
  getStatus: () => ({
    isStarted,
    bufferedLogs: logBuffer.logs.length,
    deviceId: logBuffer.deviceId,
  }),
};

export default CarPlayLogger;

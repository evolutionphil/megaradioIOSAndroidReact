// CarPlay Remote Logging Service
// Sends detailed CarPlay debug logs to backend for remote debugging
// API Docs: https://themegaradio.com/api/logs/remote

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import Constants from 'expo-constants';

const LOG_ENDPOINT = 'https://themegaradio.com/api/logs/remote';
const API_KEY = 'mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw';

// Log entry format per API documentation
interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug' | 'fatal';
  message: string;
  timestamp: string;
  data: Record<string, any>;
}

// Buffer structure
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

// Initialize device info - called when logger starts, not at module load
const initDeviceInfo = () => {
  try {
    const deviceUUID = Device.osBuildId || Device.modelId || `${Date.now()}`;
    logBuffer.deviceId = `${Platform.OS}_${deviceUUID}`;
    logBuffer.platform = Platform.OS;
    
    // Try multiple sources for version info
    // Priority: Application native > Constants expoConfig > fallback
    logBuffer.appVersion = 
      Application.nativeApplicationVersion || 
      Constants.expoConfig?.version ||
      '1.0.0';
    
    logBuffer.buildNumber = 
      Application.nativeBuildVersion || 
      Constants.expoConfig?.ios?.buildNumber ||
      Constants.expoConfig?.android?.versionCode?.toString() ||
      '1';
    
    console.log('[CarPlayLogger] Device info initialized:', {
      appVersion: logBuffer.appVersion,
      buildNumber: logBuffer.buildNumber,
      deviceId: logBuffer.deviceId,
      nativeApplicationVersion: Application.nativeApplicationVersion,
      nativeBuildVersion: Application.nativeBuildVersion,
      expoConfigVersion: Constants.expoConfig?.version,
    });
  } catch (e) {
    console.error('[CarPlayLogger] Error initializing device info:', e);
    logBuffer.deviceId = `${Platform.OS}_${Date.now()}`;
    logBuffer.platform = Platform.OS;
    // Use expo config as fallback
    logBuffer.appVersion = Constants.expoConfig?.version || '1.0.26';
    logBuffer.buildNumber = Constants.expoConfig?.ios?.buildNumber || '1';
  }
};

// NOTE: Do NOT call initDeviceInfo() at module load time!
// It should be called in CarPlayLogger.start() when native modules are ready

// Flush interval
let flushInterval: ReturnType<typeof setInterval> | null = null;
let isStarted = false;

const startFlushInterval = () => {
  if (flushInterval) return;
  flushInterval = setInterval(() => {
    if (logBuffer.logs.length > 0) {
      flushLogs();
    }
  }, 3000);
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
  
  const logsToSend = [...logBuffer.logs].slice(0, 100);
  logBuffer.logs = logBuffer.logs.slice(100);
  
  const requestBody = {
    deviceId: logBuffer.deviceId,
    platform: logBuffer.platform,
    appVersion: logBuffer.appVersion,
    buildNumber: logBuffer.buildNumber,
    logs: logsToSend.map(log => ({
      level: log.level,
      message: log.message.substring(0, 500),
      timestamp: log.timestamp,
      data: log.data || {},
    })),
  };
  
  try {
    const response = await fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      logBuffer.logs = [...logsToSend, ...logBuffer.logs].slice(-100);
    }
  } catch (error) {
    logBuffer.logs = [...logsToSend, ...logBuffer.logs].slice(-100);
  }
};

// Add log to buffer
const addLog = (
  level: LogEntry['level'], 
  message: string, 
  data?: Record<string, any>
) => {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    data: data || {},
  };
  
  logBuffer.logs.push(entry);
  
  // Also log locally for Xcode/Metro console
  const prefix = `[CarPlay][${level.toUpperCase()}]`;
  if (level === 'error' || level === 'fatal') {
    console.error(prefix, message, data || '');
  } else if (level === 'warn') {
    console.warn(prefix, message, data || '');
  } else {
    console.log(prefix, message, data || '');
  }
  
  // Immediately flush if error or buffer is getting large
  if (level === 'error' || level === 'fatal' || logBuffer.logs.length >= 10) {
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
    addLog('info', 'CarPlay Logger STARTED', {
      deviceId: logBuffer.deviceId,
      platform: logBuffer.platform,
      appVersion: logBuffer.appVersion,
      buildNumber: logBuffer.buildNumber,
    });
    startFlushInterval();
  },
  
  // Stop collecting logs
  stop: () => {
    if (!isStarted) return;
    addLog('info', 'CarPlay Logger STOPPED');
    flushLogs();
    stopFlushInterval();
    isStarted = false;
  },
  
  // Basic log methods
  info: (message: string, data?: Record<string, any>) => addLog('info', message, data),
  warn: (message: string, data?: Record<string, any>) => addLog('warn', message, data),
  error: (message: string, data?: Record<string, any>) => addLog('error', message, data),
  debug: (message: string, data?: Record<string, any>) => addLog('debug', message, data),
  fatal: (message: string, data?: Record<string, any>) => addLog('fatal', message, data),
  
  // ============ CarPlay Connection Events ============
  // Messages with "CarPlay" are auto-tagged as isCarPlayLog: true by backend
  
  connected: (details?: Record<string, any>) => {
    addLog('info', 'CarPlay CONNECTED', {
      ...details,
      connectionTime: new Date().toISOString(),
    });
  },
  
  disconnected: (details?: Record<string, any>) => {
    addLog('info', 'CarPlay DISCONNECTED', {
      ...details,
      disconnectionTime: new Date().toISOString(),
    });
  },
  
  alreadyConnected: () => {
    addLog('info', 'CarPlay ALREADY CONNECTED (race condition handled)');
  },
  
  // ============ Template Events ============
  // Messages with "Template" are auto-tagged as isCarPlayLog: true by backend
  
  templateCreating: (templateType: string) => {
    addLog('debug', `Template creating: ${templateType}`, { templateType });
  },
  
  templateCreated: (templateType: string, details?: Record<string, any>) => {
    addLog('info', `Template created: ${templateType}`, { templateType, ...details });
  },
  
  templateError: (templateType: string, error: any) => {
    addLog('error', `Template ERROR: ${templateType}`, { 
      templateType,
      error: error?.message || String(error),
      stack: error?.stack?.substring(0, 300),
    });
  },
  
  templateFailed: (templateType: string, reason: string) => {
    addLog('warn', `Template failed: ${templateType}`, { templateType, reason });
  },
  
  rootTemplateSet: (tabCount: number) => {
    addLog('info', `Template ROOT SET`, { tabCount });
  },
  
  fallbackTemplateShown: (reason: string) => {
    addLog('warn', `Template FALLBACK shown`, { reason });
  },
  
  tabSelected: (index: number, tabName?: string) => {
    addLog('info', `CarPlay Tab selected: ${tabName || index}`, { index, tabName });
  },
  
  // ============ Data Loading Events ============
  
  dataLoading: (dataType: string) => {
    addLog('debug', `CarPlay Data loading: ${dataType}`, { dataType });
  },
  
  dataLoaded: (dataType: string, count: number) => {
    addLog('info', `CarPlay Data loaded: ${dataType}`, { dataType, itemCount: count });
  },
  
  dataError: (dataType: string, error: any) => {
    addLog('error', `CarPlay Data ERROR: ${dataType}`, {
      dataType,
      error: error?.message || String(error),
    });
  },
  
  // ============ Station Events ============
  
  stationSelected: (stationName: string, stationId: string) => {
    addLog('info', `CarPlay Station selected: ${stationName}`, { 
      stationName, 
      stationId,
    });
  },
  
  // ============ Playback Events ============
  
  playbackStarted: (stationName: string, streamUrl?: string) => {
    addLog('info', `CarPlay Playback started: ${stationName}`, { 
      stationName,
      streamUrl: streamUrl?.substring(0, 100),
    });
  },
  
  playbackStopped: (stationName?: string) => {
    addLog('info', `CarPlay Playback stopped`, { stationName });
  },
  
  playbackError: (error: any, stationName?: string) => {
    addLog('error', `CarPlay Playback ERROR`, {
      stationName,
      error: error?.message || String(error),
      code: error?.code,
    });
  },
  
  nowPlayingUpdated: (stationName: string, songTitle?: string, artistName?: string) => {
    addLog('debug', `CarPlay Now playing updated`, { stationName, songTitle, artistName });
  },
  
  // ============ Module Events ============
  
  moduleLoaded: (moduleName: string, available: boolean) => {
    addLog('info', `CarPlay Module: ${moduleName}`, { moduleName, available });
  },
  
  moduleError: (moduleName: string, error: any) => {
    addLog('error', `CarPlay Module ERROR: ${moduleName}`, {
      moduleName,
      error: error?.message || String(error),
    });
  },
  
  // ============ Service Events ============
  
  serviceInitializing: () => {
    addLog('info', `CarPlay Service INITIALIZING`, {
      platform: Platform.OS,
    });
  },
  
  serviceInitialized: () => {
    addLog('info', `CarPlay Service INITIALIZED`);
  },
  
  serviceDisconnecting: () => {
    addLog('info', `CarPlay Service DISCONNECTING`);
  },
  
  // Force send all buffered logs
  flush: flushLogs,
  
  // Get status for debugging
  getStatus: () => ({
    isStarted,
    bufferedLogs: logBuffer.logs.length,
    deviceId: logBuffer.deviceId,
  }),
};

export default CarPlayLogger;

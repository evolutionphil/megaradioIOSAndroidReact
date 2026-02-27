// CarPlay Remote Logging Service
// Sends CarPlay debug logs to backend for remote debugging

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://themegaradio.com';

interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: Record<string, any>;
  timestamp?: string;
}

interface LogBuffer {
  logs: LogEntry[];
  deviceId: string | null;
  deviceModel: string | null;
  osVersion: string | null;
  appVersion: string | null;
}

// Buffer to collect logs before sending
const logBuffer: LogBuffer = {
  logs: [],
  deviceId: null,
  deviceModel: null,
  osVersion: null,
  appVersion: null,
};

// Initialize device info
const initDeviceInfo = async () => {
  try {
    logBuffer.deviceId = Device.osBuildId || Device.modelId || 'unknown';
    logBuffer.deviceModel = Device.modelName || 'unknown';
    logBuffer.osVersion = `${Platform.OS} ${Device.osVersion || 'unknown'}`;
    logBuffer.appVersion = Constants.expoConfig?.version || '1.0.0';
  } catch (e) {
    console.warn('[CarPlayLog] Failed to get device info:', e);
  }
};

// Initialize on import
initDeviceInfo();

// Flush interval (send logs every 5 seconds if there are any)
let flushInterval: NodeJS.Timeout | null = null;

const startFlushInterval = () => {
  if (flushInterval) return;
  
  flushInterval = setInterval(() => {
    if (logBuffer.logs.length > 0) {
      flushLogs();
    }
  }, 5000);
};

const stopFlushInterval = () => {
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
  }
};

// Send logs to backend
const flushLogs = async () => {
  if (logBuffer.logs.length === 0) return;
  
  const logsToSend = [...logBuffer.logs];
  logBuffer.logs = []; // Clear buffer immediately
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/carplay/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw',
      },
      body: JSON.stringify({
        device_id: logBuffer.deviceId,
        device_model: logBuffer.deviceModel,
        os_version: logBuffer.osVersion,
        app_version: logBuffer.appVersion,
        logs: logsToSend,
      }),
    });
    
    if (!response.ok) {
      // Put logs back if send failed
      logBuffer.logs = [...logsToSend, ...logBuffer.logs];
      console.warn('[CarPlayLog] Failed to send logs:', response.status);
    }
  } catch (error) {
    // Put logs back if send failed
    logBuffer.logs = [...logsToSend, ...logBuffer.logs];
    console.warn('[CarPlayLog] Error sending logs:', error);
  }
};

// Add log to buffer
const addLog = (level: LogEntry['level'], message: string, context?: Record<string, any>) => {
  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  };
  
  logBuffer.logs.push(entry);
  
  // Also log locally
  const prefix = `[CarPlay][${level.toUpperCase()}]`;
  if (level === 'error') {
    console.error(prefix, message, context || '');
  } else if (level === 'warn') {
    console.warn(prefix, message, context || '');
  } else {
    console.log(prefix, message, context || '');
  }
  
  // Immediately flush if error or buffer is large
  if (level === 'error' || logBuffer.logs.length >= 10) {
    flushLogs();
  }
};

// Public API
export const CarPlayLogger = {
  // Start collecting and sending logs
  start: () => {
    addLog('info', 'CarPlay logging started');
    startFlushInterval();
  },
  
  // Stop collecting logs
  stop: () => {
    addLog('info', 'CarPlay logging stopped');
    flushLogs(); // Send any remaining logs
    stopFlushInterval();
  },
  
  // Log methods
  info: (message: string, context?: Record<string, any>) => addLog('info', message, context),
  warn: (message: string, context?: Record<string, any>) => addLog('warn', message, context),
  error: (message: string, context?: Record<string, any>) => addLog('error', message, context),
  debug: (message: string, context?: Record<string, any>) => addLog('debug', message, context),
  
  // CarPlay specific events
  connected: (details?: Record<string, any>) => {
    addLog('info', '🚗 CarPlay CONNECTED', details);
  },
  
  disconnected: (details?: Record<string, any>) => {
    addLog('info', '🚗 CarPlay DISCONNECTED', details);
  },
  
  templateCreated: (templateType: string, details?: Record<string, any>) => {
    addLog('info', `📋 Template created: ${templateType}`, details);
  },
  
  templateError: (templateType: string, error: any) => {
    addLog('error', `❌ Template error: ${templateType}`, { 
      error: error?.message || String(error),
      stack: error?.stack,
    });
  },
  
  stationSelected: (stationName: string, stationId: string) => {
    addLog('info', `🎵 Station selected: ${stationName}`, { stationId });
  },
  
  playbackStarted: (stationName: string) => {
    addLog('info', `▶️ Playback started: ${stationName}`);
  },
  
  playbackError: (error: any) => {
    addLog('error', '⏹️ Playback error', {
      error: error?.message || String(error),
    });
  },
  
  // Force send all buffered logs
  flush: flushLogs,
};

export default CarPlayLogger;

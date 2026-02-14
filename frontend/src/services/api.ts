import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../constants/api';

// MegaRadio Internal API Key - unlimited, no rate limiting
const MEGARADIO_API_KEY = 'mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw';

// For web preview, we cannot use credentials due to CORS
// Native apps will handle cookies differently
const isWeb = Platform.OS === 'web';

// Create axios instance with API key and cookie support
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': MEGARADIO_API_KEY,
  },
  // Only use credentials on native platforms where CORS isn't an issue
  withCredentials: !isWeb,
});

// Helper to get auth token (lazy import to avoid circular dependency)
const getAuthToken = (): string | null => {
  try {
    // Dynamic import of authStore to avoid circular dependency
    const { useAuthStore } = require('../store/authStore');
    const token = useAuthStore.getState().token;
    console.log('[API] getAuthToken called, token exists:', !!token, token ? token.substring(0, 15) + '...' : 'null');
    return token;
  } catch (err) {
    console.log('[API] getAuthToken error:', err);
    return null;
  }
};

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Ensure API key is always present
    if (config.headers) {
      config.headers['X-API-Key'] = MEGARADIO_API_KEY;
      
      // Add mobile auth token if available and not already set
      const token = getAuthToken();
      if (token && !config.headers['Authorization']) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with retry for 429
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const config = error.config;
    // Retry on 429 (rate limit) - max 2 retries with delay
    if (error.response?.status === 429 && (!config._retryCount || config._retryCount < 2)) {
      config._retryCount = (config._retryCount || 0) + 1;
      const delay = config._retryCount * 1500; // 1.5s, 3s
      await new Promise(r => setTimeout(r, delay));
      return api(config);
    }
    // Handle 401 unauthorized globally
    if (error.response?.status === 401) {
      console.log('Unauthorized - session may have expired');
    }
    return Promise.reject(error);
  }
);

export default api;

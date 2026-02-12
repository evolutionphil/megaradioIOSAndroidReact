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

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Ensure API key is always present
    if (config.headers) {
      config.headers['X-API-Key'] = MEGARADIO_API_KEY;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 unauthorized globally
    if (error.response?.status === 401) {
      // Clear local auth state if needed
      console.log('Unauthorized - session may have expired');
    }
    return Promise.reject(error);
  }
);

export default api;

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../constants/api';

// For web preview, we cannot use credentials due to CORS
// Native apps will handle cookies differently
const isWeb = Platform.OS === 'web';

// Create axios instance with cookie support
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  // Only use credentials on native platforms where CORS isn't an issue
  withCredentials: !isWeb,
});

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add any request modifications here
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

import api from './api';
import { API_ENDPOINTS } from '../constants/api';
import { useAuthStore } from '../store/authStore';
import type { User, AuthResponse, AuthCheckResponse } from '../types';

const API_BASE = 'https://themegaradio.com';

// Extended response types for mobile
interface MobileLoginResponse {
  success: boolean;
  token: string;
  user: User;
  message?: string;
}

interface GoogleLoginParams {
  googleId: string;
  email: string;
  fullName: string;
  avatar?: string;
}

export const authService = {
  // ─── WEB AUTH (Session-based) ───

  // Sign up new user
  async signup(email: string, password: string, name: string): Promise<AuthResponse> {
    const response = await api.post(API_ENDPOINTS.auth.signup, {
      email,
      password,
      name,
    });
    return response.data;
  },

  // Login user (web session)
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post(API_ENDPOINTS.auth.login, {
      email,
      password,
    });
    return response.data;
  },

  // Logout user
  async logout(): Promise<{ message: string }> {
    const response = await api.post(API_ENDPOINTS.auth.logout);
    return response.data;
  },

  // Check authentication status
  async checkAuth(): Promise<AuthCheckResponse> {
    const response = await api.get(API_ENDPOINTS.auth.me);
    return response.data;
  },

  // Update user profile
  async updateProfile(data: { name?: string; isPublicProfile?: boolean }): Promise<{ user: User }> {
    const response = await api.put(API_ENDPOINTS.auth.profile, data);
    return response.data;
  },

  // Forgot password
  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await api.post(API_ENDPOINTS.auth.forgotPassword, { email });
    return response.data;
  },

  // Reset password
  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const response = await api.post(API_ENDPOINTS.auth.resetPassword, {
      token,
      password,
    });
    return response.data;
  },

  // ─── MOBILE AUTH (Token-based) ───

  /**
   * Mobile Login with Email/Password
   * POST /api/auth/mobile/login
   */
  async mobileLogin(email: string, password: string): Promise<MobileLoginResponse> {
    const { deviceInfo } = useAuthStore.getState();
    
    const response = await api.post(`${API_BASE}/api/auth/mobile/login`, {
      email,
      password,
      deviceType: deviceInfo.deviceType,
      deviceName: deviceInfo.deviceName,
    });
    
    return response.data;
  },

  /**
   * Mobile Login with Google
   * POST /api/auth/mobile/google
   */
  async mobileGoogleLogin(params: GoogleLoginParams): Promise<MobileLoginResponse> {
    const { deviceInfo } = useAuthStore.getState();
    
    const response = await api.post(`${API_BASE}/api/auth/mobile/google`, {
      ...params,
      deviceType: deviceInfo.deviceType,
    });
    
    return response.data;
  },

  /**
   * Check mobile auth status
   * GET /api/auth/mobile/me
   */
  async mobileCheckAuth(): Promise<{ authenticated: boolean; user?: User }> {
    const { token } = useAuthStore.getState();
    
    if (!token) {
      return { authenticated: false };
    }
    
    try {
      const response = await api.get(`${API_BASE}/api/auth/mobile/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return {
        authenticated: response.data.authenticated || false,
        user: response.data.user,
      };
    } catch (error) {
      return { authenticated: false };
    }
  },

  /**
   * Mobile logout (single device)
   * POST /api/auth/mobile/logout
   */
  async mobileLogout(): Promise<void> {
    const { token } = useAuthStore.getState();
    
    if (!token) return;
    
    try {
      await api.post(
        `${API_BASE}/api/auth/mobile/logout`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (error) {
      console.error('Mobile logout error:', error);
    }
  },

  /**
   * Mobile logout from all devices
   * POST /api/auth/mobile/logout-all
   */
  async mobileLogoutAll(): Promise<void> {
    const { token } = useAuthStore.getState();
    
    if (!token) return;
    
    try {
      await api.post(
        `${API_BASE}/api/auth/mobile/logout-all`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (error) {
      console.error('Mobile logout-all error:', error);
    }
  },

  /**
   * Mobile register
   * POST /api/auth/mobile/register (if supported)
   */
  async mobileRegister(
    email: string,
    password: string,
    fullName: string
  ): Promise<MobileLoginResponse> {
    const { deviceInfo } = useAuthStore.getState();
    
    const response = await api.post(`${API_BASE}/api/auth/mobile/register`, {
      email,
      password,
      fullName,
      deviceType: deviceInfo.deviceType,
      deviceName: deviceInfo.deviceName,
    });
    
    return response.data;
  },
};

export default authService;

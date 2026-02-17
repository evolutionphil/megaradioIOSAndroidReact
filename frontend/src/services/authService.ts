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
   * For native: POST /api/auth/mobile/login (returns token)
   * For web: POST /api/auth/login + response includes user data
   */
  async mobileLogin(email: string, password: string): Promise<MobileLoginResponse> {
    const { deviceInfo } = useAuthStore.getState();
    
    // Use mobile login endpoint for all platforms to get real JWT token
    // This works for both web and native since it returns a Bearer token
    // that can be used for API calls without CORS cookie issues
    // IMPORTANT: Always send deviceType as 'mobile' to get JWT token
    // The external API returns web_session_* tokens for 'tablet' which don't work with API calls
    const response = await fetch(`${API_BASE}/api/auth/mobile/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw',
      },
      body: JSON.stringify({
        email,
        password,
        deviceType: 'mobile', // Always 'mobile' to get JWT token (API returns web_session for 'tablet')
        deviceName: deviceInfo.deviceName || 'Web Browser',
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Login failed');
    }
    
    const data = await response.json();
    return {
      success: true,
      token: data.token,
      user: data.user,
      message: data.message,
    };
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
   * Uses web signup endpoint as mobile-specific register may not exist
   * POST /api/auth/signup then auto-login via mobile endpoint
   */
  async mobileRegister(
    email: string,
    password: string,
    fullName: string
  ): Promise<MobileLoginResponse> {
    const { deviceInfo } = useAuthStore.getState();
    
    // First, register using web signup endpoint
    await api.post(`${API_BASE}/api/auth/signup`, {
      email,
      password,
      name: fullName,
    });
    
    // Then login via mobile endpoint to get token
    const loginResponse = await api.post(`${API_BASE}/api/auth/mobile/login`, {
      email,
      password,
      deviceType: deviceInfo.deviceType,
      deviceName: deviceInfo.deviceName,
    });
    
    return loginResponse.data;
  },

  // ─── SOCIAL LOGIN (Mobile) ───

  /**
   * Google Sign-In
   * POST /api/auth/google
   */
  async googleSignIn(idToken: string): Promise<MobileLoginResponse> {
    const { deviceInfo } = useAuthStore.getState();
    
    console.log('[AuthService] Google Sign-In with token:', idToken.substring(0, 50) + '...');
    
    const response = await api.post(`${API_BASE}/api/auth/google`, {
      idToken,
      deviceType: deviceInfo.deviceType || 'mobile',
      deviceName: deviceInfo.deviceName || 'Mobile Device',
    });
    
    console.log('[AuthService] Google Sign-In response:', response.data);
    return response.data;
  },

  /**
   * Apple Sign-In
   * POST /api/auth/apple
   */
  async appleSignIn(
    identityToken: string,
    authorizationCode: string,
    fullName?: string,
    email?: string
  ): Promise<MobileLoginResponse> {
    const { deviceInfo } = useAuthStore.getState();
    
    console.log('[AuthService] Apple Sign-In');
    
    const response = await api.post(`${API_BASE}/api/auth/apple`, {
      identityToken,
      authorizationCode,
      fullName: fullName || undefined,
      email: email || undefined,
      deviceType: deviceInfo.deviceType || 'mobile',
      deviceName: deviceInfo.deviceName || 'Mobile Device',
    });
    
    console.log('[AuthService] Apple Sign-In response:', response.data);
    return response.data;
  },
};

export default authService;

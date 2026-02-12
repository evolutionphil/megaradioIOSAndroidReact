import api from './api';
import { API_ENDPOINTS } from '../constants/api';
import type { User, AuthResponse, AuthCheckResponse } from '../types';

export const authService = {
  // Sign up new user
  async signup(email: string, password: string, name: string): Promise<AuthResponse> {
    const response = await api.post(API_ENDPOINTS.auth.signup, {
      email,
      password,
      name,
    });
    return response.data;
  },

  // Login user
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
};

export default authService;

import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';
import api from './api';

const API_BASE = 'https://themegaradio.com';

// OAuth provider types
export type SocialProvider = 'google' | 'apple' | 'facebook';

// Social auth response type
interface SocialAuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
  };
  error?: string;
}

/**
 * Social Authentication Service
 * Uses web-based OAuth flow through expo-web-browser
 * Works on iOS, Android, and Web
 */
export const socialAuthService = {
  /**
   * Get the redirect URI for OAuth callbacks
   */
  getRedirectUri(): string {
    // Create redirect URI based on platform
    const scheme = 'megaradio';
    
    if (Platform.OS === 'web') {
      // Web: use current origin
      return typeof window !== 'undefined' 
        ? `${window.location.origin}/auth-callback`
        : 'https://themegaradio.com/auth-callback';
    }
    
    // Native: use deep link
    return Linking.createURL('auth-callback');
  },

  /**
   * Start OAuth flow for a provider
   * Opens a web browser for authentication
   */
  async startOAuth(provider: SocialProvider): Promise<SocialAuthResponse> {
    const { deviceInfo } = useAuthStore.getState();
    const redirectUri = this.getRedirectUri();
    
    // Construct OAuth URL with redirect
    const authUrl = `${API_BASE}/api/auth/${provider}?` + 
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `device_type=${deviceInfo.deviceType}&` +
      `platform=${Platform.OS}`;

    try {
      // Open browser for OAuth
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        redirectUri,
        {
          showInRecents: true,
          preferEphemeralSession: true, // Don't persist cookies
        }
      );

      if (result.type === 'success' && result.url) {
        // Parse the callback URL for token and user data
        return this.handleCallback(result.url);
      } else if (result.type === 'cancel') {
        return { success: false, error: 'Authentication cancelled' };
      } else {
        return { success: false, error: 'Authentication failed' };
      }
    } catch (error: any) {
      console.error(`${provider} OAuth error:`, error);
      return { 
        success: false, 
        error: error.message || 'OAuth authentication failed' 
      };
    }
  },

  /**
   * Handle OAuth callback URL
   * Extracts token and user data from redirect URL
   */
  handleCallback(url: string): SocialAuthResponse {
    try {
      const parsed = Linking.parse(url);
      const params = parsed.queryParams || {};
      
      // Check for error
      if (params.error) {
        return { 
          success: false, 
          error: params.error_description || params.error as string 
        };
      }
      
      // Extract token and user data
      const token = params.token as string;
      const userId = params.user_id as string;
      const email = params.email as string;
      const name = params.name as string;
      const avatar = params.avatar as string;
      
      if (token && userId) {
        return {
          success: true,
          token,
          user: {
            id: userId,
            email: email || '',
            name: name || '',
            avatar: avatar || undefined,
          },
        };
      }
      
      // If no token in URL, might need to exchange code
      const code = params.code as string;
      if (code) {
        // Token not directly in URL - need to exchange code
        return { 
          success: false, 
          error: 'OAuth code received - exchange required' 
        };
      }
      
      return { success: false, error: 'Invalid callback response' };
    } catch (error: any) {
      console.error('Callback parsing error:', error);
      return { success: false, error: 'Failed to parse callback' };
    }
  },

  /**
   * Google Sign-In
   */
  async signInWithGoogle(): Promise<SocialAuthResponse> {
    return this.startOAuth('google');
  },

  /**
   * Apple Sign-In
   */
  async signInWithApple(): Promise<SocialAuthResponse> {
    return this.startOAuth('apple');
  },

  /**
   * Facebook Sign-In
   */
  async signInWithFacebook(): Promise<SocialAuthResponse> {
    return this.startOAuth('facebook');
  },

  /**
   * Exchange authorization code for token
   * Some OAuth flows return a code instead of direct token
   */
  async exchangeCodeForToken(
    provider: SocialProvider, 
    code: string
  ): Promise<SocialAuthResponse> {
    const { deviceInfo } = useAuthStore.getState();
    
    try {
      const response = await api.post(`${API_BASE}/api/auth/${provider}/callback`, {
        code,
        deviceType: deviceInfo.deviceType,
        platform: Platform.OS,
      });
      
      const { token, user } = response.data;
      
      if (token && user) {
        return {
          success: true,
          token,
          user: {
            id: user.id || user._id,
            email: user.email,
            name: user.name || user.fullName,
            avatar: user.avatar || user.picture,
          },
        };
      }
      
      return { success: false, error: 'Invalid response from server' };
    } catch (error: any) {
      console.error('Token exchange error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Token exchange failed' 
      };
    }
  },

  /**
   * Check social auth status
   * Returns which social providers are linked to the account
   */
  async checkSocialStatus(): Promise<{
    google: boolean;
    apple: boolean;
    facebook: boolean;
  }> {
    try {
      const response = await api.get(`${API_BASE}/api/auth/social-status`);
      return response.data;
    } catch (error) {
      return { google: false, apple: false, facebook: false };
    }
  },
};

export default socialAuthService;

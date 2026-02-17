// Social Authentication Service for MegaRadio
// Uses expo-auth-session for Google and expo-apple-authentication for Apple

import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';
import authService from './authService';

// Complete auth session for web browser
WebBrowser.maybeCompleteAuthSession();

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

// Google OAuth Client IDs
const GOOGLE_IOS_CLIENT_ID = '246210957471-18662dh38h9tmlk7nppdk15ucbha4emk.apps.googleusercontent.com';
// Android client ID - add when available
// const GOOGLE_ANDROID_CLIENT_ID = 'YOUR_ANDROID_CLIENT_ID';

/**
 * Social Authentication Service
 * Uses native SDKs for Google and Apple Sign-In
 */
export const socialAuthService = {
  /**
   * Google Sign-In using expo-auth-session
   * Returns idToken to send to backend
   */
  async signInWithGoogle(): Promise<SocialAuthResponse> {
    try {
      console.log('[SocialAuth] Starting Google Sign-In...');
      
      // Create Google auth request
      const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
        iosClientId: GOOGLE_IOS_CLIENT_ID,
        // androidClientId: GOOGLE_ANDROID_CLIENT_ID,
      });

      // This won't work directly - need to use the hook in a component
      // For now, use the web-based approach that works with Expo Go
      return await this.googleWebAuth();
    } catch (error: any) {
      console.error('[SocialAuth] Google Sign-In error:', error);
      return {
        success: false,
        error: error.message || 'Google Sign-In failed',
      };
    }
  },

  /**
   * Google Sign-In via Web Browser (works in Expo Go)
   */
  async googleWebAuth(): Promise<SocialAuthResponse> {
    try {
      console.log('[SocialAuth] Starting Google Web Auth...');
      
      // Use Google OAuth endpoint
      const redirectUri = 'com.megaradio.app:/oauth2redirect/google';
      
      // For Expo Go, we need to use a different approach
      // Open Google OAuth in web browser
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_IOS_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=id_token&` +
        `scope=openid%20email%20profile&` +
        `nonce=${Math.random().toString(36).substring(7)}`;

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        redirectUri,
        { showInRecents: true }
      );

      console.log('[SocialAuth] Google auth result:', result.type);

      if (result.type === 'success' && result.url) {
        // Extract id_token from URL fragment
        const url = result.url;
        const fragmentMatch = url.match(/#(.+)/);
        
        if (fragmentMatch) {
          const params = new URLSearchParams(fragmentMatch[1]);
          const idToken = params.get('id_token');
          
          if (idToken) {
            console.log('[SocialAuth] Got Google ID token, sending to backend...');
            
            // Send to backend
            const backendResponse = await authService.googleSignIn(idToken);
            
            if (backendResponse.token && backendResponse.user) {
              return {
                success: true,
                token: backendResponse.token,
                user: {
                  id: backendResponse.user._id,
                  email: backendResponse.user.email,
                  name: backendResponse.user.fullName,
                  avatar: backendResponse.user.avatar,
                },
              };
            }
          }
        }
        
        return { success: false, error: 'Failed to get ID token from Google' };
      } else if (result.type === 'cancel') {
        return { success: false, error: 'Authentication cancelled' };
      }
      
      return { success: false, error: 'Google Sign-In failed' };
    } catch (error: any) {
      console.error('[SocialAuth] Google web auth error:', error);
      return {
        success: false,
        error: error.message || 'Google Sign-In failed',
      };
    }
  },

  /**
   * Apple Sign-In using expo-apple-authentication
   * Only available on iOS
   */
  async signInWithApple(): Promise<SocialAuthResponse> {
    try {
      console.log('[SocialAuth] Starting Apple Sign-In...');
      
      // Check if Apple auth is available (iOS only)
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      
      if (!isAvailable) {
        return {
          success: false,
          error: 'Apple Sign-In is only available on iOS devices',
        };
      }

      // Request Apple Sign-In
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('[SocialAuth] Got Apple credential');

      // Extract user info
      const { identityToken, authorizationCode, fullName, email } = credential;

      if (!identityToken || !authorizationCode) {
        return {
          success: false,
          error: 'Failed to get Apple credentials',
        };
      }

      // Build full name from Apple's name components
      let userName = '';
      if (fullName) {
        const nameParts = [fullName.givenName, fullName.familyName].filter(Boolean);
        userName = nameParts.join(' ');
      }

      console.log('[SocialAuth] Sending Apple credentials to backend...');

      // Send to backend
      const backendResponse = await authService.appleSignIn(
        identityToken,
        authorizationCode,
        userName || undefined,
        email || undefined
      );

      if (backendResponse.token && backendResponse.user) {
        return {
          success: true,
          token: backendResponse.token,
          user: {
            id: backendResponse.user._id,
            email: backendResponse.user.email,
            name: backendResponse.user.fullName,
            avatar: backendResponse.user.avatar,
          },
        };
      }

      return { success: false, error: 'Backend authentication failed' };
    } catch (error: any) {
      console.error('[SocialAuth] Apple Sign-In error:', error);
      
      // Handle specific Apple errors
      if (error.code === 'ERR_REQUEST_CANCELED') {
        return { success: false, error: 'Authentication cancelled' };
      }
      
      return {
        success: false,
        error: error.message || 'Apple Sign-In failed',
      };
    }
  },

  /**
   * Facebook Sign-In (placeholder)
   * Not implemented yet
   */
  async signInWithFacebook(): Promise<SocialAuthResponse> {
    return {
      success: false,
      error: 'Facebook Sign-In is not available yet',
    };
  },

  /**
   * Check if Apple Sign-In is available
   */
  async isAppleSignInAvailable(): Promise<boolean> {
    try {
      return await AppleAuthentication.isAvailableAsync();
    } catch {
      return false;
    }
  },
};

export default socialAuthService;

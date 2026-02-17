// Social Authentication Service for MegaRadio
// Uses expo-auth-session for Google and expo-apple-authentication for Apple

import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';
import authService from './authService';

// Complete auth session for web browser (required for Expo)
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
const GOOGLE_ANDROID_CLIENT_ID = '246210957471-4dmnb95bcduaocr8toiphv3guq9a8htl.apps.googleusercontent.com';

// Get the correct client ID based on platform
const getGoogleClientId = () => {
  if (Platform.OS === 'android') {
    return GOOGLE_ANDROID_CLIENT_ID;
  }
  return GOOGLE_IOS_CLIENT_ID;
};

// Google OAuth discovery document
const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  userInfoEndpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
};

/**
 * Social Authentication Service
 * Uses native SDKs for Google and Apple Sign-In
 */
export const socialAuthService = {
  /**
   * Get the correct redirect URI for Expo
   * Uses Expo AuthSession proxy for development
   */
  getRedirectUri(): string {
    // For Expo Go, use the proxy
    return AuthSession.makeRedirectUri({
      scheme: 'megaradio',
      path: 'oauth',
      // Use Expo's auth proxy for development
      useProxy: true,
    });
  },

  /**
   * Google Sign-In using expo-auth-session
   * Works in Expo Go without native builds
   */
  async signInWithGoogle(): Promise<SocialAuthResponse> {
    try {
      console.log('[SocialAuth] Starting Google Sign-In...');
      
      const redirectUri = this.getRedirectUri();
      console.log('[SocialAuth] Redirect URI:', redirectUri);

      // Create auth request
      const request = new AuthSession.AuthRequest({
        clientId: getGoogleClientId(),
        scopes: ['openid', 'profile', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.IdToken,
        usePKCE: false,
      });

      // Prompt user to sign in
      const result = await request.promptAsync(GOOGLE_DISCOVERY, {
        showInRecents: true,
        useProxy: true, // Use Expo's auth proxy
      });

      console.log('[SocialAuth] Auth result type:', result.type);

      if (result.type === 'success') {
        // Get id_token from params
        const idToken = result.params?.id_token;
        
        if (idToken) {
          console.log('[SocialAuth] Got Google ID token, sending to backend...');
          
          // Send to backend
          try {
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
          } catch (backendError: any) {
            console.error('[SocialAuth] Backend error:', backendError);
            return {
              success: false,
              error: backendError.response?.data?.error || 'Backend authentication failed',
            };
          }
        }
        
        return { success: false, error: 'No ID token received from Google' };
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        return { success: false, error: 'Authentication cancelled' };
      } else if (result.type === 'error') {
        console.error('[SocialAuth] Auth error:', result.error);
        return { 
          success: false, 
          error: result.error?.message || 'Google Sign-In failed' 
        };
      }
      
      return { success: false, error: 'Google Sign-In failed' };
    } catch (error: any) {
      console.error('[SocialAuth] Google Sign-In error:', error);
      return {
        success: false,
        error: error.message || 'Google Sign-In failed',
      };
    }
  },

  /**
   * Apple Sign-In using expo-apple-authentication
   * Only available on iOS 13+
   */
  async signInWithApple(): Promise<SocialAuthResponse> {
    try {
      console.log('[SocialAuth] Starting Apple Sign-In...');
      
      // Check if Apple auth is available (iOS only)
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      
      if (!isAvailable) {
        return {
          success: false,
          error: Platform.OS === 'ios' 
            ? 'Apple Sign-In requires iOS 13 or later'
            : 'Apple Sign-In is only available on iOS devices',
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
      try {
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
      } catch (backendError: any) {
        console.error('[SocialAuth] Backend error:', backendError);
        return {
          success: false,
          error: backendError.response?.data?.error || 'Backend authentication failed',
        };
      }

      return { success: false, error: 'Backend authentication failed' };
    } catch (error: any) {
      console.error('[SocialAuth] Apple Sign-In error:', error);
      
      // Handle specific Apple errors
      if (error.code === 'ERR_REQUEST_CANCELED' || error.code === 'ERR_CANCELED') {
        return { success: false, error: 'Authentication cancelled' };
      }
      
      return {
        success: false,
        error: error.message || 'Apple Sign-In failed',
      };
    }
  },

  /**
   * Facebook Sign-In (not implemented)
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

  /**
   * Get the redirect URI that needs to be configured in Google Cloud Console
   */
  getGoogleRedirectUriForConsole(): string {
    const uri = this.getRedirectUri();
    console.log('[SocialAuth] Configure this URI in Google Cloud Console:', uri);
    return uri;
  },
};

export default socialAuthService;

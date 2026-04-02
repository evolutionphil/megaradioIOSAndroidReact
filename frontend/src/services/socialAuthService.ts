// Social Authentication Service for MegaRadio
// Uses @react-native-google-signin/google-signin for Google (native SDK)
// Uses expo-apple-authentication for Apple

import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';
import authService from './authService';

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

// Google OAuth Web Client ID (from megaradio-276c6 Firebase project)
// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const GOOGLE_WEB_CLIENT_ID = '957628580421-1gj9mmbq20o9jva6olb28t2un6vb6jqh.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = '246210957471-18662dh38h9tmlk7nppdk15ucbha4emk.apps.googleusercontent.com';

// Lazy-load GoogleSignin to avoid crash on web
let GoogleSignin: any = null;
let statusCodes: any = null;

const getGoogleSignin = () => {
  if (!GoogleSignin && Platform.OS !== 'web') {
    try {
      const mod = require('@react-native-google-signin/google-signin');
      GoogleSignin = mod.GoogleSignin;
      statusCodes = mod.statusCodes;
    } catch (e) {
      console.warn('[SocialAuth] @react-native-google-signin/google-signin not available');
    }
  }
  return GoogleSignin;
};

/**
 * Social Authentication Service
 * Uses native SDKs for Google and Apple Sign-In
 */
export const socialAuthService = {
  /**
   * Configure Google Sign-In (call once at app start)
   */
  configureGoogle(): void {
    const gs = getGoogleSignin();
    if (!gs) return;

    try {
      gs.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        iosClientId: Platform.OS === 'ios' ? GOOGLE_IOS_CLIENT_ID : undefined,
        offlineAccess: false,
      });
      console.log('[SocialAuth] Google Sign-In configured (native SDK)');
    } catch (e: any) {
      console.warn('[SocialAuth] Google Sign-In configure error:', e.message);
    }
  },

  /**
   * Google Sign-In using native SDK (@react-native-google-signin/google-signin)
   * Returns idToken → send to backend POST /api/auth/google for verification
   */
  async signInWithGoogle(): Promise<SocialAuthResponse> {
    try {
      console.log('[SocialAuth] Starting native Google Sign-In...');

      const gs = getGoogleSignin();
      if (!gs) {
        return { success: false, error: 'Google Sign-In not available on this platform' };
      }

      // Check Play Services (Android)
      await gs.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Perform native sign-in
      const signInResult = await gs.signIn();
      console.log('[SocialAuth] Native sign-in result type:', signInResult?.type);

      // Handle different result formats (v12+ returns { type, data })
      let idToken: string | null = null;
      let userInfo: any = null;

      if (signInResult?.data) {
        // v12+ format
        idToken = signInResult.data.idToken;
        userInfo = signInResult.data.user;
      } else if (signInResult?.idToken) {
        // Legacy format
        idToken = signInResult.idToken;
        userInfo = signInResult.user;
      }

      if (!idToken) {
        // Try getting tokens separately
        try {
          const tokens = await gs.getTokens();
          idToken = tokens.idToken;
        } catch (e) {
          console.warn('[SocialAuth] getTokens failed:', e);
        }
      }

      console.log('[SocialAuth] idToken present:', !!idToken);
      console.log('[SocialAuth] User:', userInfo?.email);

      if (!idToken) {
        return { success: false, error: 'No ID token received from Google' };
      }

      // Build user info for backend
      const googleUserInfo = {
        email: userInfo?.email,
        name: userInfo?.name || userInfo?.givenName,
        googleId: userInfo?.id,
        avatar: userInfo?.photo,
      };

      // Send idToken to backend POST /api/auth/google
      console.log('[SocialAuth] Sending idToken to backend /api/auth/google...');

      try {
        const backendResponse = await authService.googleSignIn(idToken, googleUserInfo);

        if (backendResponse.token && backendResponse.user) {
          return {
            success: true,
            token: backendResponse.token,
            user: {
              id: backendResponse.user._id,
              email: backendResponse.user.email,
              name: backendResponse.user.fullName || backendResponse.user.name,
              avatar: backendResponse.user.avatar,
            },
          };
        }

        return { success: false, error: 'Unexpected backend response' };
      } catch (backendErr: any) {
        console.error('[SocialAuth] Backend auth error:', backendErr.message);
        return { success: false, error: backendErr.message || 'Backend authentication failed' };
      }
    } catch (error: any) {
      console.error('[SocialAuth] Google Sign-In error:', error);

      // Handle specific error codes
      if (statusCodes) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          return { success: false, error: 'Authentication cancelled' };
        }
        if (error.code === statusCodes.IN_PROGRESS) {
          return { success: false, error: 'Sign-in already in progress' };
        }
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          return { success: false, error: 'Google Play Services not available. Please update.' };
        }
      }

      return { success: false, error: error.message || 'Google Sign-In failed' };
    }
  },

  /**
   * Apple Sign-In using expo-apple-authentication
   * Only available on iOS 13+
   * Backend POST /api/auth/apple verifies identityToken with Apple JWKS
   * 
   * IMPORTANT: Apple provides fullName and email ONLY on first sign-in.
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

      const { identityToken, authorizationCode, fullName, email, user } = credential;

      if (!identityToken) {
        return {
          success: false,
          error: 'Failed to get Apple identity token',
        };
      }

      console.log('[SocialAuth] Sending Apple credentials to backend...');

      // Send to backend - POST /api/auth/apple
      // Pass fullName as object { givenName, familyName } as backend expects
      try {
        const backendResponse = await authService.appleSignIn(
          identityToken,
          authorizationCode || '',
          fullName ? { givenName: fullName.givenName, familyName: fullName.familyName } : null,
          email || null,
          user
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
          error: backendError.message || 'Backend authentication failed',
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

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
   * For iOS, use reversed client ID format
   * For Android, use custom scheme
   */
  getRedirectUri(): string {
    if (Platform.OS === 'ios') {
      // iOS uses reversed client ID as scheme
      // Client ID: 246210957471-18662dh38h9tmlk7nppdk15ucbha4emk.apps.googleusercontent.com
      // Reversed: com.googleusercontent.apps.246210957471-18662dh38h9tmlk7nppdk15ucbha4emk
      const redirectUri = 'com.googleusercontent.apps.246210957471-18662dh38h9tmlk7nppdk15ucbha4emk:/oauth2redirect/google';
      console.log('[SocialAuth] iOS redirect URI:', redirectUri);
      return redirectUri;
    } else {
      // Android uses custom scheme
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'megaradio',
        path: 'oauth',
      });
      console.log('[SocialAuth] Android redirect URI:', redirectUri);
      return redirectUri;
    }
  },

  /**
   * Google Sign-In using expo-auth-session
   * Uses PKCE code flow → exchange for tokens → send idToken to backend
   * Backend POST /api/auth/google verifies idToken with Google
   */
  async signInWithGoogle(): Promise<SocialAuthResponse> {
    try {
      console.log('[SocialAuth] Starting Google Sign-In...');
      
      const redirectUri = this.getRedirectUri();
      console.log('[SocialAuth] Redirect URI:', redirectUri);

      // Create auth request with CODE flow (iOS doesn't support id_token directly)
      const request = new AuthSession.AuthRequest({
        clientId: getGoogleClientId(),
        scopes: ['openid', 'profile', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
      });

      // Prompt user to sign in
      const result = await request.promptAsync(GOOGLE_DISCOVERY, {
        showInRecents: true,
      });

      console.log('[SocialAuth] Auth result type:', result.type);

      if (result.type === 'success') {
        const code = result.params?.code;
        
        if (code) {
          console.log('[SocialAuth] Got authorization code, exchanging for tokens...');
          
          try {
            // Exchange code for tokens
            const tokenResponse = await AuthSession.exchangeCodeAsync(
              {
                clientId: getGoogleClientId(),
                code,
                redirectUri,
                extraParams: {
                  code_verifier: request.codeVerifier || '',
                },
              },
              GOOGLE_DISCOVERY
            );

            const idToken = tokenResponse.idToken;
            const accessToken = tokenResponse.accessToken;
            
            console.log('[SocialAuth] idToken present:', !!idToken);
            console.log('[SocialAuth] accessToken present:', !!accessToken);
            
            // Always fetch user info from Google's userinfo endpoint (using accessToken)
            let userInfo: { email?: string; name?: string; googleId?: string; avatar?: string } = {};
            if (accessToken) {
              try {
                const userInfoResponse = await fetch(GOOGLE_DISCOVERY.userInfoEndpoint, {
                  headers: { Authorization: `Bearer ${accessToken}` },
                });
                const userData = await userInfoResponse.json();
                userInfo = {
                  email: userData.email,
                  name: userData.name,
                  googleId: userData.sub,
                  avatar: userData.picture,
                };
                console.log('[SocialAuth] Got user info from Google:', userInfo.email);
              } catch (e) {
                console.log('[SocialAuth] Could not fetch user info from Google');
              }
            }
            
            // Fallback: decode idToken locally for user info
            if (!userInfo.email && idToken) {
              try {
                const parts = idToken.split('.');
                if (parts.length === 3) {
                  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
                  const payload = JSON.parse(
                    typeof atob !== 'undefined'
                      ? atob(base64)
                      : Buffer.from(base64, 'base64').toString('utf-8')
                  );
                  userInfo = {
                    email: payload.email,
                    name: payload.name,
                    googleId: payload.sub,
                  };
                }
              } catch (decodeErr) {
                console.log('[SocialAuth] Could not decode idToken payload');
              }
            }
            
            // Send to backend - POST /api/auth/google
            // Send idToken if available, otherwise send accessToken as the token
            const tokenToSend = idToken || accessToken;
            
            if (tokenToSend) {
              console.log('[SocialAuth] Sending token to backend /api/auth/google...');
              
              try {
                const backendResponse = await authService.googleSignIn(tokenToSend, userInfo);
                
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
              } catch (firstErr: any) {
                console.log('[SocialAuth] First token attempt failed:', firstErr.message);
                
                // If idToken failed and we have accessToken, retry with accessToken
                if (tokenToSend === idToken && accessToken && accessToken !== idToken) {
                  console.log('[SocialAuth] Retrying with accessToken...');
                  try {
                    const retryResponse = await authService.googleSignIn(accessToken, userInfo);
                    
                    if (retryResponse.token && retryResponse.user) {
                      return {
                        success: true,
                        token: retryResponse.token,
                        user: {
                          id: retryResponse.user._id,
                          email: retryResponse.user.email,
                          name: retryResponse.user.fullName || retryResponse.user.name,
                          avatar: retryResponse.user.avatar,
                        },
                      };
                    }
                  } catch (retryErr: any) {
                    console.log('[SocialAuth] Retry with accessToken also failed:', retryErr.message);
                  }
                }
                
                return { success: false, error: firstErr.message || 'Google authentication failed' };
              }
              
              return { success: false, error: 'Google authentication failed - unexpected response' };
            } else {
              return { success: false, error: 'No token received from Google' };
            }
          } catch (tokenError: any) {
            console.error('[SocialAuth] Token exchange error:', tokenError);
            return {
              success: false,
              error: tokenError.message || 'Failed to exchange authorization code',
            };
          }
        }
        
        return { success: false, error: 'No authorization code received from Google' };
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

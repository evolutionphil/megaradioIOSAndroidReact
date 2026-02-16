import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, typography } from '../src/constants/theme';
import socialAuthService, { SocialProvider } from '../src/services/socialAuthService';
import { useAuthStore } from '../src/store/authStore';

// Auth button icons from assets
const APPLE_ICON = require('../assets/icons/apple.png');
const FACEBOOK_ICON = require('../assets/icons/facebook.png');
const GOOGLE_ICON = require('../assets/icons/google.png');
const MAIL_ICON = require('../assets/icons/mail.png');

// MegaRadio Logo with Arc - combined image from user
const MEGA_LOGO_ARC = require('../assets/images/mega-logo-arc.png');

export default function AuthOptionsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { saveAuth } = useAuthStore();
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null);

  const showError = (message: string) => {
    if (Platform.OS === 'web') {
      alert(message);
    } else {
      Alert.alert(t('login_error', 'Giriş Hatası'), message);
    }
  };

  const handleSocialLogin = async (provider: SocialProvider) => {
    setLoadingProvider(provider);
    
    try {
      let result;
      
      switch (provider) {
        case 'google':
          result = await socialAuthService.signInWithGoogle();
          break;
        case 'apple':
          result = await socialAuthService.signInWithApple();
          break;
        case 'facebook':
          result = await socialAuthService.signInWithFacebook();
          break;
      }
      
      if (result.success && result.token && result.user) {
        // Save auth and navigate to home
        await saveAuth(
          {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            avatar: result.user.avatar,
          } as any,
          result.token
        );
        router.replace('/(tabs)');
      } else if (result.error === 'Authentication cancelled') {
        // User cancelled - do nothing
        console.log('User cancelled authentication');
      } else {
        showError(result.error || 'Giriş başarısız oldu');
      }
    } catch (error: any) {
      console.error(`${provider} login error:`, error);
      showError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleAppleLogin = () => handleSocialLogin('apple');
  const handleFacebookLogin = () => handleSocialLogin('facebook');
  const handleGoogleLogin = () => handleSocialLogin('google');

  const handleMailLogin = () => {
    router.push('/login');
  };

  const handleContinueWithoutLogin = () => {
    router.replace('/(tabs)');
  };

  const handleClose = () => {
    // Navigate back or to home if there's no navigation history
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const isLoading = loadingProvider !== null;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          data-testid="auth-close-button"
        >
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* MegaRadio Logo with Arc Effect */}
        <View style={styles.logoContainer}>
          <Image 
            source={MEGA_LOGO_ARC} 
            style={styles.logoImage} 
            resizeMode="contain" 
          />
        </View>

        {/* Auth Buttons */}
        <View style={styles.buttonsContainer}>
          {/* Apple */}
          <TouchableOpacity
            style={[styles.authButton, isLoading && styles.authButtonDisabled]}
            onPress={handleAppleLogin}
            disabled={isLoading}
            data-testid="login-apple-button"
          >
            {loadingProvider === 'apple' ? (
              <View style={styles.loadingIconContainer}>
                <ActivityIndicator size="small" color={colors.text} />
              </View>
            ) : (
              <Image source={APPLE_ICON} style={styles.buttonIcon} resizeMode="contain" />
            )}
            <Text style={styles.authButtonText}>{t('login_with_apple', 'Apple ile Giriş Yap')}</Text>
          </TouchableOpacity>

          {/* Facebook */}
          <TouchableOpacity
            style={[styles.authButton, isLoading && styles.authButtonDisabled]}
            onPress={handleFacebookLogin}
            disabled={isLoading}
            data-testid="login-facebook-button"
          >
            {loadingProvider === 'facebook' ? (
              <View style={styles.loadingIconContainer}>
                <ActivityIndicator size="small" color={colors.text} />
              </View>
            ) : (
              <Image source={FACEBOOK_ICON} style={styles.buttonIcon} resizeMode="contain" />
            )}
            <Text style={styles.authButtonText}>{t('login_with_facebook', 'Facebook ile Giriş Yap')}</Text>
          </TouchableOpacity>

          {/* Google */}
          <TouchableOpacity
            style={[styles.authButton, isLoading && styles.authButtonDisabled]}
            onPress={handleGoogleLogin}
            disabled={isLoading}
            data-testid="login-google-button"
          >
            {loadingProvider === 'google' ? (
              <View style={styles.loadingIconContainer}>
                <ActivityIndicator size="small" color={colors.text} />
              </View>
            ) : (
              <Image source={GOOGLE_ICON} style={styles.buttonIcon} resizeMode="contain" />
            )}
            <Text style={styles.authButtonText}>{t('login_with_google', 'Google ile Giriş Yap')}</Text>
          </TouchableOpacity>

          {/* Mail */}
          <TouchableOpacity
            style={[styles.authButton, isLoading && styles.authButtonDisabled]}
            onPress={handleMailLogin}
            disabled={isLoading}
            data-testid="login-mail-button"
          >
            <Image source={MAIL_ICON} style={styles.buttonIcon} resizeMode="contain" />
            <Text style={styles.authButtonText}>{t('login_with_mail', 'E-posta ile Giriş Yap')}</Text>
          </TouchableOpacity>
        </View>

        {/* Continue without login */}
        <TouchableOpacity
          style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
          onPress={handleContinueWithoutLogin}
          disabled={isLoading}
          data-testid="continue-without-login-button"
        >
          <Text style={styles.continueButtonText}>{t('continue_without_login', 'Giriş yapmadan devam et')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: '#2A2A2D',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  logoContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  logoImage: {
    width: 340,
    height: 340,
  },
  buttonsContainer: {
    gap: 14,
    marginTop: 420,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#3A3A3D',
    paddingHorizontal: 8,
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  loadingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authButtonText: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.sizes.md,
    fontWeight: '500',
    color: colors.text,
    marginRight: 40,
    flexShrink: 1,
  },
  continueButton: {
    marginTop: 28,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: typography.sizes.lg,
    fontWeight: '500',
    color: colors.text,
    textDecorationLine: 'underline',
  },
});

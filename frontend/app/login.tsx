import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, typography } from '../src/constants/theme';
import authService from '../src/services/authService';
import { useAuthStore } from '../src/store/authStore';

// Input icons
const EMAIL_ICON = require('../assets/icons/email-input.png');
const PASSWORD_ICON = require('../assets/icons/password-input.png');

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { saveAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasError, setHasError] = useState(false);

  const validateForm = () => {
    if (!email.trim()) {
      setError(t('please_enter_email', 'Please enter your email'));
      setHasError(true);
      return false;
    }
    if (!password) {
      setError(t('please_enter_password', 'Please enter your password'));
      setHasError(true);
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError(t('invalid_email', 'Please enter a valid email address'));
      setHasError(true);
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    setError('');
    setHasError(false);
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await authService.mobileLogin(email.trim(), password);
      
      console.log('Login response:', JSON.stringify(response, null, 2));
      
      // API returns { message: "Login successful", token, user } not { success: true }
      if (response && response.token && response.user) {
        const apiUser = response.user;
        
        // Build full avatar URL if relative
        let avatarUrl = apiUser.avatar || null;
        if (avatarUrl && !avatarUrl.startsWith('http')) {
          avatarUrl = `https://themegaradio.com${avatarUrl}`;
        }
        
        // Map API user format to our User type
        const user = {
          _id: apiUser._id,
          id: apiUser._id,
          name: apiUser.fullName || apiUser.name || '',
          fullName: apiUser.fullName,
          email: apiUser.email,
          username: apiUser.username,
          avatar: avatarUrl,
          profilePhoto: avatarUrl,
          followersCount: apiUser.followersCount || 0,
          followingCount: apiUser.followingCount || 0,
          isPublicProfile: apiUser.isPublicProfile,
          favoriteStationsCount: apiUser.favoriteStationsCount || 0,
          totalListeningTime: apiUser.totalListeningTime || 0,
        };
        await saveAuth(user as any, response.token);
        
        // Use setTimeout to ensure navigation happens after state update
        // Replace the entire stack with tabs
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 100);
      } else {
        console.error('Invalid response structure:', response);
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      console.error('Error response:', err.response?.data);
      setHasError(true);
      setError(t('wrong_credentials', 'Wrong email or password! Try again'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  const handleGoToSignup = () => {
    router.push('/signup');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            data-testid="login-back-button"
          >
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>

          {/* Error Toast */}
          {hasError && error && (
            <View style={styles.errorToast} data-testid="login-error-toast">
              <Text style={styles.errorToastText}>{error}</Text>
            </View>
          )}

          {/* Content */}
          <View style={styles.content}>
            {/* Title - Ubuntu Bold 24px */}
            <Text style={styles.title}>{t('login', 'Login')}</Text>

            {/* Email Input */}
            <View style={[styles.inputContainer, hasError && styles.inputError]}>
              <View style={styles.inputIconContainer}>
                <Image source={EMAIL_ICON} style={styles.inputIcon} resizeMode="contain" />
              </View>
              <TextInput
                style={styles.input}
                placeholder={t('email_placeholder', 'Email')}
                placeholderTextColor={colors.inputPlaceholder}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setHasError(false);
                  setError('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                data-testid="login-email-input"
              />
            </View>

            {/* Password Input */}
            <View style={[styles.inputContainer, hasError && styles.inputError]}>
              <View style={styles.inputIconContainer}>
                <Image source={PASSWORD_ICON} style={styles.inputIcon} resizeMode="contain" />
              </View>
              <TextInput
                style={styles.input}
                placeholder={t('password_placeholder', 'Password')}
                placeholderTextColor={colors.inputPlaceholder}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setHasError(false);
                  setError('');
                }}
                secureTextEntry
                data-testid="login-password-input"
              />
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              data-testid="login-submit-button"
            >
              {isLoading ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.loginButtonText}>{t('login', 'Login')}</Text>
              )}
            </TouchableOpacity>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={handleForgotPassword}
              data-testid="login-forgot-password-button"
            >
              <Text style={styles.forgotPasswordText}>{t('forgot_password', 'Forgot your password?')}</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleGoToSignup}>
              <Text style={styles.footerText}>{t('dont_have_account', "Don't you have an account?")}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
  },
  keyboardView: {
    flex: 1,
  },
  backButton: {
    marginLeft: spacing.md,
    marginTop: spacing.sm,
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  errorToast: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: colors.errorToast,
    alignItems: 'center',
  },
  errorToastText: {
    fontFamily: 'Ubuntu-Medium',
    fontSize: typography.sizes.md,
    color: colors.text,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: -40,
  },
  title: {
    fontFamily: 'Ubuntu-Bold',
    fontSize: 24,
    lineHeight: 24,
    letterSpacing: 0,
    color: colors.text,
    marginBottom: spacing.lg,
    width: 64,
    height: 28,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.inputBackground,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  inputError: {
    borderWidth: 2,
    borderColor: colors.errorBorder,
    backgroundColor: '#FFF5F5',
  },
  inputIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: '#E8EDF2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputIcon: {
    width: 20,
    height: 20,
  },
  input: {
    flex: 1,
    marginLeft: spacing.md,
    fontSize: typography.sizes.lg,
    fontFamily: 'Ubuntu-Regular',
    color: '#1A1A1D',
  },
  loginButton: {
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accentPinkButton,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontFamily: 'Ubuntu-Bold',
    fontSize: typography.sizes.lg,
    color: colors.text,
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  forgotPasswordText: {
    fontFamily: 'Ubuntu-Medium',
    fontSize: typography.sizes.md,
    color: colors.text,
    textDecorationLine: 'underline',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: spacing.xxl,
  },
  footerText: {
    fontFamily: 'Ubuntu-Medium',
    fontSize: typography.sizes.md,
    color: colors.text,
    textDecorationLine: 'underline',
  },
});

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
import { colors, spacing, borderRadius, typography } from '../src/constants/theme';
import authService from '../src/services/authService';

// Input icons
const EMAIL_ICON = require('../assets/icons/email-input.png');

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleSend = async () => {
    setError('');
    if (!validateEmail()) return;

    setIsLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setSuccess(true);
    } catch (err: any) {
      console.error('Forgot password error:', err);
      const errorMessage = err.response?.data?.error || 'Failed to send reset email. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleGoToSignup = () => {
    router.push('/signup');
  };

  if (success) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            data-testid="forgot-password-back-button"
          >
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Email Sent!</Text>
            <Text style={styles.successText}>
              We've sent a password reset link to {email}. Please check your inbox.
            </Text>
            <TouchableOpacity
              style={styles.sendButton}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.sendButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

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
            data-testid="forgot-password-back-button"
          >
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>

          {/* Content */}
          <View style={styles.content}>
            {/* Title - Ubuntu Bold 24px */}
            <Text style={styles.title}>Forgot your password?</Text>
            <Text style={styles.subtitle}>
              Enter your email we will send you verification mail.
            </Text>

            {/* Email Input */}
            <View style={[styles.inputContainer, error && styles.inputError]}>
              <View style={styles.inputIconContainer}>
                <Image source={EMAIL_ICON} style={styles.inputIcon} resizeMode="contain" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.inputPlaceholder}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                data-testid="forgot-password-email-input"
              />
            </View>

            {/* Send Button */}
            <TouchableOpacity
              style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={isLoading}
              data-testid="forgot-password-send-button"
            >
              {isLoading ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleGoToSignup}>
              <Text style={styles.footerText}>Don't you have an account?</Text>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: -80,
  },
  title: {
    fontFamily: 'Ubuntu-Bold',
    fontSize: 24,
    lineHeight: 24,
    letterSpacing: 0,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 22,
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
    color: '#1A1A1D',
  },
  sendButton: {
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accentPinkButton,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonText: {
    fontSize: typography.sizes.lg,
    fontFamily: 'Ubuntu-Medium',
    color: colors.text,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: spacing.xxl,
  },
  footerText: {
    fontSize: typography.sizes.md,
    fontFamily: 'Ubuntu-Medium',
    color: colors.text,
    textDecorationLine: 'underline',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  successIcon: {
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontFamily: 'Ubuntu-Bold',
    fontSize: 28,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  successText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
});

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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '../src/constants/theme';
import authService from '../src/services/authService';
import { useAuthStore } from '../src/store/authStore';

export default function SignupScreen() {
  const router = useRouter();
  const { saveAuth } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasError, setHasError] = useState(false);

  const validateForm = () => {
    if (!name.trim()) {
      setError('Please enter your name');
      setHasError(true);
      return false;
    }
    if (!email.trim()) {
      setError('Please enter your email');
      setHasError(true);
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      setHasError(true);
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setHasError(true);
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    setError('');
    setHasError(false);
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Use mobile register endpoint
      const response = await authService.mobileRegister(email.trim(), password, name.trim());
      
      if (response.success && response.token && response.user) {
        await saveAuth(response.user, response.token);
        router.replace('/(tabs)');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      setHasError(true);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Signup failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              data-testid="signup-back-button"
            >
              <Ionicons name="chevron-back" size={28} color={colors.text} />
            </TouchableOpacity>

            {/* Error Toast */}
            {hasError && error && (
              <View style={styles.errorToast} data-testid="signup-error-toast">
                <Text style={styles.errorToastText}>{error}</Text>
              </View>
            )}

            {/* Content */}
            <View style={styles.content}>
              {/* Title */}
              <Text style={styles.title}>Signup</Text>

              {/* Name Input */}
              <View style={[styles.inputContainer, hasError && styles.inputError]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="person" size={20} color={colors.inputIcon} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor={colors.inputPlaceholder}
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    setHasError(false);
                    setError('');
                  }}
                  autoCapitalize="words"
                  data-testid="signup-name-input"
                />
              </View>

              {/* Email Input */}
              <View style={[styles.inputContainer, hasError && styles.inputError]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="mail" size={20} color={colors.inputIcon} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
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
                  data-testid="signup-email-input"
                />
              </View>

              {/* Password Input */}
              <View style={[styles.inputContainer, hasError && styles.inputError]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="lock-closed" size={20} color={colors.inputIcon} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={colors.inputPlaceholder}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setHasError(false);
                    setError('');
                  }}
                  secureTextEntry
                  data-testid="signup-password-input"
                />
              </View>

              {/* Password hint */}
              <Text style={styles.passwordHint}>Password must be at least 6 characters.</Text>

              {/* Signup Button */}
              <TouchableOpacity
                style={[styles.signupButton, isLoading && styles.signupButtonDisabled]}
                onPress={handleSignup}
                disabled={isLoading}
                data-testid="signup-submit-button"
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <Text style={styles.signupButtonText}>Signup</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
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
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    fontStyle: 'italic',
    color: colors.text,
    marginBottom: spacing.lg,
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
  input: {
    flex: 1,
    marginLeft: spacing.md,
    fontSize: typography.sizes.lg,
    color: '#1A1A1D',
  },
  passwordHint: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.md,
    marginTop: -spacing.xs,
  },
  signupButton: {
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accentPinkButton,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  signupButtonDisabled: {
    opacity: 0.7,
  },
  signupButtonText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
});

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '../src/constants/theme';

// Auth button icons from assets
const APPLE_ICON = require('../assets/icons/apple.png');
const FACEBOOK_ICON = require('../assets/icons/facebook.png');
const GOOGLE_ICON = require('../assets/icons/google.png');
const MAIL_ICON = require('../assets/icons/mail.png');

// MegaRadio Logo with Arc - combined image from user
const MEGA_LOGO_ARC = require('../assets/images/mega-logo-arc.png');

export default function AuthOptionsScreen() {
  const router = useRouter();

  const handleAppleLogin = () => {
    console.log('Apple login pressed');
  };

  const handleFacebookLogin = () => {
    console.log('Facebook login pressed');
  };

  const handleGoogleLogin = () => {
    console.log('Google login pressed');
  };

  const handleMailLogin = () => {
    router.push('/login');
  };

  const handleContinueWithoutLogin = () => {
    router.replace('/(tabs)');
  };

  const handleClose = () => {
    router.back();
  };

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
            style={styles.authButton}
            onPress={handleAppleLogin}
            data-testid="login-apple-button"
          >
            <Image source={APPLE_ICON} style={styles.buttonIcon} resizeMode="contain" />
            <Text style={styles.authButtonText}>Login With Apple</Text>
          </TouchableOpacity>

          {/* Facebook */}
          <TouchableOpacity
            style={styles.authButton}
            onPress={handleFacebookLogin}
            data-testid="login-facebook-button"
          >
            <Image source={FACEBOOK_ICON} style={styles.buttonIcon} resizeMode="contain" />
            <Text style={styles.authButtonText}>Login With Facebook</Text>
          </TouchableOpacity>

          {/* Google */}
          <TouchableOpacity
            style={styles.authButton}
            onPress={handleGoogleLogin}
            data-testid="login-google-button"
          >
            <Image source={GOOGLE_ICON} style={styles.buttonIcon} resizeMode="contain" />
            <Text style={styles.authButtonText}>Login With Google</Text>
          </TouchableOpacity>

          {/* Mail */}
          <TouchableOpacity
            style={styles.authButton}
            onPress={handleMailLogin}
            data-testid="login-mail-button"
          >
            <Image source={MAIL_ICON} style={styles.buttonIcon} resizeMode="contain" />
            <Text style={styles.authButtonText}>Login With Mail</Text>
          </TouchableOpacity>
        </View>

        {/* Continue without login */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinueWithoutLogin}
          data-testid="continue-without-login-button"
        >
          <Text style={styles.continueButtonText}>Continue without login</Text>
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
    top: 122,
    left: 25,
  },
  logoImage: {
    width: 326,
    height: 326,
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
  buttonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  authButtonText: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.sizes.lg,
    fontWeight: '500',
    color: colors.text,
    marginRight: 40,
  },
  continueButton: {
    marginTop: 28,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  continueButtonText: {
    fontSize: typography.sizes.lg,
    fontWeight: '500',
    color: colors.text,
    textDecorationLine: 'underline',
  },
});

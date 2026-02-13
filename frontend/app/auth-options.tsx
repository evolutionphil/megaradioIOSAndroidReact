import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { colors, spacing, borderRadius, typography } from '../src/constants/theme';

const { width } = Dimensions.get('window');

// MegaRadio Logo - Music note "M" shape
const MegaRadioLogo = () => (
  <Svg width={100} height={80} viewBox="0 0 100 80">
    {/* Music note M shape */}
    <Path
      d="M25 60 Q30 35 45 45 Q60 55 55 25"
      stroke="#FF4B8C"
      strokeWidth={8}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* Dot at the end */}
    <Circle cx="55" cy="22" r="6" fill="#FF4B8C" />
  </Svg>
);

// Arc lines behind logo - matching Figma design
const GlowArcs = () => (
  <View style={styles.arcsContainer}>
    <Svg width={width} height={280} style={styles.arcsSvg}>
      <Defs>
        <LinearGradient id="arcGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#4A1A2C" stopOpacity="0" />
          <Stop offset="50%" stopColor="#4A1A2C" stopOpacity="0.8" />
          <Stop offset="100%" stopColor="#4A1A2C" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="arcGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#3D1525" stopOpacity="0" />
          <Stop offset="50%" stopColor="#3D1525" stopOpacity="0.6" />
          <Stop offset="100%" stopColor="#3D1525" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {/* Outer arc */}
      <Path
        d={`M ${width * 0.05} 260 Q ${width / 2} 30 ${width * 0.95} 260`}
        stroke="url(#arcGrad2)"
        strokeWidth={2}
        fill="none"
      />
      {/* Inner arc */}
      <Path
        d={`M ${width * 0.12} 260 Q ${width / 2} 60 ${width * 0.88} 260`}
        stroke="url(#arcGrad1)"
        strokeWidth={2}
        fill="none"
      />
    </Svg>
  </View>
);

// Apple Icon SVG - proper Apple logo
const AppleIcon = () => (
  <View style={[styles.iconContainer, styles.iconWhiteBg]}>
    <Svg width={20} height={24} viewBox="0 0 17 20">
      <Path
        d="M8.5 3.5c1-1.2 2.5-2 3.5-2 0.1 1.5-0.4 3-1.4 4-0.9 1-2.4 1.7-3.4 1.6-0.2-1.4 0.4-2.8 1.3-3.6zM14.1 10.8c-0.1 2.8 2.4 4.2 2.4 4.2s-1.6 4.6-3.9 4.6c-1 0-1.8-0.7-2.9-0.7-1.1 0-2 0.7-3 0.7-2.1 0.1-5.2-4.4-5.2-8 0-3.4 2.2-5.3 4.2-5.3 1.1 0 2.2 0.8 2.9 0.8 0.7 0 1.9-0.9 3.2-0.8 0.5 0 2.1 0.2 3.1 1.7-2.6 1.6-2.8 4.8-0.8 2.8z"
        fill="#000000"
      />
    </Svg>
  </View>
);

// Facebook Icon
const FacebookIcon = () => (
  <View style={[styles.iconContainer, styles.facebookBg]}>
    <Text style={styles.facebookText}>f</Text>
  </View>
);

// Google Icon SVG
const GoogleIcon = () => (
  <View style={[styles.iconContainer, styles.iconWhiteBg]}>
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  </View>
);

// Mail Icon
const MailIcon = () => (
  <View style={[styles.iconContainer, styles.iconWhiteBg]}>
    <Svg width={22} height={18} viewBox="0 0 24 20">
      <Path
        d="M2 2h20c1.1 0 2 0.9 2 2v12c0 1.1-0.9 2-2 2H2c-1.1 0-2-0.9-2-2V4c0-1.1 0.9-2 2-2z"
        fill="#5C6670"
      />
      <Path
        d="M24 4l-12 7L0 4"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  </View>
);

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

        {/* Glow Arcs */}
        <GlowArcs />

        {/* Logo */}
        <View style={styles.logoContainer}>
          <MegaRadioLogo />
        </View>

        {/* Auth Buttons */}
        <View style={styles.buttonsContainer}>
          {/* Apple */}
          <TouchableOpacity
            style={styles.authButton}
            onPress={handleAppleLogin}
            data-testid="login-apple-button"
          >
            <AppleIcon />
            <Text style={styles.authButtonText}>Login With Apple</Text>
          </TouchableOpacity>

          {/* Facebook */}
          <TouchableOpacity
            style={styles.authButton}
            onPress={handleFacebookLogin}
            data-testid="login-facebook-button"
          >
            <FacebookIcon />
            <Text style={styles.authButtonText}>Login With Facebook</Text>
          </TouchableOpacity>

          {/* Google */}
          <TouchableOpacity
            style={styles.authButton}
            onPress={handleGoogleLogin}
            data-testid="login-google-button"
          >
            <GoogleIcon />
            <Text style={styles.authButtonText}>Login With Google</Text>
          </TouchableOpacity>

          {/* Mail */}
          <TouchableOpacity
            style={styles.authButton}
            onPress={handleMailLogin}
            data-testid="login-mail-button"
          >
            <MailIcon />
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
  arcsContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  arcsSvg: {},
  logoContainer: {
    alignItems: 'center',
    marginTop: 180,
    marginBottom: 60,
  },
  buttonsContainer: {
    gap: 14,
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
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWhiteBg: {
    backgroundColor: '#FFFFFF',
  },
  facebookBg: {
    backgroundColor: '#1877F2',
  },
  facebookText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: -2,
  },
  mailIconInner: {
    width: 26,
    height: 20,
    backgroundColor: '#5C6670',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authButtonText: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
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
    fontWeight: typography.weights.medium,
    color: colors.text,
    textDecorationLine: 'underline',
  },
});

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
import Svg, { Path, Circle, Ellipse, RadialGradient, Defs, Stop } from 'react-native-svg';
import { colors, spacing, borderRadius, typography } from '../src/constants/theme';

const { width } = Dimensions.get('window');

// MegaRadio Logo Component
const MegaRadioLogo = () => (
  <Svg width={80} height={60} viewBox="0 0 80 60">
    <Path
      d="M20 45 Q25 20 40 30 Q55 40 50 15"
      stroke="#FF4B8C"
      strokeWidth={6}
      strokeLinecap="round"
      fill="none"
    />
    <Circle cx="50" cy="15" r="4" fill="#FF4B8C" />
  </Svg>
);

// Glow arc effect behind logo
const GlowArc = () => (
  <Svg width={width} height={200} style={styles.glowArc}>
    <Defs>
      <RadialGradient id="glowGrad" cx="50%" cy="100%" rx="60%" ry="60%">
        <Stop offset="0%" stopColor="#FF4B8C" stopOpacity="0.15" />
        <Stop offset="100%" stopColor="#FF4B8C" stopOpacity="0" />
      </RadialGradient>
    </Defs>
    <Ellipse
      cx={width / 2}
      cy={180}
      rx={width * 0.6}
      ry={120}
      fill="url(#glowGrad)"
    />
    {/* Arc lines */}
    <Path
      d={`M ${width * 0.15} 180 Q ${width / 2} 60 ${width * 0.85} 180`}
      stroke="rgba(255, 75, 140, 0.15)"
      strokeWidth={1}
      fill="none"
    />
    <Path
      d={`M ${width * 0.1} 200 Q ${width / 2} 40 ${width * 0.9} 200`}
      stroke="rgba(255, 75, 140, 0.1)"
      strokeWidth={1}
      fill="none"
    />
  </Svg>
);

export default function AuthOptionsScreen() {
  const router = useRouter();

  const handleAppleLogin = () => {
    // TODO: Implement Apple Sign In
    console.log('Apple login pressed');
  };

  const handleFacebookLogin = () => {
    // TODO: Implement Facebook Sign In
    console.log('Facebook login pressed');
  };

  const handleGoogleLogin = () => {
    // TODO: Implement Google Sign In
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

        {/* Glow Effect */}
        <GlowArc />

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
            <View style={styles.iconContainer}>
              <Ionicons name="logo-apple" size={22} color="#000000" />
            </View>
            <Text style={styles.authButtonText}>Login With Apple</Text>
          </TouchableOpacity>

          {/* Facebook */}
          <TouchableOpacity
            style={styles.authButton}
            onPress={handleFacebookLogin}
            data-testid="login-facebook-button"
          >
            <View style={[styles.iconContainer, styles.facebookIcon]}>
              <Ionicons name="logo-facebook" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.authButtonText}>Login With Facebook</Text>
          </TouchableOpacity>

          {/* Google */}
          <TouchableOpacity
            style={styles.authButton}
            onPress={handleGoogleLogin}
            data-testid="login-google-button"
          >
            <View style={styles.iconContainer}>
              <Svg width={22} height={22} viewBox="0 0 24 24">
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
            <Text style={styles.authButtonText}>Login With Google</Text>
          </TouchableOpacity>

          {/* Mail */}
          <TouchableOpacity
            style={styles.authButton}
            onPress={handleMailLogin}
            data-testid="login-mail-button"
          >
            <View style={styles.iconContainer}>
              <Ionicons name="mail" size={20} color="#5C6670" />
            </View>
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
  glowArc: {
    position: 'absolute',
    top: 80,
    left: 0,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 160,
    marginBottom: 80,
  },
  buttonsContainer: {
    gap: 16,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#3A3A3D',
    paddingHorizontal: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  facebookIcon: {
    backgroundColor: '#1877F2',
  },
  authButtonText: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginRight: 40, // Offset for icon width to center text
  },
  continueButton: {
    marginTop: 32,
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

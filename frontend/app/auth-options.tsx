import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
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

// Local icon assets
const ICONS = {
  apple: require('../assets/icons/apple.png'),
  facebook: require('../assets/icons/facebook.png'),
  google: require('../assets/icons/google.png'),
  mail: require('../assets/icons/mail.png'),
};

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
            <Image 
              source={ICONS.apple} 
              style={styles.iconImage}
              resizeMode="contain"
            />
            <Text style={styles.authButtonText}>Login With Apple</Text>
          </TouchableOpacity>

          {/* Facebook */}
          <TouchableOpacity
            style={styles.authButton}
            onPress={handleFacebookLogin}
            data-testid="login-facebook-button"
          >
            <Image 
              source={ICONS.facebook} 
              style={styles.iconImage}
              resizeMode="contain"
            />
            <Text style={styles.authButtonText}>Login With Facebook</Text>
          </TouchableOpacity>

          {/* Google */}
          <TouchableOpacity
            style={styles.authButton}
            onPress={handleGoogleLogin}
            data-testid="login-google-button"
          >
            <Image 
              source={ICONS.google} 
              style={styles.iconImage}
              resizeMode="contain"
            />
            <Text style={styles.authButtonText}>Login With Google</Text>
          </TouchableOpacity>

          {/* Mail */}
          <TouchableOpacity
            style={styles.authButton}
            onPress={handleMailLogin}
            data-testid="login-mail-button"
          >
            <Image 
              source={ICONS.mail} 
              style={styles.iconImage}
              resizeMode="contain"
            />
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
  arcsSvg: {
    // SVG positioning
  },
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
  iconImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
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

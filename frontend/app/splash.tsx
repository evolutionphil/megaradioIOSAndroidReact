import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

// Splash screen assets
const SPLASH_LOGO = require('../assets/images/splash-logo.png');
const SPLASH_DOTS = require('../assets/images/splash-dots.png');

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    // Navigate to main app after 2.5 seconds
    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* Logo with circular rings - centered */}
      <View style={styles.logoContainer}>
        <Image
          source={SPLASH_LOGO}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Dotted pattern at bottom left */}
      <Image
        source={SPLASH_DOTS}
        style={styles.dotsPattern}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: width * 0.7,
    height: width * 0.7,
  },
  dotsPattern: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: width,
    height: height * 0.35,
    opacity: 0.8,
  },
});

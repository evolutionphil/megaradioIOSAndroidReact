import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

// Splash screen assets
const SPLASH_LOGO = require('../../assets/images/splash-logo-only.png');
const SPLASH_CIRCLES = require('../../assets/images/splash-circles.png');
const SPLASH_DOTS = require('../../assets/images/splash-dots-new.png');

interface AnimatedSplashProps {
  onAnimationEnd?: () => void;
}

export const AnimatedSplash: React.FC<AnimatedSplashProps> = ({ onAnimationEnd }) => {
  // Animation values
  const circleScale = useRef(new Animated.Value(1)).current;
  const circleOpacity = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const dotsTranslateY = useRef(new Animated.Value(50)).current;
  const dotsOpacity = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animations
    startAnimations();
    
    // End splash after 2.5 seconds
    const timer = setTimeout(() => {
      onAnimationEnd?.();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const startAnimations = () => {
    // Logo fade in and scale
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Circle pulse animation (expand and contract)
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(circleScale, {
            toValue: 1.08,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(circleOpacity, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(circleScale, {
            toValue: 0.95,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(circleOpacity, {
            toValue: 0.6,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    // Dots slide up and fade in - start immediately
    Animated.parallel([
      Animated.timing(dotsOpacity, {
        toValue: 1,
        duration: 500,
        delay: 0,
        useNativeDriver: true,
      }),
      Animated.timing(dotsTranslateY, {
        toValue: 0,
        duration: 500,
        delay: 0,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Dots wave animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Wave transform for dots
  const dotsWaveTransform = waveAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -8, 0],
  });

  const dotsScaleX = waveAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.02, 1],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Animated Circles - pulse effect */}
      <Animated.View
        style={[
          styles.circlesContainer,
          {
            transform: [{ scale: circleScale }],
            opacity: circleOpacity,
          },
        ]}
      >
        <Image
          source={SPLASH_CIRCLES}
          style={styles.circles}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Logo on top */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={SPLASH_LOGO}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Animated Dots - wave effect */}
      <Animated.View
        style={[
          styles.dotsContainer,
          {
            opacity: dotsOpacity,
            transform: [
              { translateY: Animated.add(dotsTranslateY, dotsWaveTransform) },
              { scaleX: dotsScaleX },
            ],
          },
        ]}
      >
        <Image
          source={SPLASH_DOTS}
          style={[styles.dots, { tintColor: undefined }]}
          resizeMode="stretch"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circlesContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circles: {
    width: width * 0.85,
    height: width * 0.85,
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  logo: {
    width: 180,
    height: 90,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: width * 1.2,
    height: height * 0.5,
  },
  dots: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
});

export default AnimatedSplash;

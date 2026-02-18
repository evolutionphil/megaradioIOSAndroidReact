// AnimatedSplash - MegaRadio branded splash screen
// Matches the exact design: logo + rings + gradient wave at bottom

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Image, StatusBar } from 'react-native';

const { width, height } = Dimensions.get('window');

interface AnimatedSplashProps {
  onAnimationComplete?: () => void;
  isLoading?: boolean;
}

const AnimatedSplash: React.FC<AnimatedSplashProps> = ({ 
  onAnimationComplete,
  isLoading = true 
}) => {
  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const ringsOpacity = useRef(new Animated.Value(0)).current;
  const waveOpacity = useRef(new Animated.Value(0)).current;
  const waveTranslate = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    // Start animations sequence
    const startAnimations = () => {
      // Logo fade in and scale
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Rings fade in (delayed)
      Animated.timing(ringsOpacity, {
        toValue: 1,
        duration: 600,
        delay: 400,
        useNativeDriver: true,
      }).start();

      // Wave slide up from bottom
      Animated.parallel([
        Animated.timing(waveOpacity, {
          toValue: 1,
          duration: 800,
          delay: 300,
          useNativeDriver: true,
        }),
        Animated.timing(waveTranslate, {
          toValue: 0,
          duration: 800,
          delay: 300,
          useNativeDriver: true,
        }),
      ]).start();
    };

    startAnimations();

    // Complete callback
    if (!isLoading) {
      const timer = setTimeout(() => {
        onAnimationComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />
      
      {/* Main content area with rounded corners */}
      <View style={styles.contentArea}>
        {/* Background rings (subtle circular lines) */}
        <Animated.View style={[styles.ringsContainer, { opacity: ringsOpacity }]}>
          <View style={[styles.ring, styles.ring1]} />
          <View style={[styles.ring, styles.ring2]} />
          <View style={[styles.ring, styles.ring3]} />
        </Animated.View>

        {/* Logo */}
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
            source={require('../../assets/images/megaradio-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      {/* Wave/dots pattern at bottom */}
      <Animated.View
        style={[
          styles.waveContainer,
          {
            opacity: waveOpacity,
            transform: [{ translateY: waveTranslate }],
          },
        ]}
      >
        <Image
          source={require('../../assets/images/splash-wave.png')}
          style={styles.waveImage}
          resizeMode="cover"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    marginHorizontal: 16,
    marginTop: 60,
    marginBottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  ringsContainer: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 65, 153, 0.15)',
  },
  ring1: {
    width: width * 0.5,
    height: width * 0.35,
    borderRadius: width * 0.25,
  },
  ring2: {
    width: width * 0.65,
    height: width * 0.45,
    borderRadius: width * 0.325,
  },
  ring3: {
    width: width * 0.8,
    height: width * 0.55,
    borderRadius: width * 0.4,
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  logo: {
    width: width * 0.6,
    height: width * 0.25,
  },
  waveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.35,
  },
  waveImage: {
    width: '100%',
    height: '100%',
  },
});

export default AnimatedSplash;

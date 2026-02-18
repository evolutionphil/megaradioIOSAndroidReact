// AnimatedSplash - Custom splash screen with MegaRadio branding
// Shows logo with animated sound wave rings and gradient background

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Image, StatusBar, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

interface AnimatedSplashProps {
  onAnimationComplete?: () => void;
  isLoading?: boolean;
}

const AnimatedSplash: React.FC<AnimatedSplashProps> = ({ 
  onAnimationComplete,
  isLoading = true 
}) => {
  // Animation values for sound wave rings
  const ring1Scale = useRef(new Animated.Value(0.8)).current;
  const ring2Scale = useRef(new Animated.Value(0.8)).current;
  const ring3Scale = useRef(new Animated.Value(0.8)).current;
  const ring1Opacity = useRef(new Animated.Value(0.3)).current;
  const ring2Opacity = useRef(new Animated.Value(0.25)).current;
  const ring3Opacity = useRef(new Animated.Value(0.2)).current;
  
  // Logo animation
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  
  // Dots animation
  const dotsOpacity = useRef(new Animated.Value(0)).current;
  const dotsTranslate = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Start animations
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
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Sound wave ring animations (pulsing effect)
      const createRingAnimation = (scaleValue: Animated.Value, opacityValue: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(scaleValue, {
                toValue: 1.2,
                duration: 2000,
                useNativeDriver: true,
              }),
              Animated.timing(opacityValue, {
                toValue: 0.1,
                duration: 2000,
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(scaleValue, {
                toValue: 0.8,
                duration: 2000,
                useNativeDriver: true,
              }),
              Animated.timing(opacityValue, {
                toValue: 0.3,
                duration: 2000,
                useNativeDriver: true,
              }),
            ]),
          ])
        );
      };

      createRingAnimation(ring1Scale, ring1Opacity, 0).start();
      createRingAnimation(ring2Scale, ring2Opacity, 400).start();
      createRingAnimation(ring3Scale, ring3Opacity, 800).start();

      // Dots animation
      Animated.parallel([
        Animated.timing(dotsOpacity, {
          toValue: 0.6,
          duration: 800,
          delay: 300,
          useNativeDriver: true,
        }),
        Animated.timing(dotsTranslate, {
          toValue: 0,
          duration: 800,
          delay: 300,
          useNativeDriver: true,
        }),
      ]).start();
    };

    startAnimations();

    // Complete callback after animations
    if (!isLoading) {
      const timer = setTimeout(() => {
        onAnimationComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Generate dot pattern
  const renderDots = () => {
    const dots = [];
    const dotRows = 12;
    const dotCols = 16;
    
    for (let row = 0; row < dotRows; row++) {
      for (let col = 0; col < dotCols; col++) {
        // Create fading effect from bottom-left
        const distanceFromOrigin = Math.sqrt(Math.pow(row - dotRows, 2) + Math.pow(col, 2));
        const maxDistance = Math.sqrt(Math.pow(dotRows, 2) + Math.pow(dotCols, 2));
        const opacity = Math.max(0, 1 - (distanceFromOrigin / maxDistance) * 1.5);
        
        if (opacity > 0.1) {
          dots.push(
            <View
              key={`dot-${row}-${col}`}
              style={[
                styles.dot,
                {
                  left: col * 20 + 10,
                  bottom: row * 20 + 10,
                  opacity: opacity * 0.8,
                },
              ]}
            />
          );
        }
      }
    }
    return dots;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />
      
      {/* Dark background with gradient effect using View */}
      <View style={styles.background}>
        <View style={styles.gradientOverlay} />
      </View>

      {/* Sound wave rings */}
      <View style={styles.ringsContainer}>
        <Animated.View
          style={[
            styles.ring,
            styles.ring3,
            {
              transform: [{ scale: ring3Scale }],
              opacity: ring3Opacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.ring,
            styles.ring2,
            {
              transform: [{ scale: ring2Scale }],
              opacity: ring2Opacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.ring,
            styles.ring1,
            {
              transform: [{ scale: ring1Scale }],
              opacity: ring1Opacity,
            },
          ]}
        />
      </View>

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{ scale: logoScale }],
            opacity: logoOpacity,
          },
        ]}
      >
        <Image
          source={require('../../assets/images/splash-icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Dot pattern at bottom */}
      <Animated.View
        style={[
          styles.dotsContainer,
          {
            opacity: dotsOpacity,
            transform: [{ translateY: dotsTranslate }],
          },
        ]}
      >
        {renderDots()}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0D0D0D',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.5,
    backgroundColor: 'rgba(255, 65, 153, 0.1)',
  },
  ringsContainer: {
    position: 'absolute',
    width: width,
    height: width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 65, 153, 0.3)',
  },
  ring1: {
    width: width * 0.55,
    height: width * 0.55,
  },
  ring2: {
    width: width * 0.75,
    height: width * 0.75,
  },
  ring3: {
    width: width * 0.95,
    height: width * 0.95,
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  logo: {
    width: width * 0.5,
    height: width * 0.3,
  },
  dotsContainer: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: width * 0.8,
    height: height * 0.3,
  },
  dot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF4199',
  },
});

export default AnimatedSplash;

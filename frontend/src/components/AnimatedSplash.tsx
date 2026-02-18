// AnimatedSplash - MegaRadio branded splash screen
// Exact match to design: dark gradient background, centered logo with rings, pink dots at bottom-left

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
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const ringsOpacity = useRef(new Animated.Value(0)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;
  const dotsTranslateY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Animation sequence
    const startAnimations = () => {
      // Logo fade in and scale
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Rings fade in (slightly delayed)
      Animated.timing(ringsOpacity, {
        toValue: 1,
        duration: 500,
        delay: 300,
        useNativeDriver: true,
      }).start();

      // Dots fade in and slide up
      Animated.parallel([
        Animated.timing(dotsOpacity, {
          toValue: 1,
          duration: 600,
          delay: 400,
          useNativeDriver: true,
        }),
        Animated.timing(dotsTranslateY, {
          toValue: 0,
          duration: 600,
          delay: 400,
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

  // Generate dotted pattern for bottom-left corner
  const renderDots = () => {
    const dots = [];
    const rows = 20;
    const cols = 12;
    const baseSize = 3;
    const spacing = 14;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Calculate distance from bottom-left corner
        const distFromCorner = Math.sqrt(Math.pow(rows - row, 2) + Math.pow(col, 2));
        const maxDist = Math.sqrt(Math.pow(rows, 2) + Math.pow(cols, 2));
        
        // Opacity fades as we move away from corner
        const dotOpacity = Math.max(0, 1 - (distFromCorner / maxDist) * 1.3);
        
        // Size gets smaller as we move away
        const dotSize = baseSize * (1 - (distFromCorner / maxDist) * 0.5);
        
        if (dotOpacity > 0.1) {
          dots.push(
            <View
              key={`dot-${row}-${col}`}
              style={{
                position: 'absolute',
                left: col * spacing,
                bottom: row * spacing,
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: '#FF4199',
                opacity: dotOpacity * 0.9,
              }}
            />
          );
        }
      }
    }
    return dots;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      
      {/* Dark gradient background */}
      <View style={styles.backgroundGradient}>
        {/* Top area - pure dark */}
        <View style={styles.backgroundTop} />
        {/* Bottom area - magenta tint */}
        <View style={styles.backgroundBottom} />
      </View>

      {/* Concentric rings around logo */}
      <Animated.View style={[styles.ringsContainer, { opacity: ringsOpacity }]}>
        <View style={[styles.ring, styles.ring1]} />
        <View style={[styles.ring, styles.ring2]} />
        <View style={[styles.ring, styles.ring3]} />
        <View style={[styles.ring, styles.ring4]} />
      </Animated.View>

      {/* Logo - centered */}
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

      {/* Dotted pattern - bottom left corner */}
      <Animated.View
        style={[
          styles.dotsContainer,
          {
            opacity: dotsOpacity,
            transform: [{ translateY: dotsTranslateY }],
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
    backgroundColor: '#0A0A0A',
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundTop: {
    flex: 0.65,
    backgroundColor: '#0D0D0D',
  },
  backgroundBottom: {
    flex: 0.35,
    backgroundColor: '#150A12', // Dark magenta tint
  },
  ringsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255, 65, 153, 0.12)',
  },
  ring1: {
    width: width * 0.45,
    height: width * 0.25,
    borderRadius: width * 0.225,
  },
  ring2: {
    width: width * 0.6,
    height: width * 0.35,
    borderRadius: width * 0.3,
  },
  ring3: {
    width: width * 0.75,
    height: width * 0.45,
    borderRadius: width * 0.375,
  },
  ring4: {
    width: width * 0.9,
    height: width * 0.55,
    borderRadius: width * 0.45,
  },
  logoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: width * 0.5,
    height: width * 0.2,
  },
  dotsContainer: {
    position: 'absolute',
    left: 20,
    bottom: 40,
    width: width * 0.5,
    height: height * 0.4,
  },
});

export default AnimatedSplash;

// Splash Screen - Simple, static, no animations
// Black background, logo+waves centered, dots bottom-left flush with screen edge

import React from 'react';
import { View, Image, StyleSheet, StatusBar, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface SplashProps {
  onAnimationComplete?: () => void;
  isLoading?: boolean;
}

const AnimatedSplash: React.FC<SplashProps> = ({ onAnimationComplete, isLoading = true }) => {
  // Auto-complete after 2 seconds if not loading
  React.useEffect(() => {
    if (!isLoading && onAnimationComplete) {
      const timer = setTimeout(onAnimationComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, onAnimationComplete]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Logo + Waves - Center */}
      <Image
        source={require('../../assets/images/splash-logo-waves.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      
      {/* Dots - Bottom Left - Cropped to actual content */}
      <Image
        source={require('../../assets/images/splash-dots-cropped.png')}
        style={styles.dots}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
    overflow: 'hidden',
  },
  logo: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: width * 0.65,
    height: width * 0.65,
    transform: [
      { translateX: -(width * 0.65) / 2 },
      { translateY: -(width * 0.65) / 2 },
    ],
  },
  dots: {
    position: 'absolute',
    left: -10, // Push slightly left to compensate for image padding
    bottom: -10, // Push slightly down 
    width: width * 1.1,
    height: width * 1.1 * (320 / 330),
  },
});

export default AnimatedSplash;

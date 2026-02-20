// Splash Screen - Single full-screen image matching the Figma design
// Uses the exact user-provided splash screen image

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
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" translucent />
      
      {/* Single full-screen splash image - exact match to user's design */}
      <Image
        source={require('../../assets/images/splash-full.png')}
        style={styles.splashImage}
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  splashImage: {
    width: width,
    height: height,
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

export default AnimatedSplash;

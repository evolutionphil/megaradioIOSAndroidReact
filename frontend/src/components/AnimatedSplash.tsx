// Splash Screen - Using full background image with centered logo
// No animations, simple and reliable

import React from 'react';
import { View, Image, StyleSheet, StatusBar, Dimensions, ImageBackground, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface SplashProps {
  onAnimationComplete?: () => void;
  isLoading?: boolean;
}

const AnimatedSplash: React.FC<SplashProps> = ({ onAnimationComplete, isLoading = true }) => {
  const insets = useSafeAreaInsets();
  
  // Auto-complete after 2 seconds if not loading
  React.useEffect(() => {
    if (!isLoading && onAnimationComplete) {
      const timer = setTimeout(onAnimationComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, onAnimationComplete]);

  return (
    <View style={[styles.container, { paddingBottom: Platform.OS === 'android' ? insets.bottom : 0 }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />
      
      {/* Full screen background with dots/gradient */}
      <ImageBackground
        source={require('../../assets/images/splash-full.png')}
        style={styles.background}
        resizeMode="cover"
      >
        {/* Logo centered on top */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/splash-logo-waves.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: width * 0.65,
    height: width * 0.65,
  },
});

export default AnimatedSplash;

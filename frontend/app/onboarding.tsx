import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Asset } from 'expo-asset';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// Assets
const GIRL_IMAGE = require('../assets/images/onboarding/girl.png');
const BOY_SCREEN2_IMAGE = require('../assets/images/onboarding/boy-screen2.png');
const BOY_SCREEN3_IMAGE = require('../assets/images/onboarding/boy-screen3.png');
const NEXT_BUTTON = require('../assets/images/onboarding/next-button.png');

// Preload all onboarding images at module load
const preloadImages = async () => {
  try {
    await Asset.loadAsync([GIRL_IMAGE, BOY_SCREEN2_IMAGE, BOY_SCREEN3_IMAGE, NEXT_BUTTON]);
    console.log('[Onboarding] All images preloaded');
  } catch (e) {
    console.log('[Onboarding] Image preload error:', e);
  }
};
preloadImages();

// Onboarding data for 3 screens
const ONBOARDING_DATA = [
  {
    id: '1',
    title: 'Enjoy',
    subtitle: 'More than 10 thousand radio channels',
    image: GIRL_IMAGE,
    isLast: false,
  },
  {
    id: '2',
    title: 'Anywhere',
    subtitle: 'Listen to the music you want anywhere',
    image: BOY_SCREEN2_IMAGE,
    isLast: false,
  },
  {
    id: '3',
    title: 'Free',
    subtitle: 'MegaRadio is always free',
    image: BOY_SCREEN3_IMAGE,
    isLast: true,
  },
];

const ONBOARDING_COMPLETE_KEY = '@megaradio_onboarding_complete';

// Storage helper for cross-platform support
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
      } catch {
        // ignore
      }
      return;
    }
    return AsyncStorage.setItem(key, value);
  },
};

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isChecking, setIsChecking] = useState(true);
  const currentItem = ONBOARDING_DATA[currentIndex];
  const insets = useSafeAreaInsets();
  
  // Check if onboarding is already complete - redirect if so
  useEffect(() => {
    const checkStatus = async () => {
      const complete = await checkOnboardingComplete();
      console.log('[Onboarding] Checking status:', complete);
      if (complete) {
        console.log('[Onboarding] Already complete, redirecting to home');
        router.replace('/(tabs)');
      } else {
        setIsChecking(false);
      }
    };
    checkStatus();
  }, []);
  
  // Glow animation for next button
  const glowScale = useSharedValue(1);
  
  useEffect(() => {
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1200 }),
        withTiming(1, { duration: 1200 })
      ),
      -1,
      true
    );
  }, []);

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: interpolate(glowScale.value, [1, 1.15], [0.6, 0.9], Extrapolation.CLAMP),
  }));

  const animateToNext = (newIndex: number) => {
    // Animasyon olmadan direkt geçiş
    setCurrentIndex(newIndex);
  };

  const handleNext = async () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      animateToNext(currentIndex + 1);
    } else {
      await completeOnboarding();
    }
  };

  const handleSkip = async () => {
    await completeOnboarding();
  };

  const completeOnboarding = async () => {
    try {
      await storage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
    router.replace('/(tabs)');
  };

  // Don't render anything while checking onboarding status
  if (isChecking) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Full screen background image - no animation */}
      <View style={styles.imageContainer}>
        <Image 
          source={currentItem.image} 
          style={styles.backgroundImage} 
          resizeMode="cover" 
        />
      </View>
      
      {/* Skip button - positioned at top right */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}
        activeOpacity={0.7}
        data-testid="onboarding-skip-btn"
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Gradient overlay at bottom */}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0)', '#000000']}
        locations={[0, 0.2942]}
        style={styles.gradientOverlay}
      >
        {/* Content section - no animation */}
        <View style={styles.contentSection}>
          {/* Title */}
          <Text style={styles.title}>{currentItem.title}</Text>
          
          {/* Subtitle */}
          <Text style={styles.subtitle}>{currentItem.subtitle}</Text>
          
          {/* Pagination Dots */}
          <View style={styles.dotsContainer}>
            {ONBOARDING_DATA.map((_, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  i === currentIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          {/* Button */}
          <View style={styles.buttonWrapper}>
            {currentItem.isLast ? (
              <TouchableOpacity
                style={styles.getStartedButton}
                onPress={handleNext}
                activeOpacity={0.8}
                data-testid="onboarding-getstarted-btn"
              >
                <Text style={styles.getStartedText}>Get Started</Text>
              </TouchableOpacity>
            ) : (
              <>
                <Animated.View style={[styles.buttonGlow, glowAnimatedStyle]} />
                <TouchableOpacity
                  style={styles.nextButton}
                  onPress={handleNext}
                  activeOpacity={0.8}
                  data-testid="onboarding-next-btn"
                >
                  <Image source={NEXT_BUTTON} style={styles.nextButtonImage} resizeMode="contain" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

// Check if onboarding has been completed
export const checkOnboardingComplete = async (): Promise<boolean> => {
  try {
    const value = await storage.getItem(ONBOARDING_COMPLETE_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error reading onboarding status:', error);
    return false;
  }
};

// Reset onboarding (for testing)
export const resetOnboarding = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(ONBOARDING_COMPLETE_KEY);
    } else {
      await AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY);
    }
  } catch (error) {
    console.error('Error resetting onboarding:', error);
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    backgroundColor: 'rgba(80, 80, 80, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    zIndex: 10,
  },
  skipText: {
    fontFamily: 'Ubuntu-Medium',
    color: '#FFFFFF',
    fontSize: 16,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
    justifyContent: 'flex-end',
  },
  contentSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 60 : 40,
  },
  title: {
    fontFamily: 'Ubuntu-Bold',
    fontSize: 36,
    color: '#FF1493',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 36,
  },
  subtitle: {
    fontFamily: 'Ubuntu-Medium',
    fontSize: 15,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 15,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 8,
  },
  dot: {
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    height: 8,
    backgroundColor: '#FF1493',
    borderRadius: 4,
  },
  dotInactive: {
    width: 8,
    height: 8,
    backgroundColor: '#4A4A4A',
    borderRadius: 4,
  },
  buttonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  buttonGlow: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FF1493',
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 25,
    elevation: 20,
  },
  nextButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF1493',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  nextButtonImage: {
    width: 70,
    height: 70,
  },
  getStartedButton: {
    backgroundColor: '#FF1493',
    paddingHorizontal: 60,
    paddingVertical: 18,
    borderRadius: 30,
  },
  getStartedText: {
    fontFamily: 'Ubuntu-Bold',
    color: '#000000',
    fontSize: 18,
  },
});

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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Extrapolation,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// Assets
const GIRL_IMAGE = require('../assets/images/onboarding/girl.png');
const BOY_SCREEN2_IMAGE = require('../assets/images/onboarding/boy-screen2.png');
const BOY_SCREEN3_IMAGE = require('../assets/images/onboarding/boy-screen3.png');
const NEXT_BUTTON = require('../assets/images/onboarding/next-button.png');

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
  const currentItem = ONBOARDING_DATA[currentIndex];
  
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

  const handleNext = async () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      setCurrentIndex(currentIndex + 1);
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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Image section - top half */}
      <View style={styles.imageSection}>
        <Animated.View 
          key={currentItem.id}
          entering={FadeIn.duration(300)}
          style={styles.imageWrapper}
        >
          <Image source={currentItem.image} style={styles.image} resizeMode="cover" />
        </Animated.View>
        
        {/* Skip button */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
          data-testid="onboarding-skip-btn"
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Content section - bottom half */}
      <View style={styles.contentSection}>
        {/* Title */}
        <Text style={styles.title}>{currentItem.title}</Text>
        
        {/* Subtitle */}
        <Text style={styles.subtitle}>{currentItem.subtitle}</Text>
        
        {/* Pagination Dots */}
        <View style={styles.dotsContainer}>
          {ONBOARDING_DATA.map((_, i) => (
            <View
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
  imageSection: {
    height: '50%',
    width: '100%',
    position: 'relative',
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
  },
  image: {
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  contentSection: {
    height: '50%',
    width: '100%',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: 'Ubuntu-BoldItalic',
    fontSize: 42,
    color: '#FF1493',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: '400',
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
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
  },
});

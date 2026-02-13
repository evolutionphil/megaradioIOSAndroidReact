import React, { useCallback, useState, useEffect } from 'react';
import { Stack, router, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../src/constants/theme';
import { RadioErrorModal } from '../src/components/RadioErrorModal';
import { AnimatedSplash } from '../src/components/AnimatedSplash';

// Prevent splash screen from auto-hiding until fonts are loaded
SplashScreen.preventAutoHideAsync().catch(() => {});

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
});

const ONBOARDING_COMPLETE_KEY = '@megaradio_onboarding_complete';

// Storage helper for cross-platform support
const checkOnboardingComplete = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') {
      const value = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
      return value === 'true';
    }
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error checking onboarding:', error);
    return false;
  }
};

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);
  
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  // Load icon fonts by requiring TTF files directly + custom fonts
  const [fontsLoaded, fontError] = useFonts({
    'Ionicons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
    'FontAwesome5_Brands': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Brands.ttf'),
    'FontAwesome5_Regular': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Regular.ttf'),
    'FontAwesome5_Solid': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf'),
    'Ubuntu-Bold': require('../assets/fonts/Ubuntu-Bold.ttf'),
    'Ubuntu-BoldItalic': require('../assets/fonts/Ubuntu-BoldItalic.ttf'),
  });

  // Check if navigation is ready
  useEffect(() => {
    if (navigationState?.key) {
      setIsNavigationReady(true);
    }
  }, [navigationState?.key]);

  // Handle splash screen timeout
  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 2800);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  // Check onboarding status and navigate after splash
  useEffect(() => {
    const checkAndNavigate = async () => {
      if (!showSplash && isNavigationReady && !hasCheckedOnboarding) {
        setHasCheckedOnboarding(true);
        
        const onboardingComplete = await checkOnboardingComplete();
        console.log('[Layout] Onboarding complete:', onboardingComplete);
        
        // Only navigate to onboarding if not completed and not already there
        if (!onboardingComplete && segments[0] !== 'onboarding') {
          console.log('[Layout] Navigating to onboarding...');
          router.replace('/onboarding');
        }
      }
    };

    checkAndNavigate();
  }, [showSplash, isNavigationReady, hasCheckedOnboarding, segments]);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Show animated custom splash screen
  if (showSplash) {
    return <AnimatedSplash onAnimationEnd={() => setShowSplash(false)} />;
  }

  return (
    <GestureHandlerRootView style={styles.container} onLayout={onLayoutRootView}>
      <QueryClientProvider client={queryClient}>
        <View style={styles.container}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen
              name="player"
              options={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen name="search" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
            <Stack.Screen name="statistics" options={{ headerShown: false }} />
            <Stack.Screen name="play-at-login" options={{ headerShown: false }} />
            <Stack.Screen name="followers" options={{ headerShown: false }} />
            <Stack.Screen name="follows" options={{ headerShown: false }} />
            <Stack.Screen name="user-profile" options={{ headerShown: false }} />
            <Stack.Screen name="languages" options={{ headerShown: false }} />
            <Stack.Screen name="auth-options" options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
          </Stack>
          <RadioErrorModal />
        </View>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

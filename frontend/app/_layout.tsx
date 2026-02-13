import React, { useCallback, useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '../src/constants/theme';
import { RadioErrorModal } from '../src/components/RadioErrorModal';
import { AnimatedSplash } from '../src/components/AnimatedSplash';
import { Onboarding, checkOnboardingComplete } from '../src/components/Onboarding';

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

export default function RootLayout() {
  const [appState, setAppState] = useState<'splash' | 'onboarding_check' | 'onboarding' | 'ready'>('splash');
  const [isMounted, setIsMounted] = useState(false);
  
  // Load icon fonts by requiring TTF files directly + custom fonts
  const [fontsLoaded, fontError] = useFonts({
    'Ionicons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
    'FontAwesome5_Brands': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Brands.ttf'),
    'FontAwesome5_Regular': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Regular.ttf'),
    'FontAwesome5_Solid': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf'),
    'Ubuntu-Bold': require('../assets/fonts/Ubuntu-Bold.ttf'),
    'Ubuntu-BoldItalic': require('../assets/fonts/Ubuntu-BoldItalic.ttf'),
  });

  // Mark component as mounted (client-side only)
  useEffect(() => {
    console.log('[Layout] Component mounted');
    setIsMounted(true);
  }, []);

  // Handle app state transitions - start splash timeout once mounted
  useEffect(() => {
    console.log('[Layout] Effect triggered - isMounted:', isMounted, 'appState:', appState, 'fontsLoaded:', fontsLoaded, 'fontError:', fontError);
    
    if (!isMounted) return;
    
    if (appState === 'splash') {
      // Always start splash timeout after mounting, regardless of font status
      console.log('[Layout] Starting splash timeout...');
      const timer = setTimeout(() => {
        console.log('[Layout] Splash timeout finished, moving to onboarding_check');
        setAppState('onboarding_check');
      }, 2800);
      return () => clearTimeout(timer);
    }
  }, [isMounted, appState, fontsLoaded, fontError]);

  // Check onboarding status
  useEffect(() => {
    if (!isMounted) return;
    
    if (appState === 'onboarding_check') {
      console.log('[Layout] Checking onboarding status...');
      checkOnboardingComplete().then((completed) => {
        console.log('[Layout] Onboarding completed:', completed);
        if (completed) {
          setAppState('ready');
        } else {
          setAppState('onboarding');
        }
      }).catch((err) => {
        console.error('[Layout] Error checking onboarding:', err);
        setAppState('onboarding'); // Show onboarding on error
      });
    }
  }, [appState, isMounted]);

  // Font loading check is now optional - app works without fonts loaded
  const fontsReady = fontsLoaded || fontError || isMounted;

  const onLayoutRootView = useCallback(async () => {
    if (fontsReady) {
      await SplashScreen.hideAsync();
    }
  }, [fontsReady]);

  // SSR/Hydration: On server or before hydration, render loading state
  // This prevents hydration mismatch errors
  if (!isMounted) {
    return (
      <View style={[styles.container, styles.loading]}>
        <ActivityIndicator size="large" color="#FF1493" />
      </View>
    );
  }

  // Client-side only: Show splash screen
  if (appState === 'splash') {
    return <AnimatedSplash onAnimationEnd={() => setAppState('onboarding_check')} />;
  }

  // Show onboarding if needed
  if (appState === 'onboarding') {
    return <Onboarding onComplete={() => setAppState('ready')} />;
  }

  // Still checking onboarding status
  if (appState === 'onboarding_check') {
    return (
      <View style={[styles.container, styles.loading]}>
        <ActivityIndicator size="large" color="#FF1493" />
      </View>
    );
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

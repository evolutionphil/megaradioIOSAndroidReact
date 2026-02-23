// LOGGING: Import at very top
import { sendLog } from '../src/services/remoteLog';
sendLog('LAYOUT_FILE_LOADING');

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Stack, router, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, StyleSheet, Platform, AppState, AppStateStatus, Text } from 'react-native';
import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nextProvider } from 'react-i18next';
sendLog('LAYOUT_IMPORTS_1');

import i18n, { initI18n } from '../src/services/i18nService';
import { colors } from '../src/constants/theme';
import { RadioErrorModal } from '../src/components/RadioErrorModal';
import { preloadEssentialData } from '../src/services/preloadService';
import { initializeApp as initializeTvData } from '../src/services/tvInitService';
import { useLocationStore } from '../src/store/locationStore';
import { useLanguageStore } from '../src/store/languageStore';
import { useFavoritesStore } from '../src/store/favoritesStore';
sendLog('LAYOUT_IMPORTS_2');

import { AudioProvider } from '../src/providers/AudioProvider';
import { MiniPlayer } from '../src/components/MiniPlayer';
import { usePlayerStore } from '../src/store/playerStore';
import { PlayAtLoginHandler } from '../src/components/PlayAtLoginHandler';
import { NotificationHandler } from '../src/components/NotificationHandler';
import TrackPlayer from 'react-native-track-player';
sendLog('LAYOUT_ALL_IMPORTS_DONE');

// CarPlay DISABLED - causes crash on Expo production builds
// import { CarPlayHandler } from '../src/components/CarPlayHandler';

sendLog('BEFORE_QUERY_CLIENT');

// Create a client with optimized defaults for performance (based on backend recommendations)
let queryClient: QueryClient;
try {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10 * 60 * 1000, // 10 minutes - default for most data
        gcTime: 30 * 60 * 1000, // 30 minutes - keep unused data in cache
        retry: 2,
        refetchOnWindowFocus: false, // Don't refetch when app comes to foreground
        refetchOnReconnect: true, // Refetch when network reconnects
        refetchOnMount: false, // Don't refetch if data exists in cache
        networkMode: 'offlineFirst', // Use cached data first, then fetch
      },
    },
  });
  sendLog('QUERY_CLIENT_CREATED');
} catch (e: any) {
  sendLog('QUERY_CLIENT_ERROR', { error: e?.message || String(e) });
  // Create minimal client as fallback
  queryClient = new QueryClient();
}

const ONBOARDING_COMPLETE_KEY = '@megaradio_onboarding_complete';

sendLog('BEFORE_HELPER_FUNCTIONS');

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

sendLog('BEFORE_ROOT_LAYOUT_DEFINITION');

// Global MiniPlayer wrapper - MOVED INSIDE to avoid module-level hook issues
const GlobalMiniPlayer = React.memo(() => {
  const segments = useSegments();
  const { isMiniPlayerVisible } = usePlayerStore();
  const insets = useSafeAreaInsets();
  
  // Don't show on tabs (they have their own MiniPlayer), player screen, or auth screens
  const isTabScreen = segments[0] === '(tabs)';
  const isPlayerScreen = segments.includes('player');
  const isAuthScreen = ['login', 'signup', 'auth-options', 'onboarding'].includes(segments[0] as string);
  
  if (isTabScreen || isPlayerScreen || isAuthScreen || !isMiniPlayerVisible) {
    return null;
  }
  
  // For non-tab screens, show MiniPlayer above the safe area bottom
  return <MiniPlayer isGlobal={true} />;
});

export default function RootLayout() {
  sendLog('ROOT_LAYOUT_FUNCTION_START');
  
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);
  const [i18nReady, setI18nReady] = useState(false);
  const preloadStarted = useRef(false);
  
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  // Log on first render
  useEffect(() => {
    sendLog('ROOT_LAYOUT_MOUNTED');
  }, []);

  // Load icon fonts by requiring TTF files directly + custom fonts
  const [fontsLoaded, fontError] = useFonts({
    'Ionicons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
    'FontAwesome5_Brands': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Brands.ttf'),
    'FontAwesome5_Regular': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Regular.ttf'),
    'FontAwesome5_Solid': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf'),
    'Ubuntu-Regular': require('../assets/fonts/Ubuntu-Regular.ttf'),
    'Ubuntu-Medium': require('../assets/fonts/Ubuntu-Medium.ttf'),
    'Ubuntu-Bold': require('../assets/fonts/Ubuntu-Bold.ttf'),
    'Ubuntu-BoldItalic': require('../assets/fonts/Ubuntu-BoldItalic.ttf'),
  });

  // Initialize i18n
  useEffect(() => {
    const init = async () => {
      try {
        await initI18n();
        setI18nReady(true);
      } catch (error) {
        console.error('Failed to initialize i18n:', error);
        setI18nReady(true); // Continue anyway
      }
    };
    init();
  }, []);

  // Setup Track Player once (only on native platforms, not web, and don't block UI)
  useEffect(() => {
    if (Platform.OS === 'web') {
      console.log('[Layout] Web platform - skipping Track Player setup');
      return;
    }

    let mounted = true;
    
    const setupPlayer = async () => {
      try {
        // Check if already initialized
        const currentState = await TrackPlayer.getPlaybackState().catch(() => null);
        
        if (currentState) {
          console.log('[Layout] Track Player already initialized');
          return;
        }
        
        await TrackPlayer.setupPlayer();
        console.log('[Layout] Track Player setup complete');
        
        // Setup capabilities
        await TrackPlayer.updateOptions({
          capabilities: [
            TrackPlayer.CAPABILITY_PLAY,
            TrackPlayer.CAPABILITY_PAUSE,
            TrackPlayer.CAPABILITY_STOP,
            TrackPlayer.CAPABILITY_SKIP_TO_NEXT,
            TrackPlayer.CAPABILITY_SKIP_TO_PREVIOUS,
          ],
          compactCapabilities: [
            TrackPlayer.CAPABILITY_PLAY,
            TrackPlayer.CAPABILITY_PAUSE,
          ],
        });
      } catch (error: any) {
        // Only log if not already initialized error
        if (!error?.message?.includes('already been initialized')) {
          console.error('[Layout] Track Player setup error:', error);
        }
      }
    };

    setupPlayer();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Preload TV data if on TV platform
  useEffect(() => {
    const preloadTV = async () => {
      if (Platform.isTV && !preloadStarted.current) {
        preloadStarted.current = true;
        try {
          console.log('[Layout] Preloading TV data...');
          await initializeTvData();
          console.log('[Layout] TV init complete');
        } catch (error) {
          console.error('[Layout] TV init error:', error);
        }
      }
    };
    preloadTV();
  }, []);

  // Preload essential data in background
  useEffect(() => {
    if (!preloadStarted.current && !Platform.isTV) {
      preloadStarted.current = true;
      preloadEssentialData().catch(console.error);
    }
  }, []);

  // App state listener for background/foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('[Layout] App came to foreground');
      } else if (nextAppState === 'background') {
        console.log('[Layout] App went to background');
      }
    };

    // This runs when the component unmounts - remove the listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, []);

  // Check if navigation is ready
  useEffect(() => {
    if (navigationState?.key) {
      setIsNavigationReady(true);
    }
  }, [navigationState?.key]);

  // Handle routing based on onboarding status (after navigation is ready)
  useEffect(() => {
    const checkAndRoute = async () => {
      if (!isNavigationReady || hasCheckedOnboarding) return;
      
      try {
        const onboardingComplete = await checkOnboardingComplete();
        setHasCheckedOnboarding(true);
        
        // Don't redirect if user is navigating to a specific route
        if (segments.length > 0 && !['(tabs)', 'onboarding'].includes(segments[0] as string)) {
          return;
        }
        
        if (onboardingComplete) {
          console.log('[Layout] Onboarding complete, going to home...');
          router.replace('/(tabs)');
        } else {
          console.log('[Layout] Going to onboarding...');
          router.replace('/onboarding');
        }
        
        // Initialize language from store
        const { currentLanguage } = useLanguageStore.getState();
        if (currentLanguage) {
          i18n.changeLanguage(currentLanguage);
        }
      } catch (error) {
        console.error('Error during routing:', error);
        setHasCheckedOnboarding(true);
        router.replace('/onboarding');
      }
    };

    checkAndRoute();
  }, [isNavigationReady, hasCheckedOnboarding, segments]);

  const onLayoutRootView = useCallback(async () => {
    // Fonts loaded - app is ready
    if (fontsLoaded || fontError) {
      console.log('[Layout] Fonts loaded, app ready');
      sendLog('FONTS_LOADED', { fontsLoaded, fontError: fontError?.message });
    }
  }, [fontsLoaded, fontError]);

  sendLog('ROOT_LAYOUT_RENDER_START');

  return (
    <GestureHandlerRootView style={styles.container} onLayout={onLayoutRootView}>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <AudioProvider>
            <PlayAtLoginHandler />
            <NotificationHandler />
            {/* CarPlay DISABLED - causes crash due to SceneDelegate issue */}
            {/* <CarPlayHandler /> */}
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
                <Stack.Screen name="auth-options" options={{ headerShown: false }} />
                <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
                <Stack.Screen name="genres" options={{ headerShown: false }} />
                <Stack.Screen name="genre-detail" options={{ headerShown: false }} />
                <Stack.Screen name="all-stations" options={{ headerShown: false }} />
                <Stack.Screen name="notifications" options={{ headerShown: false }} />
                <Stack.Screen name="users" options={{ headerShown: false }} />
                <Stack.Screen name="public-profiles" options={{ headerShown: false }} />
              </Stack>
              {/* Global MiniPlayer - shown on all screens except player */}
              <GlobalMiniPlayer />
              <RadioErrorModal />
            </View>
          </AudioProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

import React, { useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useFonts } from 'expo-font';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '../src/constants/theme';
import { RadioErrorModal } from '../src/components/RadioErrorModal';

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
  // Explicitly load ALL icon fonts + custom fonts
  const [fontsLoaded, fontError] = useFonts({
    // Vector icon fonts - MUST be preloaded for Expo Go
    ...Ionicons.font,
    ...FontAwesome5.font,
    // Custom app fonts
    'Ubuntu-Bold': require('../assets/fonts/Ubuntu-Bold.ttf'),
    'Ubuntu-BoldItalic': require('../assets/fonts/Ubuntu-BoldItalic.ttf'),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Show loading screen while fonts are loading
  if (!fontsLoaded && !fontError) {
    return (
      <View style={[styles.container, styles.loading]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
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

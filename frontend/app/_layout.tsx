// MINIMAL TEST LAYOUT - to debug black screen issue
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  // MINIMAL: Just render a simple screen to test if JS bundle loads
  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.testScreen}>
        <Text style={styles.title}>MegaRadio Test</Text>
        <Text style={styles.subtitle}>Eğer bunu görüyorsanız JS yüklendi!</Text>
        <Text style={styles.version}>Build: TEST-001</Text>
      </View>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  testScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    zIndex: 9999,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF4199',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  version: {
    fontSize: 14,
    color: '#888888',
  },
});

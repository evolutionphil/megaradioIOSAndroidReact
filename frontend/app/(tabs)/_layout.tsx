import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { colors, typography } from '../../src/constants/theme';
import { MiniPlayer } from '../../src/components/MiniPlayer';
import { usePlayerStore } from '../../src/store/playerStore';
import {
  DiscoverIcon,
  FavoritesIcon,
  ProfileIcon,
  RecordsIcon,
} from '../../src/components/TabBarIcons';

// Tab bar height constant for MiniPlayer positioning
export const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 85 : 65;

export default function TabLayout() {
  const { isMiniPlayerVisible, currentStation } = usePlayerStore();
  const showMiniPlayer = isMiniPlayerVisible && currentStation;

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: [
            styles.tabBar,
            showMiniPlayer && styles.tabBarWithPlayer,
          ],
          tabBarActiveTintColor: '#FFFFFF',
          tabBarInactiveTintColor: '#FFFFFF',
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        {/* Discover - Main/Home tab renamed to Discover */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'Discover',
            tabBarIcon: ({ color }) => (
              <DiscoverIcon color={color} size={28} />
            ),
          }}
        />
        <Tabs.Screen
          name="discover"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="favorites"
          options={{
            title: 'Favorites',
            tabBarIcon: ({ color, focused }) => (
              <FavoritesIcon color={color} size={28} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => (
              <ProfileIcon color={color} size={28} />
            ),
          }}
        />
      </Tabs>
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    backgroundColor: '#1B1C1E',
    borderTopWidth: 0,
    height: TAB_BAR_HEIGHT,
    paddingBottom: Platform.OS === 'ios' ? 25 : 8,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  tabBarWithPlayer: {
    // No change needed, MiniPlayer sits above
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 4,
  },
});

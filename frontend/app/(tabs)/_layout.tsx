import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, borderRadius, spacing } from '../../src/constants/theme';
import { MiniPlayer } from '../../src/components/MiniPlayer';

export default function TabLayout() {
  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.tabBarInactive,
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarIconStyle: styles.tabBarIcon,
          tabBarItemStyle: styles.tabBarItem,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
                <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="discover"
          options={{
            title: 'Discover',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
                <Ionicons name={focused ? 'compass' : 'compass-outline'} size={22} color={color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="favorites"
          options={{
            title: 'Favorites',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
                <Ionicons name={focused ? 'heart' : 'heart-outline'} size={22} color={color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
                <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
              </View>
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
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    paddingTop: 10,
    paddingHorizontal: spacing.sm,
  },
  tabBarLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    marginTop: 4,
  },
  tabBarIcon: {
    marginBottom: -2,
  },
  tabBarItem: {
    paddingVertical: 4,
  },
  iconWrapper: {
    width: 40,
    height: 32,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapperActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
});

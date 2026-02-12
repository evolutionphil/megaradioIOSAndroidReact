import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, Image } from 'react-native';
import { colors } from '../../src/constants/theme';
import { MiniPlayer } from '../../src/components/MiniPlayer';
import { usePlayerStore } from '../../src/store/playerStore';

// Tab bar height constant for MiniPlayer positioning
export const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 85 : 65;

// Tab icon URLs from uploaded images
const TAB_ICONS = {
  discover: 'https://customer-assets.emergentagent.com/job_66205e02-6e8b-4c16-91b2-a96ddee62261/artifacts/u83nevfq_image.png',
  favorites: 'https://customer-assets.emergentagent.com/job_66205e02-6e8b-4c16-91b2-a96ddee62261/artifacts/xf8ejdrl_image.png',
  profile: 'https://customer-assets.emergentagent.com/job_66205e02-6e8b-4c16-91b2-a96ddee62261/artifacts/dr5dt9ku_image.png',
  records: 'https://customer-assets.emergentagent.com/job_66205e02-6e8b-4c16-91b2-a96ddee62261/artifacts/620zikih_image.png',
};

// Tab icon component
const TabIcon = ({ iconUrl, size = 24 }: { iconUrl: string; size?: number }) => (
  <Image
    source={{ uri: iconUrl }}
    style={{ width: size, height: size, tintColor: '#FFFFFF' }}
    resizeMode="contain"
  />
);

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
          tabBarInactiveTintColor: '#888888',
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarShowLabel: true,
        }}
      >
        {/* Discover - Main/Home tab */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'Discover',
            tabBarIcon: () => <TabIcon iconUrl={TAB_ICONS.discover} size={28} />,
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
            tabBarIcon: () => <TabIcon iconUrl={TAB_ICONS.favorites} size={24} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: () => <TabIcon iconUrl={TAB_ICONS.profile} size={28} />,
          }}
        />
        <Tabs.Screen
          name="records"
          options={{
            title: 'Records',
            tabBarIcon: () => <TabIcon iconUrl={TAB_ICONS.records} size={28} />,
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
    paddingTop: 8,
    paddingHorizontal: 10,
  },
  tabBarWithPlayer: {
    // No change needed, MiniPlayer sits above
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
});

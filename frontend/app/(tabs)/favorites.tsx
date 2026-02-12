import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, gradients, spacing, borderRadius, typography } from '../../src/constants/theme';
import { StationCard } from '../../src/components/StationCard';
import { useFavorites } from '../../src/hooks/useQueries';
import { useAudioPlayer } from '../../src/hooks/useAudioPlayer';
import { usePlayerStore } from '../../src/store/playerStore';
import { useAuthStore } from '../../src/store/authStore';
import type { Station } from '../../src/types';

export default function FavoritesScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { isAuthenticated } = useAuthStore();
  const { data: favoritesData, isLoading, refetch, error } = useFavorites();
  
  const { playStation } = useAudioPlayer();
  const { currentStation, playbackState } = usePlayerStore();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleStationPress = (station: Station) => {
    playStation(station);
  };

  const handleLoginPress = () => {
    router.push('/login');
  };

  const isStationPlaying = (station: Station) => {
    return currentStation?._id === station._id && playbackState === 'playing';
  };

  const isStationLoading = (station: Station) => {
    return currentStation?._id === station._id &&
      (playbackState === 'loading' || playbackState === 'buffering');
  };

  const favorites = favoritesData?.favorites || [];

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <LinearGradient colors={gradients.background} style={styles.gradient}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.title}>Favorites</Text>
          </View>
          <View style={styles.loginPrompt}>
            <Ionicons name="heart" size={64} color={colors.primary} />
            <Text style={styles.loginTitle}>Save Your Favorites</Text>
            <Text style={styles.loginText}>
              Sign in to save your favorite stations and access them anywhere
            </Text>
            <TouchableOpacity style={styles.loginButton} onPress={handleLoginPress}>
              <Text style={styles.loginButtonText}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.signupLink} 
              onPress={() => router.push('/signup')}
            >
              <Text style={styles.signupLinkText}>
                Don't have an account? <Text style={styles.signupLinkBold}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={gradients.background} style={styles.gradient}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Favorites</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{favorites.length}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : favorites.length > 0 ? (
            <View style={styles.stationsList}>
              {favorites.map((station) => (
                <StationCard
                  key={station._id}
                  station={station}
                  onPress={handleStationPress}
                  isPlaying={isStationPlaying(station)}
                  isLoading={isStationLoading(station)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="heart-outline" size={80} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Favorites Yet</Text>
              <Text style={styles.emptyText}>
                Start exploring and tap the heart icon to save your favorite stations
              </Text>
              <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => router.push('/discover')}
              >
                <Text style={styles.exploreButtonText}>Explore Stations</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  badge: {
    marginLeft: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 28,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 150,
  },
  stationsList: {
    paddingHorizontal: spacing.md,
  },
  loader: {
    paddingVertical: spacing.xxl,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl * 2,
  },
  emptyTitle: {
    marginTop: spacing.lg,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  exploreButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  exploreButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  loginPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  loginTitle: {
    marginTop: spacing.lg,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  loginText: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  loginButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    width: '100%',
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  signupLink: {
    marginTop: spacing.md,
  },
  signupLinkText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  signupLinkBold: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
});

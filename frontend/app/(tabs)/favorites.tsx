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
import { colors, gradients, spacing, borderRadius, typography, shadows } from '../../src/constants/theme';
import { StationCard, SectionHeader } from '../../src/components';
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
      <LinearGradient colors={gradients.background as any} style={styles.gradient}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.title}>Favorites</Text>
          </View>
          <View style={styles.loginPrompt}>
            <View style={styles.loginIconContainer}>
              <LinearGradient
                colors={[colors.primary, colors.accent] as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.loginIconGradient}
              >
                <Ionicons name="heart" size={48} color={colors.text} />
              </LinearGradient>
            </View>
            <Text style={styles.loginTitle}>Save Your Favorites</Text>
            <Text style={styles.loginText}>
              Sign in to save your favorite stations and access them anywhere on any device
            </Text>
            <TouchableOpacity style={styles.loginButton} onPress={handleLoginPress}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark] as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButtonGradient}
              >
                <Text style={styles.loginButtonText}>Sign In</Text>
              </LinearGradient>
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
    <LinearGradient colors={gradients.background as any} style={styles.gradient}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Favorites</Text>
            <Text style={styles.subtitle}>{favorites.length} saved stations</Text>
          </View>
          {favorites.length > 0 && (
            <TouchableOpacity style={styles.shuffleButton}>
              <Ionicons name="shuffle" size={20} color={colors.text} />
            </TouchableOpacity>
          )}
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
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
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
              <View style={styles.emptyIconContainer}>
                <Ionicons name="heart-outline" size={64} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No Favorites Yet</Text>
              <Text style={styles.emptyText}>
                Start exploring and tap the heart icon to save your favorite stations
              </Text>
              <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => router.push('/discover')}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark] as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.exploreButtonGradient}
                >
                  <Ionicons name="compass" size={18} color={colors.text} />
                  <Text style={styles.exploreButtonText}>Explore Stations</Text>
                </LinearGradient>
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
    justifyContent: 'space-between',
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
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  shuffleButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.glow,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 180,
  },
  stationsList: {
    paddingHorizontal: spacing.md,
  },
  
  // Loader
  loaderContainer: {
    paddingVertical: spacing.xxl * 2,
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl * 2,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  exploreButton: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  exploreButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  exploreButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  
  // Login Prompt
  loginPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  loginIconContainer: {
    marginBottom: spacing.lg,
  },
  loginIconGradient: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  loginText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  loginButton: {
    width: '100%',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  loginButtonGradient: {
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  signupLink: {
    paddingVertical: spacing.sm,
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

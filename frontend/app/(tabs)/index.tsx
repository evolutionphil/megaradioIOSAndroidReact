import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { colors, gradients, spacing, borderRadius, typography, shadows } from '../../src/constants/theme';
import { StationCard } from '../../src/components/StationCard';
import { usePopularStations, usePrecomputedGenres } from '../../src/hooks/useQueries';
import { useAudioPlayer } from '../../src/hooks/useAudioPlayer';
import { usePlayerStore } from '../../src/store/playerStore';
import type { Station, Genre } from '../../src/types';

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  
  const { data: popularData, isLoading: popularLoading, refetch: refetchPopular } = usePopularStations(undefined, 20);
  const { data: genresData, isLoading: genresLoading, refetch: refetchGenres } = usePrecomputedGenres();
  
  const { playStation } = useAudioPlayer();
  const { currentStation, playbackState } = usePlayerStore();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchPopular(), refetchGenres()]);
    setRefreshing(false);
  }, [refetchPopular, refetchGenres]);

  const handleStationPress = (station: Station) => {
    playStation(station);
  };

  const handleGenrePress = (genre: Genre) => {
    router.push(`/discover?genre=${genre.slug}`);
  };

  const handleSearchPress = () => {
    router.push('/search');
  };

  const isStationPlaying = (station: Station) => {
    return currentStation?._id === station._id && playbackState === 'playing';
  };

  const isStationLoading = (station: Station) => {
    return currentStation?._id === station._id && 
           (playbackState === 'loading' || playbackState === 'buffering');
  };

  const genres = genresData?.data?.slice(0, 8) || [];
  const stations = popularData?.stations || [];

  return (
    <LinearGradient colors={gradients.background} style={styles.gradient}>
      <SafeAreaView style={styles.container} edges={['top']}>
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
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Welcome to</Text>
              <Text style={styles.title}>MegaRadio</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.iconButton}>
                <Ionicons name="notifications-outline" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <TouchableOpacity style={styles.searchBar} onPress={handleSearchPress}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <Text style={styles.searchPlaceholder}>Search 40,000+ radio stations...</Text>
          </TouchableOpacity>

          {/* Genres Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Browse Genres</Text>
              <TouchableOpacity onPress={() => router.push('/discover')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            
            {genresLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.genresScroll}
              >
                {genres.map((genre) => (
                  <TouchableOpacity
                    key={genre._id}
                    style={styles.genreCard}
                    onPress={() => handleGenrePress(genre)}
                  >
                    <LinearGradient
                      colors={[colors.primary, colors.accent]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.genreGradient}
                    >
                      <Ionicons name="musical-notes" size={24} color={colors.text} />
                      <Text style={styles.genreName} numberOfLines={1}>
                        {genre.name}
                      </Text>
                      {genre.stationCount && (
                        <Text style={styles.genreCount}>
                          {genre.stationCount} stations
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Popular Stations Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Popular Stations</Text>
              <TouchableOpacity onPress={() => router.push('/discover')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            
            {popularLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
            ) : stations.length > 0 ? (
              <View style={styles.stationsList}>
                {stations.map((station) => (
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
                <Ionicons name="radio-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No stations available</Text>
              </View>
            )}
          </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 150, // Space for mini player and tab bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  greeting: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  title: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  headerRight: {
    flexDirection: 'row',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchPlaceholder: {
    marginLeft: spacing.sm,
    fontSize: typography.sizes.md,
    color: colors.textMuted,
    flex: 1,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  seeAll: {
    fontSize: typography.sizes.md,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  genresScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  genreCard: {
    width: 140,
    height: 100,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  genreGradient: {
    flex: 1,
    padding: spacing.sm,
    justifyContent: 'space-between',
  },
  genreName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  genreCount: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  stationsList: {
    paddingHorizontal: spacing.md,
  },
  loader: {
    paddingVertical: spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.md,
    color: colors.textMuted,
  },
});

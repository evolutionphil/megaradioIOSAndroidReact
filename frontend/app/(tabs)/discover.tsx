import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { GlowEffect } from '../../src/components/GlowEffect';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, gradients, spacing, borderRadius, typography } from '../../src/constants/theme';
import { StationCard, GenreCard, SectionHeader } from '../../src/components';
import { usePrecomputedGenres, useStations } from '../../src/hooks/useQueries';
import { useAudioPlayer } from '../../src/hooks/useAudioPlayer';
import { usePlayerStore } from '../../src/store/playerStore';
import { useLocationStore } from '../../src/store/locationStore';
import type { Station, Genre } from '../../src/types';

export default function DiscoverScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { countryCode } = useLocationStore();

  const { data: genresData, isLoading: genresLoading, refetch: refetchGenres } = usePrecomputedGenres(countryCode || undefined);
  const { data: stationsData, isLoading: stationsLoading, refetch: refetchStations } = useStations({
    sort: 'votes',
    order: 'desc',
    limit: 50,
    country: countryCode || undefined,
  });

  const { playStation } = useAudioPlayer();
  const { currentStation, playbackState } = usePlayerStore();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchGenres(), refetchStations()]);
    setRefreshing(false);
  }, [refetchGenres, refetchStations]);

  const handleStationPress = (station: Station) => {
    playStation(station);
  };

  // Navigate to genre-detail page when genre chip is clicked
  const handleGenreChipPress = (genre: Genre) => {
    router.push({
      pathname: '/genre-detail',
      params: { slug: genre.slug, name: genre.name },
    });
  };

  // Navigate to all-stations page when "All" chip is clicked
  const handleAllPress = () => {
    router.push('/all-stations');
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

  const genres = genresData?.data || [];
  const stations = stationsData?.stations || [];

  return (
    <View style={styles.mainContainer}>
      {/* Background Glow - SVG RadialGradient */}
      <GlowEffect size={430} top={-130} left={-160} opacity={0.35} />
      
      <LinearGradient colors={gradients.background as any} style={styles.gradient}>
        <SafeAreaView style={styles.container} edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Discover</Text>
              <Text style={styles.subtitle}>Explore the world of radio</Text>
            </View>
            <TouchableOpacity style={styles.searchButton} onPress={handleSearchPress}>
              <Ionicons name="search" size={22} color={colors.text} />
            </TouchableOpacity>
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
          {/* Genre Filter Chips - Now navigate to genre-detail */}
          <View style={styles.genreSection}>
            {genresLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.genreChips}
              >
                {/* "All" chip navigates to all-stations page */}
                <TouchableOpacity
                  style={styles.genreChip}
                  onPress={handleAllPress}
                  data-testid="genre-chip-all"
                >
                  <Ionicons 
                    name="radio" 
                    size={16} 
                    color={colors.textSecondary} 
                  />
                  <Text style={styles.genreChipText}>
                    All
                  </Text>
                </TouchableOpacity>
                {/* Genre chips navigate to genre-detail page */}
                {genres.slice(0, 15).map((genre) => (
                  <TouchableOpacity
                    key={genre._id}
                    style={styles.genreChip}
                    onPress={() => handleGenreChipPress(genre)}
                    data-testid={`genre-chip-${genre.slug}`}
                  >
                    <Text style={styles.genreChipText}>
                      {genre.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Browse All Genres */}
          <View style={styles.section}>
            <SectionHeader 
              title="Browse Genres" 
              showSeeAll={true}
              onSeeAll={() => router.push('/genres')}
            />
            <View style={styles.genresGrid}>
              {genres.slice(0, 8).map((genre) => (
                <GenreCard
                  key={genre._id}
                  genre={genre}
                  onPress={(g) => router.push({
                    pathname: '/genre-detail',
                    params: { slug: g.slug, name: g.name },
                  })}
                  size="small"
                  style={styles.genreGridItem}
                />
              ))}
            </View>
          </View>

          {/* Top Stations List */}
          <View style={styles.stationsSection}>
            <SectionHeader 
              title="Top Stations"
              subtitle={`${stations.length} stations`}
              showSeeAll={true}
              onSeeAll={() => router.push('/all-stations')}
            />
            {stationsLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : stations.length > 0 ? (
              <View style={styles.stationsList}>
                {stations.slice(0, 10).map((station) => (
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
                <View style={styles.emptyIcon}>
                  <Ionicons name="radio-outline" size={48} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>No stations found</Text>
                <Text style={styles.emptyText}>Try refreshing the page</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 180,
  },
  
  // Genre Chips
  genreSection: {
    marginBottom: spacing.lg,
  },
  genreChips: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  genreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  genreChipText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  
  // Section
  section: {
    marginBottom: spacing.lg,
  },
  
  // Genres Grid
  genresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  genreGridItem: {
    width: '48%',
    marginBottom: 0,
  },
  
  // Stations
  stationsSection: {
    flex: 1,
  },
  stationsList: {
    paddingHorizontal: spacing.md,
  },
  
  // Loader
  loader: {
    paddingVertical: spacing.xl,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

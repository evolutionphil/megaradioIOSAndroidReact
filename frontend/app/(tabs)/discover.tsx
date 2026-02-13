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
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { GlowEffect } from '../../src/components/GlowEffect';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, gradients, spacing, borderRadius, typography } from '../../src/constants/theme';
import { StationCard, GenreCard, SectionHeader } from '../../src/components';
import { usePrecomputedGenres, useStations } from '../../src/hooks/useQueries';
import { useAudioPlayer } from '../../src/hooks/useAudioPlayer';
import { usePlayerStore } from '../../src/store/playerStore';
import { useLocationStore } from '../../src/store/locationStore';
import type { Station, Genre } from '../../src/types';

export default function DiscoverScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(params.genre as string || null);
  const { countryCode } = useLocationStore();

  const { data: genresData, isLoading: genresLoading, refetch: refetchGenres } = usePrecomputedGenres(countryCode || undefined);
  const { data: stationsData, isLoading: stationsLoading, refetch: refetchStations } = useStations({
    sort: 'votes',
    order: 'desc',
    limit: 50,
    genre: selectedGenre || undefined,
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

  const handleGenreSelect = (genre: Genre | null) => {
    setSelectedGenre(genre?.slug || null);
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
          {/* Genre Filter Section */}
          <View style={styles.genreSection}>
            {genresLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.genreChips}
              >
                <TouchableOpacity
                  style={[
                    styles.genreChip,
                    !selectedGenre && styles.genreChipActive,
                  ]}
                  onPress={() => handleGenreSelect(null)}
                >
                  <Ionicons 
                    name="radio" 
                    size={16} 
                    color={!selectedGenre ? colors.text : colors.textSecondary} 
                  />
                  <Text
                    style={[
                      styles.genreChipText,
                      !selectedGenre && styles.genreChipTextActive,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {genres.slice(0, 15).map((genre) => (
                  <TouchableOpacity
                    key={genre._id}
                    style={[
                      styles.genreChip,
                      selectedGenre === genre.slug && styles.genreChipActive,
                    ]}
                    onPress={() => handleGenreSelect(genre)}
                  >
                    <Text
                      style={[
                        styles.genreChipText,
                        selectedGenre === genre.slug && styles.genreChipTextActive,
                      ]}
                    >
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
              showSeeAll={false}
            />
            <View style={styles.genresGrid}>
              {genres.slice(0, 8).map((genre) => (
                <GenreCard
                  key={genre._id}
                  genre={genre}
                  onPress={(g) => handleGenreSelect(g)}
                  size="small"
                  style={styles.genreGridItem}
                />
              ))}
            </View>
          </View>

          {/* Stations List */}
          <View style={styles.stationsSection}>
            <SectionHeader 
              title={selectedGenre ? `${selectedGenre.charAt(0).toUpperCase() + selectedGenre.slice(1)} Stations` : 'Top Stations'}
              subtitle={`${stations.length} stations`}
              showSeeAll={false}
            />
            {stationsLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : stations.length > 0 ? (
              <View style={styles.stationsList}>
                {stations.slice(0, 30).map((station) => (
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
                <Text style={styles.emptyText}>Try selecting a different genre</Text>
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
  // Background Glow - larger container allows blur edges to be soft
  bgGlowContainer: {
    position: 'absolute',
    top: -230,
    left: -260,
    width: 630,
    height: 630,
    zIndex: 0,
    borderRadius: 315,
    overflow: 'hidden',
  },
  bgGlowColor: {
    position: 'absolute',
    top: 100,
    left: 100,
    width: 430,
    height: 430,
    backgroundColor: 'rgba(120, 60, 255, 0.30)',
    borderRadius: 215,
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
  genreChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genreChipText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  genreChipTextActive: {
    color: colors.text,
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

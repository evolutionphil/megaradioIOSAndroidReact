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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, gradients, spacing, borderRadius, typography } from '../../src/constants/theme';
import { StationCard } from '../../src/components/StationCard';
import { usePrecomputedGenres, useStations } from '../../src/hooks/useQueries';
import { useAudioPlayer } from '../../src/hooks/useAudioPlayer';
import { usePlayerStore } from '../../src/store/playerStore';
import type { Station, Genre } from '../../src/types';

export default function DiscoverScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(params.genre as string || null);

  const { data: genresData, isLoading: genresLoading, refetch: refetchGenres } = usePrecomputedGenres();
  // Use stations API with vote sorting for discovery
  const { data: stationsData, isLoading: stationsLoading, refetch: refetchStations } = useStations({
    sort: 'votes',
    order: 'desc',
    limit: 50,
    genre: selectedGenre || undefined,
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
    <LinearGradient colors={gradients.background} style={styles.gradient}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Discover</Text>
          <TouchableOpacity style={styles.searchButton} onPress={handleSearchPress}>
            <Ionicons name="search" size={24} color={colors.text} />
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
          {/* Genre Chips */}
          <View style={styles.genreSection}>
            <Text style={styles.sectionTitle}>Genres</Text>
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

          {/* Top 100 Stations */}
          <View style={styles.stationsSection}>
            <Text style={styles.sectionTitle}>
              {selectedGenre ? `${selectedGenre} Stations` : 'Top 100 Stations'}
            </Text>
            {stationsLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : filteredStations.length > 0 ? (
              <View style={styles.stationsList}>
                {filteredStations.slice(0, 50).map((station) => (
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
                <Text style={styles.emptyText}>No stations found</Text>
                <Text style={styles.emptySubtext}>Try selecting a different genre</Text>
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
    paddingBottom: 150,
  },
  genreSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  genreChips: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  genreChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
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
  stationsSection: {
    flex: 1,
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
    fontSize: typography.sizes.lg,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  emptySubtext: {
    marginTop: spacing.xs,
    fontSize: typography.sizes.md,
    color: colors.textMuted,
  },
});

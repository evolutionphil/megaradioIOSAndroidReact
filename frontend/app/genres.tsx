import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, gradients, spacing, borderRadius, typography } from '../src/constants/theme';
import { usePrecomputedGenres } from '../src/hooks/useQueries';
import { useLocationStore } from '../src/store/locationStore';
import type { Genre } from '../src/types';

export default function GenresScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { countryCode } = useLocationStore();

  const { data: genresData, isLoading, refetch } = usePrecomputedGenres(countryCode || undefined);

  // Sort genres by station count (most popular first)
  const genres = useMemo(() => {
    const allGenres = genresData?.data || [];
    return [...allGenres].sort((a, b) => 
      (b.stationCount || b.total_stations || 0) - (a.stationCount || a.total_stations || 0)
    );
  }, [genresData]);

  // Filter genres based on search
  const filteredGenres = useMemo(() => {
    if (!searchQuery.trim()) return genres;
    return genres.filter(g => 
      g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [genres, searchQuery]);

  // Popular genres (first 6 for horizontal scroll) - already sorted by station count
  const popularGenres = genres.slice(0, 6);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleGenrePress = (genre: Genre) => {
    router.push({
      pathname: '/genre-detail',
      params: { slug: genre.slug, name: genre.name },
    });
  };

  const handleBackPress = () => {
    router.back();
  };

  const renderGenreItem = ({ item }: { item: Genre }) => (
    <TouchableOpacity
      style={styles.genreRow}
      onPress={() => handleGenrePress(item)}
      activeOpacity={0.7}
      data-testid={`genre-item-${item.slug}`}
    >
      <View style={styles.genreInfo}>
        <Text style={styles.genreName}>{item.name}</Text>
        <Text style={styles.genreCount}>
          {item.stationCount || item.total_stations || 0} Stations
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.mainContainer}>
      <LinearGradient colors={gradients.background as any} style={styles.gradient}>
        <SafeAreaView style={styles.container} edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleBackPress}
              data-testid="genres-back-btn"
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Genres</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search genre"
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                data-testid="genres-search-input"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
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
              {/* Popular Section - Only show when not searching */}
              {!searchQuery.trim() && popularGenres.length > 0 && (
                <View style={styles.popularSection}>
                  <Text style={styles.popularTitle}>Popular</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.popularScroll}
                  >
                    {popularGenres.map((genre) => (
                      <TouchableOpacity
                        key={genre._id}
                        style={styles.popularChip}
                        onPress={() => handleGenrePress(genre)}
                        data-testid={`popular-genre-${genre.slug}`}
                      >
                        <Text style={styles.popularChipText}>{genre.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Genre List */}
              <View style={styles.genreList}>
                {filteredGenres.map((genre) => (
                  <React.Fragment key={genre._id}>
                    {renderGenreItem({ item: genre })}
                  </React.Fragment>
                ))}
                
                {filteredGenres.length === 0 && searchQuery && (
                  <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={48} color={colors.textMuted} />
                    <Text style={styles.emptyText}>No genres found</Text>
                  </View>
                )}
              </View>

              {/* See More Button */}
              {!searchQuery && genres.length > 10 && (
                <View style={styles.seeMoreContainer}>
                  <TouchableOpacity style={styles.seeMoreButton} data-testid="see-more-genres-btn">
                    <Text style={styles.seeMoreText}>See More</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },

  // Search
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.text,
    paddingVertical: spacing.xs,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // Popular Section
  popularSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  popularTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.medium,
    color: colors.accentPink,
    marginBottom: spacing.sm,
  },
  popularScroll: {
    gap: spacing.sm,
  },
  popularChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popularChipText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.medium,
    color: colors.text,
    textAlign: 'center',
  },

  // Genre List
  genreList: {
    paddingHorizontal: spacing.md,
  },
  genreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    marginBottom: spacing.sm,
  },
  genreInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  genreName: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginBottom: 2,
    textAlign: 'left',
  },
  genreCount: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    textAlign: 'left',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.medium,
    color: colors.textMuted,
    marginTop: spacing.md,
  },

  // See More
  seeMoreContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  seeMoreButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  seeMoreText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.medium,
    color: colors.text,
  },
});

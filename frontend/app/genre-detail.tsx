import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, gradients, spacing, borderRadius, typography } from '../src/constants/theme';
import { useGenreStations } from '../src/hooks/useQueries';
import { useAudioPlayer } from '../src/hooks/useAudioPlayer';
import { usePlayerStore } from '../src/store/playerStore';
import { useFavoritesStore } from '../src/store/favoritesStore';
import { useLocationStore } from '../src/store/locationStore';
import type { Station } from '../src/types';

export default function GenreDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const slug = params.slug as string;
  const genreName = params.name as string || slug;

  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const { countryCode } = useLocationStore();

  const { data, isLoading, refetch } = useGenreStations(slug, page, 50, countryCode || undefined);
  const { playStation } = useAudioPlayer();
  const { currentStation, playbackState } = usePlayerStore();
  const { isFavorite, toggleFavorite } = useFavoritesStore();

  const stations = data?.stations || [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleBackPress = () => {
    router.back();
  };

  const handleStationPress = (station: Station) => {
    playStation(station);
  };

  const handleFavoritePress = async (station: Station) => {
    await toggleFavorite(station);
  };

  const isStationPlaying = (station: Station) => {
    return currentStation?._id === station._id && playbackState === 'playing';
  };

  const isStationLoading = (station: Station) => {
    return currentStation?._id === station._id &&
      (playbackState === 'loading' || playbackState === 'buffering');
  };

  const renderStationCard = (station: Station) => {
    const logoUrl = station.logoAssets?.webp96 || station.favicon || station.logo;
    const playing = isStationPlaying(station);
    const loading = isStationLoading(station);
    const favorite = isFavorite(station._id);

    return (
      <View 
        key={station._id} 
        style={[styles.stationCard, playing && styles.stationCardActive]}
        data-testid={`station-card-${station._id}`}
      >
        {/* Station Logo */}
        <View style={styles.logoContainer}>
          {logoUrl ? (
            <Image
              source={{ uri: logoUrl }}
              style={styles.logo}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderLogo}>
              <Ionicons name="radio" size={24} color={colors.textMuted} />
            </View>
          )}
        </View>

        {/* Station Info */}
        <View style={styles.stationInfo}>
          <Text style={styles.stationName} numberOfLines={1}>{station.name}</Text>
          <Text style={styles.stationMeta} numberOfLines={1}>
            {station.genres?.[0] || genreName}
          </Text>
        </View>

        {/* Favorite Button */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => handleFavoritePress(station)}
          data-testid={`favorite-btn-${station._id}`}
        >
          <Ionicons 
            name="heart" 
            size={22} 
            color={favorite ? colors.accentPink : colors.accentPink} 
          />
        </TouchableOpacity>

        {/* Play Button */}
        <TouchableOpacity
          style={styles.playButton}
          onPress={() => handleStationPress(station)}
          data-testid={`play-btn-${station._id}`}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Ionicons
              name={playing ? 'pause' : 'play'}
              size={18}
              color={colors.text}
            />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <LinearGradient colors={gradients.background as any} style={styles.gradient}>
        <SafeAreaView style={styles.container} edges={['top']}>
          {/* Header with Breadcrumb */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleBackPress}
              data-testid="genre-detail-back-btn"
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            
            <View style={styles.breadcrumb}>
              <TouchableOpacity onPress={() => router.push('/genres')}>
                <Text style={styles.breadcrumbText}>Genres</Text>
              </TouchableOpacity>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              <Text style={styles.breadcrumbActive}>{genreName}</Text>
            </View>

            <View style={styles.placeholder} />
          </View>

          {isLoading && stations.length === 0 ? (
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
              {/* Station List */}
              <View style={styles.stationList}>
                {stations.map(renderStationCard)}

                {stations.length === 0 && !isLoading && (
                  <View style={styles.emptyState}>
                    <Ionicons name="radio-outline" size={48} color={colors.textMuted} />
                    <Text style={styles.emptyText}>No stations found in this genre</Text>
                  </View>
                )}
              </View>

              {/* See More Button */}
              {stations.length >= 50 && (
                <View style={styles.seeMoreContainer}>
                  <TouchableOpacity 
                    style={styles.seeMoreButton}
                    onPress={() => setPage(p => p + 1)}
                    data-testid="see-more-stations-btn"
                  >
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breadcrumb: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  breadcrumbText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.medium,
    color: colors.textSecondary,
  },
  breadcrumbActive: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.bold,
    color: colors.text,
  },
  placeholder: {
    width: 40,
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

  // Station List
  stationList: {
    paddingHorizontal: spacing.md,
  },
  stationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  stationCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  placeholderLogo: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
  },
  stationInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  stationName: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginBottom: 2,
  },
  stationMeta: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },

  // Buttons
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  favoriteButtonActive: {
    borderColor: colors.accentPink,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  playButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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

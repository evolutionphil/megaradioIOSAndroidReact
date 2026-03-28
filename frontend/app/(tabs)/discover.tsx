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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { GlowEffect } from '../../src/components/GlowEffect';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, gradients, spacing, borderRadius, typography } from '../../src/constants/theme';
import { StationCard, GenreCard, SectionHeader } from '../../src/components';
import { DiscoverSkeleton, GenreGridSkeleton, StationListItemSkeleton } from '../../src/components/Skeleton';
import { usePrecomputedGenres, useStations, useDiscoverableGenres } from '../../src/hooks/useQueries';
import { useAudioPlayer } from '../../src/hooks/useAudioPlayer';
import { usePlayerStore } from '../../src/store/playerStore';
import { useLocationStore } from '../../src/store/locationStore';
import { useAuthStore } from '../../src/store/authStore';
import { usePremiumStore } from '../../src/store/premiumStore';
import { PremiumPaywall } from '../../src/components/PremiumPaywall';
import { useResponsive } from '../../src/hooks/useResponsive';
import type { Station, Genre } from '../../src/types';

export default function DiscoverScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const { countryCode } = useLocationStore();
  const { isAuthenticated } = useAuthStore();
  const { isPremium } = usePremiumStore();
  const [showPaywall, setShowPaywall] = useState(false);
  
  // Responsive layout
  const responsive = useResponsive();
  const gridMetrics = responsive.getGridMetrics();

  const { data: genresData, isLoading: genresLoading, refetch: refetchGenres } = usePrecomputedGenres(countryCode || undefined);
  // Discoverable genres - shows 3 featured genres from /api/genres/discoverable
  const { data: discoverableGenres, isLoading: discoverableLoading, refetch: refetchDiscoverable } = useDiscoverableGenres();
  const { data: stationsData, isLoading: stationsLoading, refetch: refetchStations } = useStations({
    sort: 'votes',
    order: 'desc',
    limit: responsive.isTablet ? 80 : 50,
    country: countryCode || undefined,
  });

  const { playStation } = useAudioPlayer();
  const { currentStation, playbackState } = usePlayerStore();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchGenres(), refetchStations(), refetchDiscoverable()]);
    setRefreshing(false);
  }, [refetchGenres, refetchStations, refetchDiscoverable]);

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

  const handleNotificationsPress = () => {
    router.push('/notifications');
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
              <Text style={styles.title}>{t('discover')}</Text>
              <Text style={styles.subtitle}>{t('discover_subtitle')}</Text>
            </View>
            <View style={styles.headerButtons}>
              {isAuthenticated && (
                <TouchableOpacity 
                  style={styles.iconButton} 
                  onPress={handleNotificationsPress}
                  data-testid="discover-notifications-btn"
                >
                  <Ionicons name="notifications-outline" size={22} color={colors.text} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.searchButton} onPress={handleSearchPress} data-testid="discover-search-btn">
                <Ionicons name="search" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: responsive.sidePadding }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Premium Banner */}
          {!isPremium && (
            <TouchableOpacity 
              style={styles.premiumBanner} 
              onPress={() => setShowPaywall(true)}
              activeOpacity={0.85}
              data-testid="discover-premium-banner"
            >
              <LinearGradient
                colors={['#5C27F4', '#9F3FFF']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  borderRadius: 5,
                }}
              >
                <View style={{
                  width: 30, height: 30, borderRadius: 5.77,
                  backgroundColor: '#FFF',
                  justifyContent: 'center', alignItems: 'center',
                  marginRight: 10,
                }}>
                  <Ionicons name="radio" size={16} color="#7B3FE4" />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 }}>MegaRadio Premium</Text>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 1 }}>{t('unlock_amazing_features', 'Unlock amazing features')}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}

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

          {/* Discoverable Genres - Featured 3 genres from /api/genres/discoverable */}
          <View style={styles.section}>
            <SectionHeader 
              title={t('browse_genres')} 
              showSeeAll={true}
              onSeeAll={() => router.push('/genres')}
            />
            {discoverableLoading ? (
              <View style={[styles.genresGrid, responsive.isTablet && { gap: gridMetrics.gap }]}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <View key={i} style={[styles.genreGridItem, { width: '31%' }]}>
                    <GenreGridSkeleton />
                  </View>
                ))}
              </View>
            ) : (discoverableGenres && discoverableGenres.length > 0) ? (
              <View style={[styles.genresGrid, responsive.isTablet && { gap: gridMetrics.gap }]}>
                {discoverableGenres.map((genre) => (
                  <GenreCard
                    key={genre._id}
                    genre={genre}
                    onPress={(g) => router.push({
                      pathname: '/genre-detail',
                      params: { slug: g.slug, name: g.name },
                    })}
                    size={responsive.isTablet ? 'medium' : 'small'}
                    style={[styles.genreGridItem, { width: '31%' }]}
                  />
                ))}
              </View>
            ) : (
              <View style={[styles.genresGrid, responsive.isTablet && { gap: gridMetrics.gap }]}>
                {genres.slice(0, 3).map((genre) => (
                  <GenreCard
                    key={genre._id}
                    genre={genre}
                    onPress={(g) => router.push({
                      pathname: '/genre-detail',
                      params: { slug: g.slug, name: g.name },
                    })}
                    size={responsive.isTablet ? 'medium' : 'small'}
                    style={[styles.genreGridItem, { width: '31%' }]}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Top Stations List */}
          <View style={styles.stationsSection}>
            <SectionHeader 
              title={t('top_stations')}
              subtitle={`${stations.length} ${t('stations').toLowerCase()}`}
              showSeeAll={true}
              onSeeAll={() => router.push('/all-stations')}
            />
            {stationsLoading ? (
              <View style={[styles.stationsList, responsive.isTablet && { flexDirection: 'row', flexWrap: 'wrap' }]}>
                {Array.from({ length: responsive.isTablet ? 8 : 5 }).map((_, i) => (
                  <View key={i} style={responsive.isTablet ? { width: '50%', paddingHorizontal: 4 } : undefined}>
                    <StationListItemSkeleton />
                  </View>
                ))}
              </View>
            ) : stations.length > 0 ? (
              <View style={[styles.stationsList, responsive.isTablet && { flexDirection: 'row', flexWrap: 'wrap' }]}>
                {stations.slice(0, responsive.isTablet ? 16 : 10).map((station) => (
                  <View key={station._id} style={responsive.isTablet ? { width: '50%', paddingHorizontal: 4 } : undefined}>
                    <StationCard
                      station={station}
                      onPress={handleStationPress}
                      isPlaying={isStationPlaying(station)}
                      isLoading={isStationLoading(station)}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="radio-outline" size={48} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>{t('no_stations_found')}</Text>
                <Text style={styles.emptyText}>{t('try_refresh') || 'Try refreshing the page'}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>

    {/* Premium Paywall Modal */}
    <PremiumPaywall
      visible={showPaywall}
      onClose={() => setShowPaywall(false)}
      mode="premium"
    />
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'left',
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

  // Premium Banner
  premiumBanner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: 5,
    overflow: 'hidden',
    height: 54,
    alignSelf: 'center',
    width: 345,
  },
  premiumBannerGradient: {
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  premiumBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  premiumBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  premiumIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumBannerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  premiumBannerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
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

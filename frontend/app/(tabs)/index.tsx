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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, gradients, spacing, borderRadius, typography, shadows } from '../../src/constants/theme';
import { StationCard, GenreCard, SectionHeader } from '../../src/components';
import { usePopularStations, usePrecomputedGenres, useTop100 } from '../../src/hooks/useQueries';
import { useAudioPlayer } from '../../src/hooks/useAudioPlayer';
import { usePlayerStore } from '../../src/store/playerStore';
import type { Station, Genre } from '../../src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  
  const { data: popularData, isLoading: popularLoading, refetch: refetchPopular } = usePopularStations(undefined, 20);
  const { data: genresData, isLoading: genresLoading, refetch: refetchGenres } = usePrecomputedGenres();
  const { data: top100Data, isLoading: top100Loading, refetch: refetchTop100 } = useTop100();
  
  const { playStation } = useAudioPlayer();
  const { currentStation, playbackState } = usePlayerStore();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchPopular(), refetchGenres(), refetchTop100()]);
    setRefreshing(false);
  }, [refetchPopular, refetchGenres, refetchTop100]);

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

  const genres = genresData?.data?.slice(0, 10) || [];
  const stations = popularData?.stations || [];
  const top100Stations = top100Data?.slice(0, 10) || [];

  return (
    <LinearGradient colors={gradients.background as any} style={styles.gradient}>
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
            <View style={styles.headerLeft}>
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={[colors.primary, colors.accent] as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoGradient}
                >
                  <Ionicons name="radio" size={20} color={colors.text} />
                </LinearGradient>
              </View>
              <View>
                <Text style={styles.welcomeText}>Welcome to</Text>
                <Text style={styles.titleText}>MegaRadio</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <TouchableOpacity style={styles.searchBar} onPress={handleSearchPress} activeOpacity={0.8}>
            <View style={styles.searchIconContainer}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
            </View>
            <Text style={styles.searchPlaceholder}>Search 40,000+ radio stations...</Text>
            <View style={styles.searchMicButton}>
              <Ionicons name="mic-outline" size={18} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Featured Banner */}
          <TouchableOpacity style={styles.featuredBanner} activeOpacity={0.9}>
            <LinearGradient
              colors={['#8B5CF6', '#EC4899'] as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.featuredGradient}
            >
              <View style={styles.featuredContent}>
                <View style={styles.featuredTextContainer}>
                  <Text style={styles.featuredLabel}>PREMIUM</Text>
                  <Text style={styles.featuredTitle}>Go Premium</Text>
                  <Text style={styles.featuredSubtitle}>Ad-free listening & exclusive features</Text>
                </View>
                <View style={styles.featuredImageContainer}>
                  <Ionicons name="headset" size={60} color="rgba(255,255,255,0.3)" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Genres Section */}
          <View style={styles.section}>
            <SectionHeader 
              title="Browse Genres" 
              icon="musical-notes"
              onSeeAll={() => router.push('/discover')} 
            />
            
            {genresLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.genresScroll}
              >
                {genres.map((genre) => (
                  <GenreCard
                    key={genre._id}
                    genre={genre}
                    onPress={handleGenrePress}
                    size="medium"
                  />
                ))}
              </ScrollView>
            )}
          </View>

          {/* Popular Stations Section */}
          <View style={styles.section}>
            <SectionHeader 
              title="Popular Now" 
              subtitle="Trending worldwide"
              icon="trending-up"
              onSeeAll={() => router.push('/discover')} 
            />
            
            {popularLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.popularScroll}
              >
                {stations.slice(0, 8).map((station) => (
                  <StationCard
                    key={station._id}
                    station={station}
                    onPress={handleStationPress}
                    isPlaying={isStationPlaying(station)}
                    isLoading={isStationLoading(station)}
                    variant="large"
                  />
                ))}
              </ScrollView>
            )}
          </View>

          {/* Top 100 Section */}
          <View style={styles.section}>
            <SectionHeader 
              title="Top 100" 
              subtitle="Most played this week"
              icon="trophy"
              onSeeAll={() => router.push('/discover')} 
            />
            
            {top100Loading ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
            ) : top100Stations.length > 0 ? (
              <View style={styles.stationsList}>
                {top100Stations.slice(0, 5).map((station, index) => (
                  <View key={station._id} style={styles.rankedStation}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>{index + 1}</Text>
                    </View>
                    <View style={styles.stationCardContainer}>
                      <StationCard
                        station={station}
                        onPress={handleStationPress}
                        isPlaying={isStationPlaying(station)}
                        isLoading={isStationLoading(station)}
                      />
                    </View>
                  </View>
                ))}
              </View>
            ) : stations.length > 0 ? (
              <View style={styles.stationsList}>
                {stations.slice(0, 5).map((station, index) => (
                  <View key={station._id} style={styles.rankedStation}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>{index + 1}</Text>
                    </View>
                    <View style={styles.stationCardContainer}>
                      <StationCard
                        station={station}
                        onPress={handleStationPress}
                        isPlaying={isStationPlaying(station)}
                        isLoading={isStationLoading(station)}
                      />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="radio-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No stations available</Text>
              </View>
            )}
          </View>

          {/* Recently Played Section - Placeholder */}
          <View style={styles.section}>
            <SectionHeader 
              title="Continue Listening" 
              icon="time"
              showSeeAll={false}
            />
            <View style={styles.recentlyPlayedEmpty}>
              <View style={styles.recentlyPlayedIcon}>
                <Ionicons name="time-outline" size={32} color={colors.textMuted} />
              </View>
              <Text style={styles.recentlyPlayedText}>
                Your recently played stations will appear here
              </Text>
            </View>
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
    paddingBottom: 180, // Space for mini player and tab bar
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    marginRight: spacing.sm,
  },
  logoGradient: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  titleText: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  
  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.textMuted,
  },
  searchMicButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Featured Banner
  featuredBanner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  featuredGradient: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  featuredContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredTextContainer: {
    flex: 1,
  },
  featuredLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  featuredTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  featuredSubtitle: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  featuredImageContainer: {
    marginLeft: spacing.md,
  },
  
  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  
  // Genres
  genresScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  
  // Popular Stations
  popularScroll: {
    paddingHorizontal: spacing.md,
  },
  
  // Stations List
  stationsList: {
    paddingHorizontal: spacing.md,
  },
  rankedStation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  rankText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  stationCardContainer: {
    flex: 1,
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
  },
  emptyText: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.md,
    color: colors.textMuted,
  },
  
  // Recently Played
  recentlyPlayedEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recentlyPlayedIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  recentlyPlayedText: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

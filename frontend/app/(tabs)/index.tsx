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
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, gradients, spacing, borderRadius, typography } from '../../src/constants/theme';
import {
  usePopularStations,
  usePrecomputedGenres,
  useTop100,
  useRecentlyPlayed,
  useCommunityFavorites,
  useStations,
} from '../../src/hooks/useQueries';
import { useAudioPlayer } from '../../src/hooks/useAudioPlayer';
import { usePlayerStore } from '../../src/store/playerStore';
import { useAuthStore } from '../../src/store/authStore';
import type { Station, Genre } from '../../src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - spacing.md * 2 - spacing.sm * 2) / 3;

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();

  const { data: popularData, isLoading: popularLoading, refetch: refetchPopular } = usePopularStations(undefined, 8);
  const { data: genresData, isLoading: genresLoading, refetch: refetchGenres } = usePrecomputedGenres();
  const { data: recentlyPlayedData, refetch: refetchRecent } = useRecentlyPlayed();
  const { data: communityFavorites, refetch: refetchCommunity } = useCommunityFavorites(10);
  const { data: allStationsData, isLoading: allStationsLoading, refetch: refetchAll } = useStations({ limit: 21 });

  const { playStation } = useAudioPlayer();
  const { currentStation, playbackState } = usePlayerStore();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchPopular(), refetchGenres(), refetchRecent(), refetchCommunity(), refetchAll()]);
    setRefreshing(false);
  }, []);

  const handleStationPress = (station: Station) => {
    playStation(station);
  };

  const handleGenrePress = (genre: Genre) => {
    router.push(`/discover?genre=${genre.slug}`);
  };

  const genres = genresData?.data?.slice(0, 8) || [];
  const popularStations = popularData?.stations || [];
  const recentStations = recentlyPlayedData || [];
  const allStations = allStationsData?.stations || [];

  // Genre chip colors
  const genreColors: Record<string, string> = {
    'folk': colors.genreOrange,
    'slow': colors.genreCyan,
    'jazz': colors.genrePurple,
    'rock': colors.genreRed,
    'pop': colors.genrePink,
    'classical': colors.genreGreen,
    'electronic': colors.genreBlue,
    'news': colors.genreYellow,
  };

  const getGenreColor = (slug: string) => {
    const key = slug.toLowerCase();
    return genreColors[key] || colors.primary;
  };

  const getLogoUrl = (station: Station) => {
    // Try logoAssets first with full URL construction
    if (station.logoAssets?.webp96) {
      return `https://themegaradio.com/station-logos/${station.logoAssets.folder}/${station.logoAssets.webp96}`;
    }
    return station.favicon || station.logo || null;
  };

  const renderStationLogo = (station: Station, size: number = 100) => {
    const logoUrl = getLogoUrl(station);
    return logoUrl ? (
      <Image source={{ uri: logoUrl }} style={{ width: size, height: size * 0.6, borderRadius: borderRadius.sm }} resizeMode="contain" />
    ) : (
      <View style={[styles.logoPlaceholder, { width: size, height: size * 0.6 }]}>
        <Ionicons name="radio" size={24} color={colors.textMuted} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient Blur */}
      <View style={styles.bgGradientContainer}>
        <BlurView intensity={100} tint="dark" style={styles.bgBlur}>
          <View style={styles.bgGradient} />
        </BlurView>
      </View>
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={['#00FF87', '#60EFFF'] as any}
                  style={styles.avatarGradient}
                >
                  <Ionicons name="person" size={20} color="#000" />
                </LinearGradient>
              </View>
              <View>
                <Text style={styles.welcomeText}>Welcome Back</Text>
                <Text style={styles.userName}>{user?.name || 'Guest'}</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.headerIcon}>
                <Ionicons name="notifications-outline" size={22} color={colors.text} />
                <View style={styles.notificationDot} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIcon} onPress={() => router.push('/search')}>
                <Ionicons name="search" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Premium Banner */}
          <TouchableOpacity style={styles.premiumBanner}>
            <LinearGradient
              colors={['#4B30BE', '#8B5CF6', '#C084FC'] as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.premiumGradient}
            >
              <View style={styles.premiumIcon}>
                <Ionicons name="radio" size={18} color={colors.text} />
              </View>
              <View style={styles.premiumContent}>
                <Text style={styles.premiumTitle}>MegaRadio Premium</Text>
                <Text style={styles.premiumSubtitle}>Unlock Amazing Features</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.text} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Genres Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Genres</Text>
              <TouchableOpacity onPress={() => router.push('/discover')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            {genresLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genresScroll}>
                {genres.map((genre) => (
                  <TouchableOpacity
                    key={genre._id}
                    style={[styles.genreChip, { backgroundColor: getGenreColor(genre.slug) }]}
                    onPress={() => handleGenrePress(genre)}
                  >
                    <Text style={styles.genreChipText}>{genre.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Popular Stations - List View */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Popular Stations</Text>
            </View>
            {popularLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <View style={styles.popularList}>
                {popularStations.slice(0, 4).map((station) => (
                  <TouchableOpacity
                    key={station._id}
                    style={styles.popularItem}
                    onPress={() => handleStationPress(station)}
                  >
                    <View style={styles.popularLogo}>
                      <Image 
                        source={{ uri: station.favicon || station.logo || `https://themegaradio.com/station-logos/${station.logoAssets?.folder}/${station.logoAssets?.webp96}` }} 
                        style={styles.popularLogoImage} 
                        resizeMode="contain" 
                      />
                    </View>
                    <View style={styles.popularInfo}>
                      <Text style={styles.popularName} numberOfLines={1}>{station.name}</Text>
                      <Text style={styles.popularCountry} numberOfLines={1}>
                        {station.country || station.countrycode || 'Unknown'}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.playButton} onPress={() => handleStationPress(station)}>
                      <Ionicons name="play" size={16} color={colors.text} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Recently Played - 3 Column Grid */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recently Played</Text>
            </View>
            {recentStations.length > 0 ? (
              <View style={styles.stationGrid}>
                {recentStations.slice(0, 12).map((station: Station) => (
                  <TouchableOpacity
                    key={station._id}
                    style={styles.gridItem}
                    onPress={() => handleStationPress(station)}
                  >
                    <View style={styles.gridLogo}>
                      {renderStationLogo(station, GRID_ITEM_WIDTH - 8)}
                    </View>
                    <Text style={styles.gridName} numberOfLines={1}>{station.name}</Text>
                    <Text style={styles.gridCountry} numberOfLines={1}>
                      {station.country || 'Radio'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : popularStations.length > 0 ? (
              <View style={styles.stationGrid}>
                {popularStations.slice(0, 12).map((station: Station) => (
                  <TouchableOpacity
                    key={station._id}
                    style={styles.gridItem}
                    onPress={() => handleStationPress(station)}
                  >
                    <View style={styles.gridLogo}>
                      {renderStationLogo(station, GRID_ITEM_WIDTH - 8)}
                    </View>
                    <Text style={styles.gridName} numberOfLines={1}>{station.name}</Text>
                    <Text style={styles.gridCountry} numberOfLines={1}>
                      {station.country || 'Radio'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No recently played stations</Text>
            )}
          </View>

          {/* Radios Near You - 3 Column Grid */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Radios Near You</Text>
            </View>
            <View style={styles.stationGrid}>
              {popularStations.slice(0, 12).map((station: Station, index: number) => (
                <TouchableOpacity
                  key={`nearby-${station._id}-${index}`}
                  style={styles.gridItem}
                  onPress={() => handleStationPress(station)}
                >
                  <View style={styles.gridLogo}>
                    {renderStationLogo(station, GRID_ITEM_WIDTH - 8)}
                  </View>
                  <Text style={styles.gridName} numberOfLines={1}>{station.name}</Text>
                  <Text style={styles.gridCountry} numberOfLines={1}>
                    {station.country || 'Radio'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.seeMoreButton}>
              <Text style={styles.seeMoreText}>See More</Text>
            </TouchableOpacity>
          </View>

          {/* Jazz Banner */}
          <TouchableOpacity style={styles.jazzBanner} onPress={() => router.push('/discover?genre=jazz')}>
            <LinearGradient
              colors={['#0066FF', '#00BFFF'] as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.jazzGradient}
            >
              <View style={styles.jazzContent}>
                <Text style={styles.jazzTitle}>Jazz</Text>
                <Text style={styles.jazzSubtitle}>Discover all the stations</Text>
              </View>
              <View style={styles.jazzImage}>
                <Ionicons name="musical-notes" size={40} color="rgba(255,255,255,0.5)" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Favorites From Users */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Favorites From Users</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            {communityFavorites && communityFavorites.length > 0 ? (
              <View style={styles.usersList}>
                {communityFavorites.slice(0, 6).map((item: any, index: number) => (
                  <TouchableOpacity key={item._id || index} style={styles.userItem}>
                    <View style={styles.userAvatar}>
                      {item.user?.profilePhoto ? (
                        <Image source={{ uri: item.user.profilePhoto }} style={styles.userAvatarImage} />
                      ) : (
                        <Ionicons name="person" size={20} color={colors.textMuted} />
                      )}
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userNameText}>{item.user?.name || 'User'}</Text>
                      <Text style={styles.userRadioCount}>{item.count || 12} Radios</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.usersList}>
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <TouchableOpacity key={item} style={styles.userItem}>
                    <View style={styles.userAvatar}>
                      <Ionicons name="person" size={20} color={colors.textMuted} />
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userNameText}>Steve Arnic</Text>
                      <Text style={styles.userRadioCount}>12 Radios</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* All Stations - 3 Column Grid */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>All Stations</Text>
            </View>
            {allStationsLoading ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <>
                <View style={styles.stationGrid}>
                  {allStations.slice(0, 21).map((station: Station) => (
                    <TouchableOpacity
                      key={station._id}
                      style={styles.gridItem}
                      onPress={() => handleStationPress(station)}
                    >
                      <View style={styles.gridLogo}>
                        {renderStationLogo(station, GRID_ITEM_WIDTH - 8)}
                      </View>
                      <Text style={styles.gridName} numberOfLines={1}>{station.name}</Text>
                      <Text style={styles.gridCountry} numberOfLines={1}>
                        {station.country || 'Radio'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={styles.seeMoreButton} onPress={() => router.push('/discover')}>
                  <Text style={styles.seeMoreText}>See More</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Background Gradient Blur
  bgGradientContainer: {
    position: 'absolute',
    top: -131,
    left: -164,
    width: 434,
    height: 434,
    zIndex: 0,
    overflow: 'hidden',
    borderRadius: 217,
  },
  bgBlur: {
    width: '100%',
    height: '100%',
    borderRadius: 217,
    overflow: 'hidden',
  },
  bgGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 217,
    backgroundColor: '#3300FF4D', // #3300FF with 30% opacity
  },
  
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 180,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: spacing.sm,
  },
  avatarGradient: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  userName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },

  // Premium Banner
  premiumBanner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  premiumGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  premiumIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  premiumContent: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  premiumSubtitle: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },

  // Section
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
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  seeAllText: {
    fontSize: typography.sizes.md,
    color: colors.accent,
    fontWeight: typography.weights.medium,
  },

  // Genres
  genresScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  genreChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  genreChipText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },

  // Popular Stations List
  popularList: {
    paddingHorizontal: spacing.md,
  },
  popularItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  popularLogo: {
    width: 60,
    height: 40,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  popularLogoImage: {
    width: '100%',
    height: '100%',
  },
  popularInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  popularName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  popularCountry: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Station Grid
  stationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  gridItem: {
    width: GRID_ITEM_WIDTH,
    marginBottom: spacing.sm,
  },
  gridLogo: {
    width: '100%',
    aspectRatio: 1.5,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  gridName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  gridCountry: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  logoPlaceholder: {
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },

  // See More Button
  seeMoreButton: {
    alignSelf: 'center',
    backgroundColor: colors.buttonGray,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
  },
  seeMoreText: {
    fontSize: typography.sizes.md,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },

  // Jazz Banner
  jazzBanner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  jazzGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  jazzContent: {},
  jazzTitle: {
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  jazzSubtitle: {
    fontSize: typography.sizes.md,
    color: 'rgba(255,255,255,0.8)',
  },
  jazzImage: {
    opacity: 0.5,
  },

  // Users List
  usersList: {
    paddingHorizontal: spacing.md,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  userNameText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  userRadioCount: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },

  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});

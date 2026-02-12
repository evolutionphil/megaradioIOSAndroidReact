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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, gradients, spacing, borderRadius, typography } from '../../src/constants/theme';
import {
  usePopularStations,
  usePrecomputedGenres,
  useDiscoverableGenres,
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
// Calculate content width based on screen (with 15px padding each side)
const CONTENT_PADDING = 15;
const CONTENT_WIDTH = SCREEN_WIDTH - (CONTENT_PADDING * 2);
// Grid calculations: 3 items per row
const GRID_GAP = 10;
// Item width = (contentWidth - 2 gaps) / 3
const GRID_ITEM_WIDTH = (CONTENT_WIDTH - (GRID_GAP * 2)) / 3;

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();

  const { data: popularData, isLoading: popularLoading, refetch: refetchPopular } = usePopularStations(undefined, 8);
  const { data: genresData, isLoading: genresLoading, refetch: refetchGenres } = usePrecomputedGenres();
  const { data: discoverableGenres, refetch: refetchDiscoverable } = useDiscoverableGenres();
  const { data: recentlyPlayedData, refetch: refetchRecent } = useRecentlyPlayed();
  const { data: communityFavorites, refetch: refetchCommunity } = useCommunityFavorites(10);
  const { data: allStationsData, isLoading: allStationsLoading, refetch: refetchAll } = useStations({ limit: 21 });

  const { playStation } = useAudioPlayer();
  const { currentStation, playbackState } = usePlayerStore();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchPopular(), refetchGenres(), refetchDiscoverable(), refetchRecent(), refetchCommunity(), refetchAll()]);
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
  const discoverableGenresList = discoverableGenres || [];

  // Get discoverable genre image URL
  const getDiscoverableGenreImage = (genre: any) => {
    if (genre.discoverableImage) {
      return `https://themegaradio.com${genre.discoverableImage}`;
    }
    return null;
  };

  // Genre background images
  const genreBackgrounds = [
    'https://customer-assets.emergentagent.com/job_fe201e1e-49a8-4b50-87cb-181e2f73a46f/artifacts/eq61xd6w_e1b96e395dad3206b244b757c3f6d02f9e3e20ce.jpg',
    'https://customer-assets.emergentagent.com/job_fe201e1e-49a8-4b50-87cb-181e2f73a46f/artifacts/e61i1gbp_ede84cfacb60b98a308517cb867870085cd29e3b.jpg',
    'https://customer-assets.emergentagent.com/job_fe201e1e-49a8-4b50-87cb-181e2f73a46f/artifacts/uecu522z_b82ff8a8cf723ff0d4bca7a3dc526141e276b0eb.jpg',
  ];

  const getGenreBackground = (index: number) => {
    return genreBackgrounds[index % genreBackgrounds.length];
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
        <View style={styles.bgGradientInner}>
          <View style={styles.bgGradient} />
        </View>
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
              colors={['#5C27F4', '#9F3FFF'] as any}
              start={{ x: 1, y: 0.5 }}
              end={{ x: 0, y: 0.5 }}
              style={styles.premiumGradient}
            >
              <Image 
                source={{ uri: 'https://customer-assets.emergentagent.com/job_fe201e1e-49a8-4b50-87cb-181e2f73a46f/artifacts/afi7gbdc_image.png' }} 
                style={styles.premiumIconImage}
                resizeMode="contain"
              />
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
              <View style={styles.genresContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genresScroll}>
                  {genres.map((genre, index) => (
                    <TouchableOpacity
                      key={genre._id}
                      style={styles.genreCard}
                      onPress={() => handleGenrePress(genre)}
                    >
                      <ImageBackground
                        source={{ uri: getGenreBackground(index) }}
                        style={styles.genreCardBackground}
                        imageStyle={styles.genreCardImage}
                        resizeMode="cover"
                      >
                        <Text style={styles.genreCardText}>{genre.name}</Text>
                      </ImageBackground>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
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

          {/* Recently Played - 3 Column Grid, 6 stations */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recently Played</Text>
            </View>
            {recentStations.length > 0 ? (
              <View style={styles.stationGridCustom}>
                {recentStations.slice(0, 6).map((station: Station) => (
                  <TouchableOpacity
                    key={station._id}
                    style={styles.stationGridItem}
                    onPress={() => handleStationPress(station)}
                  >
                    <View style={styles.stationGridLogo}>
                      <Image 
                        source={{ uri: getLogoUrl(station) || undefined }} 
                        style={styles.stationGridLogoImage} 
                        resizeMode="cover" 
                      />
                    </View>
                    <Text style={styles.stationGridName} numberOfLines={1}>{station.name}</Text>
                    <Text style={styles.stationGridCountry} numberOfLines={1}>
                      {station.country || 'Radio'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : popularStations.length > 0 ? (
              <View style={styles.stationGridCustom}>
                {popularStations.slice(0, 6).map((station: Station) => (
                  <TouchableOpacity
                    key={station._id}
                    style={styles.stationGridItem}
                    onPress={() => handleStationPress(station)}
                  >
                    <View style={styles.stationGridLogo}>
                      <Image 
                        source={{ uri: getLogoUrl(station) || undefined }} 
                        style={styles.stationGridLogoImage} 
                        resizeMode="cover" 
                      />
                    </View>
                    <Text style={styles.stationGridName} numberOfLines={1}>{station.name}</Text>
                    <Text style={styles.stationGridCountry} numberOfLines={1}>
                      {station.country || 'Radio'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No recently played stations</Text>
            )}
          </View>

          {/* Radios Near You - 3 Column Grid, 12 stations */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Radios Near You</Text>
            </View>
            <View style={styles.stationGridCustom}>
              {popularStations.slice(0, 12).map((station: Station, index: number) => (
                <TouchableOpacity
                  key={`nearby-${station._id}-${index}`}
                  style={styles.stationGridItem}
                  onPress={() => handleStationPress(station)}
                >
                  <View style={styles.stationGridLogo}>
                    <Image 
                      source={{ uri: getLogoUrl(station) || undefined }} 
                      style={styles.stationGridLogoImage} 
                      resizeMode="cover" 
                    />
                  </View>
                  <Text style={styles.stationGridName} numberOfLines={1}>{station.name}</Text>
                  <Text style={styles.stationGridCountry} numberOfLines={1}>
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

          {/* Discoverable Genres */}
          {discoverableGenresList.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Discoverable Genres</Text>
                <TouchableOpacity onPress={() => router.push('/discover')}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.discoverableGenresContainer}>
                {discoverableGenresList.map((genre: any) => (
                  <TouchableOpacity
                    key={genre._id}
                    style={styles.discoverableGenreCard}
                    onPress={() => handleGenrePress(genre)}
                  >
                    <ImageBackground
                      source={{ uri: getDiscoverableGenreImage(genre) || undefined }}
                      style={styles.discoverableGenreImageBg}
                      imageStyle={styles.discoverableGenreImageStyle}
                      resizeMode="cover"
                    >
                      <View style={styles.discoverableGenreOverlay}>
                        <Text style={styles.discoverableGenreName}>{genre.name}</Text>
                        <Text style={styles.discoverableGenreCount}>{genre.stationCount} stations</Text>
                      </View>
                    </ImageBackground>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

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
  
  // Background Gradient Blur - Using CSS filter for web
  bgGradientContainer: {
    position: 'absolute',
    top: -131,
    left: -164,
    width: 434,
    height: 434,
    zIndex: 0,
  },
  bgGradientInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgGradient: {
    width: 434,
    height: 434,
    borderRadius: 217,
    backgroundColor: '#3300FF4D',
    ...(Platform.OS === 'web' ? {
      filter: 'blur(205px)',
    } : {
      shadowColor: '#3300FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 150,
    }),
  },
  
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 180,
    paddingHorizontal: 15,
  },

  // Header - Centered with fixed width
  header: {
    width: CONTENT_WIDTH,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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

  // Premium Banner - Centered with fixed width
  premiumBanner: {
    width: CONTENT_WIDTH,
    alignSelf: 'center',
    height: 54,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  premiumGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  premiumIconImage: {
    width: 36,
    height: 36,
    marginRight: 10,
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

  // Section - Full width with centered content
  section: {
    width: CONTENT_WIDTH,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
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

  // Genres - Fixed width
  genresContainer: {
    width: '100%',
    height: 45,
    overflow: 'hidden',
  },
  genresScroll: {
    gap: 10,
  },
  genreCard: {
    width: 130,
    height: 45,
    borderRadius: 5,
    overflow: 'hidden',
  },
  genreCardBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  genreCardImage: {
    borderRadius: 5,
  },
  genreCardText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Popular Stations List - Full width
  popularList: {
    width: '100%',
  },
  popularItem: {
    width: '100%',
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: spacing.sm,
  },
  popularLogo: {
    width: 50,
    height: 50,
    borderRadius: 5,
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
    marginLeft: 15,
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

  // Recently Played - Updated with exact dimensions
  recentlyPlayedScroll: {
    paddingLeft: 15,
    gap: 10,
  },
  recentlyPlayedItem: {
    width: 100,
    height: 144,
  },
  recentlyPlayedLogo: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    marginBottom: 8,
  },
  recentlyPlayedLogoImage: {
    width: '100%',
    height: '100%',
  },
  recentlyPlayedName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  recentlyPlayedCountry: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },

  // Station Grid Custom - Full width with space between
  stationGridCustom: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  stationGridItem: {
    width: '30%',
    height: 144,
  },
  stationGridLogo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    marginBottom: 8,
  },
  stationGridLogoImage: {
    width: '100%',
    height: '100%',
  },
  stationGridName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  stationGridCountry: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },

  // Station Grid - Full width
  stationGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
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

  // Jazz Banner - Full width
  jazzBanner: {
    width: '100%',
    marginBottom: spacing.lg,
    borderRadius: 5,
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

  // Users List - Full width
  usersList: {
    width: '100%',
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

  // Discoverable Genres - Full width
  discoverableGenresContainer: {
    width: '100%',
  },
  discoverableGenreCard: {
    width: '100%',
    height: 119,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  discoverableGenreImageBg: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    backgroundColor: colors.surface,
  },
  discoverableGenreImageStyle: {
    borderRadius: 5,
  },
  discoverableGenreImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  discoverableGenrePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discoverableGenreOverlay: {
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  discoverableGenreName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  discoverableGenreCount: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
});

import React, { useState, useCallback, useEffect } from 'react';
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
  useWindowDimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
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
  usePublicProfiles,
  useNearbyStations,
} from '../../src/hooks/useQueries';
import { useAudioPlayer } from '../../src/hooks/useAudioPlayer';
import { usePlayerStore } from '../../src/store/playerStore';
import { useAuthStore } from '../../src/store/authStore';
import { useLocationStore } from '../../src/store/locationStore';
import type { Station, Genre } from '../../src/types';

// Fixed padding for all elements - same as Jazz banner
const SIDE_PADDING = 15;
const HORIZONTAL_PADDING = 0; // Padding inside sections (already handled by ScrollView)

// Calculate grid item size based on screen width
// iPhone 13 Pro Max: 428px width
// 3 items per row with minimal gap
const getGridItemSize = (screenWidth: number) => {
  const availableWidth = screenWidth - (SIDE_PADDING * 2);
  const gap = 6; // Minimal gap between items
  const itemWidth = Math.floor((availableWidth - (gap * 2)) / 3);
  return Math.max(itemWidth, 125); // Minimum 125px for larger phones
};

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();
  const { width: windowWidth } = useWindowDimensions();
  const { countryCode, country, latitude, longitude, fetchLocation } = useLocationStore();

  // Fetch location on mount
  useEffect(() => {
    fetchLocation();
  }, []);
  
  // Use window width if available, otherwise use Dimensions API
  const screenWidth = windowWidth > 0 ? windowWidth : Dimensions.get('window').width || 375;
  
  // Calculate grid item size dynamically
  const GRID_ITEM_SIZE = getGridItemSize(screenWidth);
  const GRID_GAP = 6;
  
  // Calculate grid item width dynamically
  // For 375px screen: (375 - 30 - 16) / 3 = ~109px
  const contentWidth = screenWidth - (SIDE_PADDING * 2);
  const gridGap = 8;
  // Ensure minimum of 80px and maximum of 150px per item
  const calculatedWidth = Math.floor((contentWidth - (gridGap * 2)) / 3);
  const gridItemWidth = Math.max(80, Math.min(150, calculatedWidth));

  const { data: popularData, isLoading: popularLoading, refetch: refetchPopular } = usePopularStations(countryCode || undefined, 8);
  const { data: genresData, isLoading: genresLoading, refetch: refetchGenres } = usePrecomputedGenres(countryCode || undefined);
  const { data: discoverableGenres, refetch: refetchDiscoverable } = useDiscoverableGenres();
  const { data: recentlyPlayedData, refetch: refetchRecent } = useRecentlyPlayed();
  const { data: communityFavorites, refetch: refetchCommunity } = useCommunityFavorites(10);
  const { data: publicProfiles, refetch: refetchProfiles } = usePublicProfiles(10);
  const { data: allStationsData, isLoading: allStationsLoading, refetch: refetchAll } = useStations({ limit: 21, country: countryCode || undefined });
  const { data: nearbyData, refetch: refetchNearby } = useNearbyStations(latitude, longitude, 150, 12);

  const { playStation } = useAudioPlayer();
  const { currentStation, playbackState } = usePlayerStore();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchPopular(), refetchGenres(), refetchDiscoverable(), refetchRecent(), refetchCommunity(), refetchProfiles(), refetchAll(), refetchNearby()]);
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
  const nearbyStations = Array.isArray(nearbyData) ? nearbyData : (nearbyData?.stations || []);

  // Get discoverable genre image URL
  const getDiscoverableGenreImage = (genre: any) => {
    if (genre.discoverableImage) {
      return `https://themegaradio.com${genre.discoverableImage}`;
    }
    return null;
  };

  // Genre background images for cards
  const genreBackgrounds = [
    'https://customer-assets.emergentagent.com/job_fe201e1e-49a8-4b50-87cb-181e2f73a46f/artifacts/eq61xd6w_e1b96e395dad3206b244b757c3f6d02f9e3e20ce.jpg',
    'https://customer-assets.emergentagent.com/job_fe201e1e-49a8-4b50-87cb-181e2f73a46f/artifacts/e61i1gbp_ede84cfacb60b98a308517cb867870085cd29e3b.jpg',
    'https://customer-assets.emergentagent.com/job_fe201e1e-49a8-4b50-87cb-181e2f73a46f/artifacts/uecu522z_b82ff8a8cf723ff0d4bca7a3dc526141e276b0eb.jpg',
  ];

  // Fallback images for discoverable genres banner (CORS-safe)
  const genreBannerImages: { [key: string]: string } = {
    'folk-music': 'https://images.unsplash.com/photo-1598901704027-18db7e0e8c60?crop=entropy&cs=srgb&fm=jpg&q=85&w=200',
    'jazz': 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?crop=entropy&cs=srgb&fm=jpg&q=85&w=200',
    'rock': 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?crop=entropy&cs=srgb&fm=jpg&q=85&w=200',
    'pop': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?crop=entropy&cs=srgb&fm=jpg&q=85&w=200',
    'classical': 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?crop=entropy&cs=srgb&fm=jpg&q=85&w=200',
    'electronic': 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?crop=entropy&cs=srgb&fm=jpg&q=85&w=200',
  };

  const getGenreBannerImage = (genre: any) => {
    // First try slug-based fallback
    if (genre.slug && genreBannerImages[genre.slug]) {
      return genreBannerImages[genre.slug];
    }
    // Default fallback - music related image
    return 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?crop=entropy&cs=srgb&fm=jpg&q=85&w=200';
  };

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
      <Image 
        source={{ uri: logoUrl }} 
        style={{ width: '100%', height: '100%' }} 
        resizeMode="cover" 
      />
    ) : (
      <View style={[styles.logoPlaceholder, { width: '100%', height: '100%' }]}>
        <Ionicons name="radio" size={24} color={colors.textMuted} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Background Glow with BlurView */}
      <View style={styles.bgGradientContainer}>
        <BlurView intensity={80} tint="dark" style={styles.bgBlurView}>
          <View style={styles.bgGlowColor} />
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
              <>
                {/* Row 1 - 3 items */}
                <View style={styles.gridRow}>
                  {recentStations.slice(0, 3).map((station: Station, index: number) => (
                    <TouchableOpacity
                      key={station._id}
                      style={[styles.gridItem, index !== 2 && styles.gridItemMargin]}
                      onPress={() => handleStationPress(station)}
                    >
                      <View style={styles.gridImageContainer}>
                        <Image 
                          source={{ uri: getLogoUrl(station) || undefined }} 
                          style={styles.gridImage} 
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
                {/* Row 2 - next 3 items if available */}
                {recentStations.length > 3 && (
                  <View style={styles.gridRow}>
                    {recentStations.slice(3, 6).map((station: Station, index: number) => (
                      <TouchableOpacity
                        key={station._id}
                        style={[styles.gridItem, index !== 2 && styles.gridItemMargin]}
                        onPress={() => handleStationPress(station)}
                      >
                        <View style={styles.gridImageContainer}>
                          <Image 
                            source={{ uri: getLogoUrl(station) || undefined }} 
                            style={styles.gridImage} 
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
                )}
              </>
            ) : (
              <Text style={styles.emptyText}>No recently played stations</Text>
            )}
          </View>

          {/* Radios Near You - 3 Column Grid, multiple rows */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Radios Near You{country ? ` - ${country}` : ''}</Text>
            </View>
            {/* Render rows of 3 items each */}
            {Array.from({ length: Math.ceil(Math.min(popularStations.length, 12) / 3) }).map((_, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.gridRow}>
                {popularStations.slice(rowIndex * 3, (rowIndex + 1) * 3).map((station: Station, index: number) => (
                  <TouchableOpacity
                    key={`nearby-${station._id}-${rowIndex}`}
                    style={[styles.gridItem, index !== 2 && styles.gridItemMargin]}
                    onPress={() => handleStationPress(station)}
                  >
                    <View style={styles.gridImageContainer}>
                      <Image 
                        source={{ uri: getLogoUrl(station) || undefined }} 
                        style={styles.gridImage} 
                        resizeMode="cover" 
                      />
                    </View>
                    <Text style={styles.stationGridName} numberOfLines={1}>{station.name}</Text>
                    <Text style={styles.stationGridCountry} numberOfLines={1}>
                      {station.country || 'Radio'}
                    </Text>
                  </TouchableOpacity>
                ))}
                {/* Fill empty slots if last row has less than 3 items */}
                {popularStations.slice(rowIndex * 3, (rowIndex + 1) * 3).length < 3 && 
                  Array.from({ length: 3 - popularStations.slice(rowIndex * 3, (rowIndex + 1) * 3).length }).map((_, i) => (
                    <View key={`empty-nearby-${i}`} style={styles.gridItem} />
                  ))
                }
              </View>
            ))}
            <TouchableOpacity style={styles.seeMoreButton}>
              <Text style={styles.seeMoreText}>See More</Text>
            </TouchableOpacity>
          </View>

          {/* Discoverable Genres Swiper - Horizontal Carousel */}
          {discoverableGenresList.length > 0 && (
            <FlatList
              horizontal
              data={discoverableGenresList}
              keyExtractor={(item: any) => item._id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: HORIZONTAL_PADDING, gap: 12, marginBottom: spacing.lg }}
              renderItem={({ item: genre, index }) => {
                const gradientColors = [
                  ['#0066FF', '#00BFFF'],
                  ['#5C27F4', '#9F3FFF'],
                  ['#FF6B6B', '#FF8E53'],
                  ['#11998e', '#38ef7d'],
                  ['#FC466B', '#3F5EFB'],
                ][index % 5];
                
                // Use API image
                const imageUrl = genre.discoverableImage 
                  ? `https://themegaradio.com${genre.discoverableImage}`
                  : getGenreBannerImage(genre);
                
                return (
                  <TouchableOpacity 
                    style={styles.discoverableBannerItem}
                    onPress={() => handleGenrePress(genre)}
                  >
                    <LinearGradient
                      colors={gradientColors as any}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.discoverableBannerGradient}
                    >
                      <Image 
                        source={{ uri: imageUrl }}
                        style={styles.discoverableBannerImage}
                        resizeMode="cover"
                      />
                      <View style={styles.discoverableBannerContent}>
                        <Text style={styles.discoverableBannerTitle}>{genre.name}</Text>
                        <Text style={styles.discoverableBannerSubtitle}>Discover all the stations</Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {/* Favorites From Users - Real API data with specified dimensions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Favorites From Users</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.usersList}>
              {(publicProfiles && publicProfiles.length > 0 ? publicProfiles : []).slice(0, 6).map((user: any, index: number) => (
                <TouchableOpacity 
                  key={user._id || index} 
                  style={styles.userItem}
                >
                  <View style={styles.userAvatar}>
                    {user.profileImageUrl ? (
                      <Image source={{ uri: user.profileImageUrl }} style={styles.userAvatarImage} />
                    ) : (
                      <Ionicons name="person" size={20} color={colors.textMuted} />
                    )}
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userNameText}>{user.name || 'User'}</Text>
                    <Text style={styles.userRadioCount}>{user.favorites_count || 0} Radios</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* All Stations - 3 Column Grid with specified dimensions (100x144) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>All Stations</Text>
            </View>
            {allStationsLoading ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <>
                {/* Render rows of 3 items each */}
                {Array.from({ length: Math.ceil(Math.min(allStations.length, 21) / 3) }).map((_, rowIndex) => (
                  <View key={`all-row-${rowIndex}`} style={styles.gridRow}>
                    {allStations.slice(rowIndex * 3, (rowIndex + 1) * 3).map((station: Station, index: number) => (
                      <TouchableOpacity
                        key={station._id}
                        style={[styles.gridItem, index !== 2 && styles.gridItemMargin]}
                        onPress={() => handleStationPress(station)}
                      >
                        <View style={styles.gridImageContainer}>
                          {renderStationLogo(station, 120)}
                        </View>
                        <Text style={styles.stationGridName} numberOfLines={1}>{station.name}</Text>
                        <Text style={styles.stationGridCountry} numberOfLines={1}>
                          {station.country || 'Radio'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {/* Fill empty slots if last row has less than 3 items */}
                    {allStations.slice(rowIndex * 3, (rowIndex + 1) * 3).length < 3 && 
                      Array.from({ length: 3 - allStations.slice(rowIndex * 3, (rowIndex + 1) * 3).length }).map((_, i) => (
                        <View key={`empty-${i}`} style={styles.gridItem} />
                      ))
                    }
                  </View>
                ))}
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
  
  // Background Glow with BlurView
  bgGradientContainer: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 350,
    height: 350,
    zIndex: 0,
    borderRadius: 175,
    overflow: 'hidden',
  },
  bgBlurView: {
    flex: 1,
  },
  bgGlowColor: {
    flex: 1,
    backgroundColor: 'rgba(107, 78, 255, 0.35)',
    borderRadius: 175,
  },
  
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 180,
    paddingHorizontal: SIDE_PADDING,
  },

  // Header - Full width
  header: {
    width: '100%',
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

  // Section - Full width
  section: {
    width: '100%',
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

  // Station Grid Custom - 3 columns with percentage-based width for reliability
  stationGridCustom: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  stationGridItem: {
    marginBottom: 12,
  },
  
  // New Grid styles for larger cards and smaller gaps
  gridRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 8,
  },
  gridItem: {
    flex: 1,
  },
  gridItemMargin: {
    marginRight: 8,
  },
  gridImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    marginBottom: 6,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  
  stationGridLogo: {
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

  // Discoverable Genres Banner Swiper
  discoverableBannerItem: {
    width: 300,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
  },
  discoverableBannerGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 12,
  },
  discoverableBannerImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  discoverableBannerContent: {
    flex: 1,
  },
  discoverableBannerTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  discoverableBannerSubtitle: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },

  // Users List - Full width with specified dimensions
  usersList: {
    width: '100%',
  },
  userItem: {
    width: '100%', // Will be 345px with 15px padding on each side from parent
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 8,
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

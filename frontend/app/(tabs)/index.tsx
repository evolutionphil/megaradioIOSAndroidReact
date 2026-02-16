import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
import { GlowEffect } from '../../src/components/GlowEffect';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { colors, gradients, spacing, borderRadius, typography } from '../../src/constants/theme';
import { SectionSkeleton, UserItemSkeleton } from '../../src/components/Skeleton';
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
import { preloadPublicProfileFavorites } from '../../src/services/preloadService';
import { useAudioPlayer } from '../../src/hooks/useAudioPlayer';
import { usePlayerStore } from '../../src/store/playerStore';
import { useAuthStore } from '../../src/store/authStore';
import { useLocationStore } from '../../src/store/locationStore';
import { useRecentlyPlayedStore } from '../../src/store/recentlyPlayedStore';
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
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const preloadStarted = useRef(false);
  const { user } = useAuthStore();
  const { width: windowWidth } = useWindowDimensions();
  const { countryCode, country, countryEnglish, latitude, longitude, fetchLocation } = useLocationStore();

  // Debug avatar
  useEffect(() => {
    console.log('[HomeScreen] User avatar:', user?.avatar, 'profilePhoto:', user?.profilePhoto);
  }, [user]);

  // Fetch location on mount
  useEffect(() => {
    fetchLocation();
  }, []);

  // Recently played from local storage
  const { stations: localRecentStations, loadFromStorage: loadRecent } = useRecentlyPlayedStore();
  useEffect(() => { loadRecent(); }, []);
  
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

  // Use English name for popular stations API, native for stations API
  const { data: popularData, isLoading: popularLoading, refetch: refetchPopular } = usePopularStations(countryEnglish || country || undefined, 8);
  const { data: genresData, isLoading: genresLoading, refetch: refetchGenres } = usePrecomputedGenres(countryCode || undefined);
  const { data: discoverableGenres, refetch: refetchDiscoverable } = useDiscoverableGenres();
  const { data: recentlyPlayedData, refetch: refetchRecent } = useRecentlyPlayed();
  const { data: communityFavorites, refetch: refetchCommunity } = useCommunityFavorites(10);
  const { data: publicProfiles, refetch: refetchProfiles } = usePublicProfiles(10);
  // Use native country name for stations list API
  const { data: allStationsData, isLoading: allStationsLoading, refetch: refetchAll } = useStations({ limit: 21, country: country || undefined });
  const { data: nearbyData, refetch: refetchNearby } = useNearbyStations(latitude, longitude, 150, 12);

  // Preload user favorites when public profiles are loaded
  useEffect(() => {
    if (publicProfiles && publicProfiles.length > 0 && !preloadStarted.current) {
      preloadStarted.current = true;
      console.log('[HomeScreen] Starting preload for', publicProfiles.length, 'users');
      // Run in background without blocking UI
      preloadPublicProfileFavorites(publicProfiles, queryClient).catch(err => {
        console.log('[HomeScreen] Preload error (non-blocking):', err);
      });
    }
  }, [publicProfiles, queryClient]);

  const { playStation } = useAudioPlayer();
  const { currentStation, playbackState } = usePlayerStore();

  // Refetch genres when country changes
  useEffect(() => {
    console.log('[HomeScreen] Country changed, refetching genres...', countryCode);
    refetchGenres();
  }, [countryCode]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchPopular(), refetchGenres(), refetchDiscoverable(), refetchRecent(), refetchCommunity(), refetchProfiles(), refetchAll(), refetchNearby()]);
    setRefreshing(false);
  }, []);

  const handleStationPress = (station: Station) => {
    playStation(station);
  };

  const handleGenrePress = (genre: Genre) => {
    // Navigate directly to genre-detail page
    router.push({
      pathname: '/genre-detail',
      params: { slug: genre.slug, name: genre.name },
    });
  };

  // Sort genres by station count (most popular first) then take first 8
  const genres = useMemo(() => {
    const allGenres = genresData?.data || [];
    return [...allGenres]
      .sort((a, b) => (b.stationCount || b.total_stations || 0) - (a.stationCount || a.total_stations || 0))
      .slice(0, 8);
  }, [genresData]);
  const popularStations = popularData?.stations || [];
  const recentStations = localRecentStations;
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

  const FALLBACK_LOGO = require('../../assets/megaradio-icon.png');
  
  const getLogoUrl = (station: Station) => {
    if (station.logoAssets?.webp96) {
      return `https://themegaradio.com/station-logos/${station.logoAssets.folder}/${station.logoAssets.webp96}`;
    }
    const raw = station.favicon || station.logo || null;
    if (raw && raw.startsWith('/')) return `https://themegaradio.com${raw}`;
    return raw;
  };

  const renderStationLogo = (station: Station, size: number = 100) => {
    const logoUrl = getLogoUrl(station);
    return (
      <Image 
        source={logoUrl ? { uri: logoUrl } : FALLBACK_LOGO} 
        style={{ width: '100%', height: '100%' }} 
        resizeMode="cover" 
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Background Glow - SVG RadialGradient for real soft glow */}
      <GlowEffect size={430} top={-130} left={-160} opacity={0.35} />
      
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
            <TouchableOpacity 
              style={styles.headerLeft}
              onPress={() => user ? router.push('/(tabs)/profile') : router.push('/auth-options')}
              activeOpacity={0.7}
              data-testid="header-profile-btn"
            >
              <View style={styles.avatarContainer}>
                {user?.avatar || user?.profilePhoto ? (
                  <Image 
                    source={{ uri: (user.avatar || user.profilePhoto)?.startsWith('http') 
                      ? (user.avatar || user.profilePhoto) 
                      : `https://themegaradio.com${user.avatar || user.profilePhoto}` 
                    }} 
                    style={styles.avatarImage}
                  />
                ) : (
                  <LinearGradient
                    colors={['#00FF87', '#60EFFF'] as any}
                    style={styles.avatarGradient}
                  >
                    <Ionicons name="person" size={20} color="#000" />
                  </LinearGradient>
                )}
              </View>
              <View>
                <Text style={styles.welcomeText}>Welcome Back</Text>
                <Text style={styles.userName}>{user?.name || user?.fullName || 'Guest'}</Text>
              </View>
            </TouchableOpacity>
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
              <Text style={styles.sectionTitle}>{t('genres')}</Text>
              <TouchableOpacity onPress={() => router.push('/discover')}>
                <Text style={styles.seeAllText}>{t('homepage_see_all')}</Text>
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
              <Text style={styles.sectionTitle}>{t('popular_stations')}</Text>
            </View>
            {popularLoading ? (
              <SectionSkeleton itemCount={4} horizontal={false} title={false} />
            ) : popularStations.length === 0 ? (
              <Text style={styles.emptyText}>{t('no_stations_found')}</Text>
            ) : (
              <View style={styles.popularList}>
                {popularStations.slice(0, 4).map((station) => {
                  const logoUrl = getLogoUrl(station);
                  return (
                    <TouchableOpacity
                      key={station._id}
                      style={styles.popularItem}
                      onPress={() => handleStationPress(station)}
                    >
                      <View style={styles.popularLogo}>
                        <Image 
                          source={logoUrl ? { uri: logoUrl } : FALLBACK_LOGO} 
                          style={styles.popularLogoImage} 
                          resizeMode="cover" 
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
                  );
                })}
              </View>
            )}
          </View>

          {/* Recently Played - 3 Column Grid, 6 stations */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('homepage_recently_played')}</Text>
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
                          source={getLogoUrl(station) ? { uri: getLogoUrl(station) } : FALLBACK_LOGO} 
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
                            source={getLogoUrl(station) ? { uri: getLogoUrl(station) } : FALLBACK_LOGO} 
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
              <Text style={styles.emptyText}>{t('no_recently_played')}</Text>
            )}
          </View>

          {/* Radios Near You - 3 Column Grid, multiple rows */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('stations_near_you')}{country ? ` - ${country}` : ''}</Text>
            </View>
            {/* Render rows of 3 items each - use nearby GPS stations */}
            {nearbyStations.length > 0 ? (
              Array.from({ length: Math.ceil(Math.min(nearbyStations.length, 12) / 3) }).map((_, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.gridRow}>
                  {nearbyStations.slice(rowIndex * 3, (rowIndex + 1) * 3).map((station: Station, index: number) => (
                    <TouchableOpacity
                      key={`nearby-${station._id}-${rowIndex}`}
                      style={[styles.gridItem, index !== 2 && styles.gridItemMargin]}
                      onPress={() => handleStationPress(station)}
                    >
                      <View style={styles.gridImageContainer}>
                        <Image 
                          source={getLogoUrl(station) ? { uri: getLogoUrl(station) } : FALLBACK_LOGO} 
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
                  {nearbyStations.slice(rowIndex * 3, (rowIndex + 1) * 3).length < 3 && 
                    Array.from({ length: 3 - nearbyStations.slice(rowIndex * 3, (rowIndex + 1) * 3).length }).map((_, i) => (
                      <View key={`empty-nearby-${i}`} style={styles.gridItem} />
                    ))
                  }
                </View>
              ))
            ) : popularStations.length > 0 ? (
              Array.from({ length: Math.ceil(Math.min(popularStations.length, 12) / 3) }).map((_, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.gridRow}>
                  {popularStations.slice(rowIndex * 3, (rowIndex + 1) * 3).map((station: Station, index: number) => (
                    <TouchableOpacity
                      key={`nearby-${station._id}-${rowIndex}`}
                      style={[styles.gridItem, index !== 2 && styles.gridItemMargin]}
                      onPress={() => handleStationPress(station)}
                    >
                      <View style={styles.gridImageContainer}>
                        <Image 
                          source={getLogoUrl(station) ? { uri: getLogoUrl(station) } : FALLBACK_LOGO} 
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
              ))
            ) : (
              <Text style={styles.emptyText}>{t('enable_location')}</Text>
            )}
            <TouchableOpacity style={styles.seeMoreButton}>
              <Text style={styles.seeMoreText}>{t('see_more')}</Text>
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
                // Use API image - discoverableImage from API
                const apiImageUrl = genre.discoverableImage 
                  ? `https://themegaradio.com${genre.discoverableImage}`
                  : null;
                
                // Debug log
                console.log('[Discoverable] Genre:', genre.name, 'discoverableImage:', genre.discoverableImage, 'using:', apiImageUrl);
                
                // Only use API image, fallback to placeholder if not available
                const imageUrl = apiImageUrl || 'https://themegaradio.com/images/genre-bg-grad-1.webp';
                
                return (
                  <TouchableOpacity 
                    style={styles.discoverableBannerItem}
                    onPress={() => handleGenrePress(genre)}
                  >
                    <Image 
                      source={{ uri: imageUrl }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                    />
                    {/* Dark gradient overlay on right side for text readability */}
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)']}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.discoverableBannerContent}>
                      <Text style={styles.discoverableBannerTitle}>{genre.name}</Text>
                      <Text style={styles.discoverableBannerSubtitle}>{t('discover_all_stations', 'Discover All Stations')}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {/* Favorites From Users - Real API data with specified dimensions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('homepage_favorites_from_users')}</Text>
              <TouchableOpacity onPress={() => router.push('/users')} data-testid="see-all-users-btn">
                <Text style={styles.seeAllText}>{t('homepage_see_all')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.usersList}>
              {(publicProfiles && publicProfiles.length > 0 ? publicProfiles : []).slice(0, 6).map((profileUser: any, index: number) => (
                <TouchableOpacity 
                  key={profileUser._id || index} 
                  style={styles.userItem}
                  onPress={() => router.push({
                    pathname: '/user-profile',
                    params: {
                      userId: profileUser._id,
                      userName: profileUser.name || profileUser.fullName || 'User',
                      userAvatar: profileUser.profileImageUrl || profileUser.avatar || ''
                    }
                  })}
                  data-testid={`user-profile-${profileUser._id}`}
                >
                  <View style={styles.userAvatar}>
                    {profileUser.profileImageUrl ? (
                      <Image source={{ uri: profileUser.profileImageUrl }} style={styles.userAvatarImage} />
                    ) : (
                      <Ionicons name="person" size={20} color={colors.textMuted} />
                    )}
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userNameText}>{profileUser.name || 'User'}</Text>
                    <Text style={styles.userRadioCount}>{profileUser.favorites_count || 0} Radios</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* All Stations - 3 Column Grid with specified dimensions (100x144) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('homepage_all_stations')}</Text>
            </View>
            {allStationsLoading ? (
              <SectionSkeleton itemCount={9} horizontal={false} title={false} />
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
                <TouchableOpacity style={styles.seeMoreButton} onPress={() => router.push('/all-stations')}>
                  <Text style={styles.seeMoreText}>{t('see_more')}</Text>
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
  
  // Glow removed - using GlowEffect SVG component
  
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
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
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
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
  },
  discoverableBannerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
  },
  discoverableBannerTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'left',
  },
  discoverableBannerSubtitle: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    textAlign: 'left',
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

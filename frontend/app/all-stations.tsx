import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { colors, gradients, spacing, borderRadius, typography } from '../src/constants/theme';
import { useStations } from '../src/hooks/useQueries';
import { useAudioPlayer } from '../src/hooks/useAudioPlayer';
import { usePlayerStore } from '../src/store/playerStore';
import { useLocationStore } from '../src/store/locationStore';
import { useResponsive } from '../src/hooks/useResponsive';
import { SortBottomSheet, SortOption, ViewMode } from '../src/components/SortBottomSheet';
import type { Station } from '../src/types';

const VIEW_MODE_STORAGE_KEY = '@megaradio_view_mode';

// Local fallback logo asset (no network required)
const DEFAULT_STATION_LOGO_SOURCE = require('../assets/images/default-station-logo.png');

export default function AllStationsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const genreSlug = params.genre as string | undefined;
  const genreName = params.genreName as string | undefined;
  // Get country from params (passed from See More) or fall back to location store
  const paramCountry = params.country as string | undefined;
  const paramCountryCode = params.countryCode as string | undefined;
  const { width: windowWidth } = useWindowDimensions();
  
  // Responsive layout
  const responsive = useResponsive();
  const gridMetrics = responsive.getGridMetrics();
  const GRID_COLUMNS = gridMetrics.columns;
  const GRID_ITEM_WIDTH = gridMetrics.itemWidth;

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('popular');
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  
  // Use param country if available, otherwise use location store
  const { countryCode: storeCountryCode, country: storeCountry } = useLocationStore();
  const countryCode = paramCountryCode || storeCountryCode;
  const country = paramCountry || storeCountry;

  // Load saved view mode preference on mount
  useEffect(() => {
    const loadViewMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(VIEW_MODE_STORAGE_KEY);
        if (savedMode === 'grid' || savedMode === 'list') {
          setViewMode(savedMode);
        }
      } catch (error) {
        console.log('Error loading view mode:', error);
      }
    };
    loadViewMode();
  }, []);

  // Save view mode preference when changed
  const handleViewModeChange = useCallback(async (mode: ViewMode) => {
    setViewMode(mode);
    try {
      await AsyncStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch (error) {
      console.log('Error saving view mode:', error);
    }
  }, []);

  // Note: Backend doesn't support sort/order params reliably, so we fetch all and sort client-side
  const { data, isLoading, refetch } = useStations({
    limit: 100,
    genre: genreSlug || undefined,
    country: countryCode || undefined,
  });

  const { playStation } = useAudioPlayer();
  const { currentStation, playbackState } = usePlayerStore();

  const stations = data?.stations || [];
  const totalCount = data?.totalCount || stations.length;

  // Client-side sorting function (backend doesn't support all sort options)
  const sortStations = useCallback((stationsToSort: Station[], option: SortOption): Station[] => {
    const sorted = [...stationsToSort];
    
    switch (option) {
      case 'az':
        return sorted.sort((a, b) => a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' }));
      case 'za':
        return sorted.sort((a, b) => b.name.localeCompare(a.name, 'tr', { sensitivity: 'base' }));
      case 'popular':
        return sorted.sort((a, b) => (b.votes || 0) - (a.votes || 0));
      default:
        return sorted;
    }
  }, []);

  // Filter stations by search and then apply client-side sorting
  const filteredStations = useMemo(() => {
    let result = stations;
    
    // First, filter by search query if present
    if (searchQuery.trim()) {
      result = result.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.country?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Then apply client-side sorting
    return sortStations(result, sortOption);
  }, [stations, searchQuery, sortOption, sortStations]);

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

  const isStationPlaying = (station: Station) => {
    return currentStation?._id === station._id && playbackState === 'playing';
  };

  const isStationLoading = (station: Station) => {
    return currentStation?._id === station._id &&
      (playbackState === 'loading' || playbackState === 'buffering');
  };

  // Show genre name or "All Stations in [Country]"
  const title = genreName 
    ? genreName 
    : country 
      ? `${t('all_stations', 'All Stations')} - ${country}` 
      : t('all_stations', 'All Stations');

  // Helper function to build reliable logo URL with fallback
  const getLogoUrl = useCallback((station: Station): string => {
    const DEFAULT_LOGO = 'https://themegaradio.com/logo.png';
    
    try {
      if (station.logoAssets?.webp96 && station.logoAssets?.folder) {
        const folder = encodeURIComponent(station.logoAssets.folder);
        const file = encodeURIComponent(station.logoAssets.webp96);
        return `https://themegaradio.com/station-logos/${folder}/${file}`;
      }
      if (station.favicon && typeof station.favicon === 'string') {
        const favicon = station.favicon.trim();
        if (favicon && favicon !== 'null' && favicon !== 'undefined') {
          if (favicon.startsWith('http://') || favicon.startsWith('https://')) {
            return favicon;
          } else if (favicon.startsWith('/')) {
            return `https://themegaradio.com${favicon}`;
          }
        }
      }
      if (station.logo && typeof station.logo === 'string') {
        const logo = station.logo.trim();
        if (logo && logo !== 'null' && logo !== 'undefined') {
          if (logo.startsWith('http://') || logo.startsWith('https://')) {
            return logo;
          } else if (logo.startsWith('/')) {
            return `https://themegaradio.com${logo}`;
          }
        }
      }
    } catch (e) {
      console.log('[AllStations] Error building logo URL:', e);
    }
    return DEFAULT_LOGO;
  }, []);

  // Grid Item Component
  const renderGridItem = (station: Station) => {
    const logoUrl = getLogoUrl(station);
    const playing = isStationPlaying(station);
    const [imageError, setImageError] = useState(false);

    return (
      <TouchableOpacity
        key={station._id}
        style={[styles.gridItem, { width: GRID_ITEM_WIDTH }, playing && styles.gridItemActive]}
        onPress={() => handleStationPress(station)}
        activeOpacity={0.7}
        data-testid={`grid-station-${station._id}`}
      >
        <View style={[styles.gridLogoContainer, { width: GRID_ITEM_WIDTH, height: GRID_ITEM_WIDTH }]}>
          <Image
            source={imageError ? DEFAULT_STATION_LOGO_SOURCE : { uri: logoUrl }}
            style={styles.gridLogo}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        </View>
        <Text style={[styles.gridName, { width: GRID_ITEM_WIDTH }]} numberOfLines={1}>{station.name}</Text>
        <Text style={[styles.gridLocation, { width: GRID_ITEM_WIDTH }]} numberOfLines={1}>
          {station.country}{station.state ? `, ${station.state}` : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  // List Item Component
  const renderListItem = (station: Station) => {
    const logoUrl = getLogoUrl(station);
    const playing = isStationPlaying(station);
    const loading = isStationLoading(station);
    const [imageError, setImageError] = useState(false);

    return (
      <TouchableOpacity
        key={station._id}
        style={[styles.listItem, playing && styles.listItemActive]}
        onPress={() => handleStationPress(station)}
        activeOpacity={0.7}
        data-testid={`list-station-${station._id}`}
      >
        <View style={styles.listLogoContainer}>
          <Image
            source={imageError ? DEFAULT_STATION_LOGO_SOURCE : { uri: logoUrl }}
            style={styles.listLogo}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        </View>
        <View style={styles.listInfo}>
          <Text style={styles.listName} numberOfLines={1}>{station.name}</Text>
          <Text style={styles.listLocation} numberOfLines={1}>
            {station.country}{station.state ? `, ${station.state}` : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.playButton, playing && styles.playButtonActive]}
          onPress={() => handleStationPress(station)}
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
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <LinearGradient colors={gradients.background as any} style={styles.gradient}>
        <SafeAreaView style={styles.container} edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleBackPress}
              data-testid="all-stations-back-btn"
            >
              <Ionicons name="chevron-back" size={28} color={colors.text} />
            </TouchableOpacity>
            
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{totalCount}</Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => setShowSortSheet(true)}
                data-testid="sort-btn"
              >
                <Ionicons name="filter" size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => router.push('/search')}
                data-testid="search-btn"
              >
                <Ionicons name="search" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar (appears when search icon is pressed) */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('search_stations', 'Search stations...')}
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                data-testid="stations-search-input"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {isLoading && stations.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
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
              {viewMode === 'grid' ? (
                <View style={styles.gridContainer}>
                  {/* Render items in rows based on responsive columns */}
                  {Array.from({ length: Math.ceil(filteredStations.length / GRID_COLUMNS) }).map((_, rowIndex) => (
                    <View key={`row-${rowIndex}`} style={[styles.gridRow, { gap: gridMetrics.gap }]}>
                      {filteredStations.slice(rowIndex * GRID_COLUMNS, (rowIndex + 1) * GRID_COLUMNS).map(renderGridItem)}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={[styles.listContainer, responsive.isTablet && { flexDirection: 'row', flexWrap: 'wrap' }]}>
                  {filteredStations.map((station) => (
                    <View key={station._id} style={responsive.isTablet ? { width: '50%', paddingHorizontal: 4 } : undefined}>
                      {renderListItem(station)}
                    </View>
                  ))}
                </View>
              )}

              {filteredStations.length === 0 && !isLoading && (
                <View style={styles.emptyState}>
                  <Ionicons name="radio-outline" size={48} color={colors.textMuted} />
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No stations found' : 'No stations available'}
                  </Text>
                </View>
              )}

              {/* See More Button */}
              {stations.length >= 100 && (
                <View style={styles.seeMoreContainer}>
                  <TouchableOpacity 
                    style={styles.seeMoreButton}
                    onPress={() => setPage(p => p + 1)}
                    data-testid="see-more-btn"
                  >
                    <Text style={styles.seeMoreText}>See More</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}

          <SortBottomSheet
            visible={showSortSheet}
            onClose={() => setShowSortSheet(false)}
            sortOption={sortOption}
            onSortChange={setSortOption}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
          />
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
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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

  // Grid View
  gridContainer: {
    paddingHorizontal: spacing.md,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  gridItem: {
    alignItems: 'center',
  },
  gridItemActive: {
    opacity: 0.8,
  },
  gridLogoContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    marginBottom: spacing.xs,
  },
  gridLogo: {
    width: '100%',
    height: '100%',
  },
  gridPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
  },
  gridName: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.bold,
    color: colors.text,
  },
  gridLocation: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },

  // List View
  listContainer: {
    paddingHorizontal: spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  listItemActive: {
    backgroundColor: colors.surfaceLight,
  },
  listLogoContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  listLogo: {
    width: '100%',
    height: '100%',
  },
  listPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
  },
  listInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  listName: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginBottom: 2,
  },
  listLocation: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonActive: {
    backgroundColor: colors.primary,
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

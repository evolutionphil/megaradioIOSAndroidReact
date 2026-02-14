import React, { useState, useCallback, useMemo } from 'react';
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
import { colors, gradients, spacing, borderRadius, typography } from '../src/constants/theme';
import { useStations } from '../src/hooks/useQueries';
import { useAudioPlayer } from '../src/hooks/useAudioPlayer';
import { usePlayerStore } from '../src/store/playerStore';
import { useLocationStore } from '../src/store/locationStore';
import { SortBottomSheet, SortOption, ViewMode } from '../src/components/SortBottomSheet';
import type { Station } from '../src/types';

const GRID_COLUMNS = 3;

export default function AllStationsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const genreSlug = params.genre as string | undefined;
  const genreName = params.genreName as string | undefined;
  const { width: windowWidth } = useWindowDimensions();
  
  // Calculate grid item width dynamically with fallback
  const screenWidth = windowWidth > 100 ? windowWidth : 375;
  const GRID_ITEM_WIDTH = Math.floor((screenWidth - 32 - 16) / GRID_COLUMNS); // 32 = padding, 16 = gaps

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('popular');
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  
  const { countryCode } = useLocationStore();

  // Map sortOption to API parameters
  const getApiSort = () => {
    switch (sortOption) {
      case 'popular': return { sort: 'votes', order: 'desc' };
      case 'newest': return { sort: 'createdAt', order: 'desc' };
      case 'oldest': return { sort: 'createdAt', order: 'asc' };
      case 'az': return { sort: 'name', order: 'asc' };
      case 'za': return { sort: 'name', order: 'desc' };
      default: return { sort: 'votes', order: 'desc' };
    }
  };

  const apiSort = getApiSort();

  const { data, isLoading, refetch } = useStations({
    sort: apiSort.sort,
    order: apiSort.order as 'asc' | 'desc',
    limit: 100,
    genre: genreSlug || undefined,
    country: countryCode || undefined,
  });

  const { playStation } = useAudioPlayer();
  const { currentStation, playbackState } = usePlayerStore();

  const stations = data?.stations || [];
  const totalCount = data?.totalCount || stations.length;

  // Filter stations by search
  const filteredStations = useMemo(() => {
    if (!searchQuery.trim()) return stations;
    return stations.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.country?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [stations, searchQuery]);

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

  const title = genreName || 'All Stations';

  // Grid Item Component
  const renderGridItem = (station: Station) => {
    const logoUrl = station.logoAssets?.webp96 || station.favicon || station.logo;
    const playing = isStationPlaying(station);

    return (
      <TouchableOpacity
        key={station._id}
        style={[styles.gridItem, { width: GRID_ITEM_WIDTH }, playing && styles.gridItemActive]}
        onPress={() => handleStationPress(station)}
        activeOpacity={0.7}
        data-testid={`grid-station-${station._id}`}
      >
        <View style={[styles.gridLogoContainer, { width: GRID_ITEM_WIDTH, height: GRID_ITEM_WIDTH }]}>
          {logoUrl ? (
            <Image
              source={{ uri: logoUrl }}
              style={styles.gridLogo}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.gridPlaceholder}>
              <Ionicons name="radio" size={32} color={colors.textMuted} />
            </View>
          )}
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
    const logoUrl = station.logoAssets?.webp96 || station.favicon || station.logo;
    const playing = isStationPlaying(station);
    const loading = isStationLoading(station);

    return (
      <TouchableOpacity
        key={station._id}
        style={[styles.listItem, playing && styles.listItemActive]}
        onPress={() => handleStationPress(station)}
        activeOpacity={0.7}
        data-testid={`list-station-${station._id}`}
      >
        <View style={styles.listLogoContainer}>
          {logoUrl ? (
            <Image
              source={{ uri: logoUrl }}
              style={styles.listLogo}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.listPlaceholder}>
              <Ionicons name="radio" size={24} color={colors.textMuted} />
            </View>
          )}
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

  // Sort Modal
  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowSortModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowSortModal(false)}
      >
        <View style={styles.sortModal}>
          <Text style={styles.sortModalTitle}>Sort By</Text>
          
          <TouchableOpacity
            style={[styles.sortOption, sortOption === 'votes' && styles.sortOptionActive]}
            onPress={() => { setSortOption('votes'); setShowSortModal(false); }}
          >
            <Text style={[styles.sortOptionText, sortOption === 'votes' && styles.sortOptionTextActive]}>
              Most Popular
            </Text>
            {sortOption === 'votes' && <Ionicons name="checkmark" size={20} color={colors.primary} />}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.sortOption, sortOption === 'name' && styles.sortOptionActive]}
            onPress={() => { setSortOption('name'); setShowSortModal(false); }}
          >
            <Text style={[styles.sortOptionText, sortOption === 'name' && styles.sortOptionTextActive]}>
              Name (A-Z)
            </Text>
            {sortOption === 'name' && <Ionicons name="checkmark" size={20} color={colors.primary} />}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.sortOption, sortOption === 'clickCount' && styles.sortOptionActive]}
            onPress={() => { setSortOption('clickCount'); setShowSortModal(false); }}
          >
            <Text style={[styles.sortOptionText, sortOption === 'clickCount' && styles.sortOptionTextActive]}>
              Most Played
            </Text>
            {sortOption === 'clickCount' && <Ionicons name="checkmark" size={20} color={colors.primary} />}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
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
                placeholder="Search stations..."
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
              {viewMode === 'grid' ? (
                <View style={styles.gridContainer}>
                  {/* Render items in rows of 3 */}
                  {Array.from({ length: Math.ceil(filteredStations.length / GRID_COLUMNS) }).map((_, rowIndex) => (
                    <View key={`row-${rowIndex}`} style={styles.gridRow}>
                      {filteredStations.slice(rowIndex * GRID_COLUMNS, (rowIndex + 1) * GRID_COLUMNS).map(renderGridItem)}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.listContainer}>
                  {filteredStations.map(renderListItem)}
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

          {renderSortModal()}
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

  // Sort Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortModal: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '80%',
    maxWidth: 320,
  },
  sortModalTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  sortOptionActive: {
    backgroundColor: colors.surface,
  },
  sortOptionText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.medium,
    color: colors.textSecondary,
  },
  sortOptionTextActive: {
    color: colors.primary,
  },
});

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors, gradients, spacing, borderRadius, typography } from '../src/constants/theme';
import { useNearbyStations } from '../src/hooks/useQueries';
import { useLocationStore } from '../src/store/locationStore';
import { usePlayerStore } from '../src/store/playerStore';
import { useResponsive } from '../src/hooks/useResponsive';
import type { Station } from '../src/types';

type ViewMode = 'grid' | 'list';

export default function NearbyStationsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  
  // Location
  const { latitude, longitude, country } = useLocationStore();
  
  // Responsive layout
  const responsive = useResponsive();
  const gridMetrics = responsive.getGridMetrics();
  const GRID_COLUMNS = gridMetrics.columns;
  const GRID_ITEM_WIDTH = gridMetrics.itemWidth;

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [refreshing, setRefreshing] = useState(false);
  
  // Player state
  const { currentStation, playbackState, play. } = usePlayerStore();

  // Fetch nearby stations - larger radius (200km) and more stations
  const { data: nearbyData, isLoading, refetch } = useNearbyStations(latitude, longitude, 200, 100);
  
  const stations = useMemo(() => {
    const stationsList = Array.isArray(nearbyData) ? nearbyData : (nearbyData?.stations || []);
    // Already sorted by distance from API, but ensure it
    return stationsList;
  }, [nearbyData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleStationPress = async (station: Station) => {
    try {
      await play(station);
    } catch (error) {
      console.error('Error playing station:', error);
    }
  };

  const isStationPlaying = (station: Station) => {
    return currentStation?._id === station._id && playbackState === 'playing';
  };

  const isStationLoading = (station: Station) => {
    return currentStation?._id === station._id &&
      (playbackState === 'loading' || playbackState === 'buffering');
  };

  // Get logo URL helper
  const getLogoUrl = useCallback((station: Station): string | null => {
    if (station.logoAssets?.webp96) {
      return `https://themegaradio.com/station-logos/${station.logoAssets.folder}/${station.logoAssets.webp96}`;
    }
    const favicon = station.favicon || station.logo;
    if (favicon && favicon.startsWith('https://')) {
      try {
        new URL(favicon);
        return favicon;
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  // Format distance
  const formatDistance = (distance?: number): string => {
    if (!distance) return '';
    if (distance < 1) {
      return `${Math.round(distance * 1000)} m`;
    }
    return `${distance.toFixed(1)} km`;
  };

  // Grid Item Component
  const renderGridItem = (station: Station) => {
    const logoUrl = getLogoUrl(station);
    const playing = isStationPlaying(station);
    const loading = isStationLoading(station);
    const distance = (station as any).distance;

    return (
      <TouchableOpacity
        key={station._id}
        style={[styles.gridItem, { width: GRID_ITEM_WIDTH }]}
        onPress={() => handleStationPress(station)}
        activeOpacity={0.7}
        data-testid={`grid-station-${station._id}`}
      >
        <View style={[styles.gridLogoContainer, playing && styles.gridLogoContainerActive]}>
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
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color={colors.text} />
            </View>
          )}
          {playing && !loading && (
            <View style={styles.playingIndicator}>
              <Ionicons name="volume-high" size={16} color={colors.accentPink} />
            </View>
          )}
        </View>
        <Text style={styles.gridName} numberOfLines={1}>{station.name}</Text>
        {distance && (
          <Text style={styles.gridDistance} numberOfLines={1}>
            <Ionicons name="location" size={10} color={colors.textMuted} /> {formatDistance(distance)}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  // List Item Component
  const renderListItem = (station: Station) => {
    const logoUrl = getLogoUrl(station);
    const playing = isStationPlaying(station);
    const loading = isStationLoading(station);
    const distance = (station as any).distance;

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
          <View style={styles.listMeta}>
            {distance && (
              <Text style={styles.listDistance}>
                <Ionicons name="location" size={12} color={colors.accentPink} /> {formatDistance(distance)}
              </Text>
            )}
            <Text style={styles.listLocation} numberOfLines={1}>
              {station.country}{station.state ? `, ${station.state}` : ''}
            </Text>
          </View>
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
              data-testid="nearby-stations-back-btn"
            >
              <Ionicons name="chevron-back" size={28} color={colors.text} />
            </TouchableOpacity>
            
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{t('stations_near_you', 'Stations Near You')}</Text>
              <Text style={styles.subtitle}>
                {stations.length} {t('stations', 'stations')}
                {country ? ` - ${country}` : ''}
              </Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={[styles.headerButton, viewMode === 'grid' && styles.headerButtonActive]}
                onPress={() => setViewMode('grid')}
                data-testid="view-grid-btn"
              >
                <Ionicons name="grid" size={20} color={viewMode === 'grid' ? colors.accentPink : colors.text} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.headerButton, viewMode === 'list' && styles.headerButtonActive]}
                onPress={() => setViewMode('list')}
                data-testid="view-list-btn"
              >
                <Ionicons name="menu" size={22} color={viewMode === 'list' ? colors.accentPink : colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accentPink} />
              <Text style={styles.loadingText}>{t('loading_stations', 'Loading stations...')}</Text>
            </View>
          ) : !latitude || !longitude ? (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={64} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>{t('location_required', 'Location Required')}</Text>
              <Text style={styles.emptyText}>
                {t('enable_location_message', 'Please enable location services to see stations near you.')}
              </Text>
            </View>
          ) : stations.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="radio-outline" size={64} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>{t('no_stations_nearby', 'No Stations Nearby')}</Text>
              <Text style={styles.emptyText}>
                {t('no_stations_nearby_message', 'We couldn\'t find any radio stations in your area.')}
              </Text>
            </View>
          ) : (
            <FlatList
              data={stations}
              keyExtractor={(item) => item._id}
              numColumns={viewMode === 'grid' ? GRID_COLUMNS : 1}
              key={viewMode === 'grid' ? `grid-${GRID_COLUMNS}` : 'list'}
              contentContainerStyle={[
                styles.listContent,
                viewMode === 'grid' && styles.gridContent,
              ]}
              renderItem={({ item }) => 
                viewMode === 'grid' ? renderGridItem(item) : renderListItem(item)
              }
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.accentPink}
                  colors={[colors.accentPink]}
                />
              }
              showsVerticalScrollIndicator={false}
            />
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  titleContainer: {
    flex: 1,
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
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  headerButtonActive: {
    backgroundColor: colors.surfaceLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  listContent: {
    padding: spacing.md,
  },
  gridContent: {
    paddingHorizontal: spacing.sm,
  },
  // Grid styles
  gridItem: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  gridLogoContainer: {
    aspectRatio: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    marginBottom: spacing.xs,
  },
  gridLogoContainerActive: {
    borderWidth: 2,
    borderColor: colors.accentPink,
  },
  gridLogo: {
    width: '100%',
    height: '100%',
  },
  gridPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  gridName: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.text,
    textAlign: 'center',
  },
  gridDistance: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.accentPink,
    textAlign: 'center',
    marginTop: 2,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playingIndicator: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: borderRadius.full,
    padding: spacing.xs,
  },
  // List styles
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  listItemActive: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.accentPink,
  },
  listLogoContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.backgroundSecondary,
  },
  listLogo: {
    width: '100%',
    height: '100%',
  },
  listPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  listName: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.medium,
    color: colors.text,
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: spacing.sm,
  },
  listDistance: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.accentPink,
  },
  listLocation: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    flex: 1,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentPink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonActive: {
    backgroundColor: colors.primary,
  },
});

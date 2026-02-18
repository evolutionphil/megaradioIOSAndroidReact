import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, gradients, spacing, borderRadius, typography } from '../../src/constants/theme';
import { useLocationStore } from '../../src/store/locationStore';
import api from '../../src/services/api';
import type { Genre } from '../../src/types';

const GENRES_CACHE_KEY = '@megaradio_genres_cache';
const GENRES_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days - genres don't change often

// Get cache key with country code
const getGenresCacheKey = (countryCode?: string | null) => {
  return countryCode ? `${GENRES_CACHE_KEY}_${countryCode}` : GENRES_CACHE_KEY;
};

export default function GenresTabScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { countryCode } = useLocationStore();

  // State
  const [genres, setGenres] = useState<Genre[]>([]);
  const [totalGenres, setTotalGenres] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch genres filtered by country using precomputed endpoint
  const fetchGenres = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setIsLoading(true);

      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cacheKey = getGenresCacheKey(countryCode);
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const { data, total, timestamp } = JSON.parse(cached);
          const isStale = Date.now() - timestamp > GENRES_CACHE_TTL;
          if (!isStale && Array.isArray(data) && data.length > 0) {
            console.log('[Genres] Using cached data:', data.length, 'genres');
            setGenres(data);
            setTotalGenres(total || data.length);
            setIsLoading(false);
            return;
          }
        }
      }

      // Fetch from API - use precomputed endpoint with country filter
      const params: any = {};
      if (countryCode) {
        params.country = countryCode;
      }

      console.log('[Genres] Fetching from API with country:', countryCode);

      const response = await api.get('https://themegaradio.com/api/genres/precomputed', { params });
      const data = response.data;

      console.log('[Genres] API Response:', { count: data.count, cached: data.cached, dataLen: data.data?.length });

      const newGenres = data.data || [];
      const total = data.count || newGenres.length;

      setGenres(newGenres);
      setTotalGenres(total);

      // Cache the data (7 days TTL)
      try {
        const cacheKey = getGenresCacheKey(countryCode);
        await AsyncStorage.setItem(cacheKey, JSON.stringify({
          data: newGenres,
          total,
          timestamp: Date.now(),
        }));
        console.log('[Genres] Cached', newGenres.length, 'genres for', countryCode || 'global');
      } catch (e) {
        console.log('[Genres] Cache error:', e);
      }
    } catch (error) {
      console.error('[Genres] Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [countryCode]);

  // Fetch on mount and when country changes
  useEffect(() => {
    fetchGenres();
  }, [fetchGenres]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGenres(true); // Force refresh
    setRefreshing(false);
  };

  // Sort genres by station count (descending) and filter by search
  const filteredAndSortedGenres = useMemo(() => {
    let result = [...genres];
    
    // Sort by station count (most stations first)
    result.sort((a: any, b: any) => {
      const countA = a.stationCount || a.total_stations || 0;
      const countB = b.stationCount || b.total_stations || 0;
      return countB - countA;
    });
    
    // Filter by search query
    if (searchQuery.trim()) {
      result = result.filter((g: any) => 
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return result;
  }, [genres, searchQuery]);

  // Navigate directly to genre-detail page
  const handleGenrePress = (genre: Genre) => {
    router.push({
      pathname: '/genre-detail',
      params: { slug: genre.slug, name: genre.name },
    });
  };

  const renderGenreItem = ({ item }: { item: Genre }) => (
    <TouchableOpacity
      style={styles.genreRow}
      onPress={() => handleGenrePress(item)}
      activeOpacity={0.7}
      data-testid={`genre-tab-item-${item.slug}`}
    >
      <View style={styles.genreInfo}>
        <Text style={styles.genreName}>{item.name}</Text>
        <Text style={styles.genreCount}>
          {item.stationCount || (item as any).total_stations || 0} {t('stations', 'Stations')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.mainContainer}>
      <LinearGradient colors={gradients.background as any} style={styles.gradient}>
        <SafeAreaView style={styles.container} edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('genres', 'Genres')}</Text>
            {totalGenres > 0 && (
              <Text style={styles.totalCount}>
                {totalGenres} {t('genres', 'Genres')}
              </Text>
            )}
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('search_genre', 'Search genre')}
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                data-testid="genres-search-input"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Genre List */}
          {isLoading && genres.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredAndSortedGenres}
              renderItem={renderGenreItem}
              keyExtractor={(item: any) => item._id || item.slug}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {searchQuery ? t('no_genres_found', 'No genres found') : t('no_genres', 'No genres available')}
                  </Text>
                </View>
              }
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  totalCount: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  genreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  genreInfo: {
    flex: 1,
  },
  genreName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  genreCount: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
  },
});

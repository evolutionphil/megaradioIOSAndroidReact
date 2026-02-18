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
const GENRES_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const PAGE_SIZE = 30;

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

  // Pagination state
  const [genres, setGenres] = useState<Genre[]>([]);
  const [page, setPage] = useState(1);
  const [totalGenres, setTotalGenres] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Fetch genres with pagination
  const fetchGenres = useCallback(async (pageNum: number, reset: boolean = false) => {
    try {
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      // Use precomputed endpoint with country filter for better performance
      const params: any = {};
      if (countryCode) {
        params.country = countryCode;
      }

      console.log('[Genres] Fetching with params:', params);

      const response = await api.get('https://themegaradio.com/api/genres/precomputed', { params });
      const data = response.data;

      console.log('[Genres] Response:', { success: data.success, count: data.count });

      const newGenres = data.data || [];
      const total = data.count || newGenres.length;

      setTotalGenres(total);
      // Precomputed endpoint returns all genres at once, no pagination needed
      setHasMore(false);

      setGenres(newGenres);
      
      // Cache the data
      try {
        const cacheKey = getGenresCacheKey(countryCode);
        await AsyncStorage.setItem(cacheKey, JSON.stringify({
          data: newGenres,
          total,
          timestamp: Date.now(),
        }));
      } catch (e) {
        console.log('[Genres] Cache error:', e);
      }
    } catch (error) {
      console.error('[Genres] Fetch error:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [countryCode]);

  // Load cached genres on mount
  useEffect(() => {
    const loadCachedGenres = async () => {
      try {
        const cacheKey = getGenresCacheKey(countryCode);
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const { data, total, timestamp } = JSON.parse(cached);
          const isStale = Date.now() - timestamp > GENRES_CACHE_TTL;
          if (!isStale && Array.isArray(data)) {
            setGenres(data);
            setTotalGenres(total || data.length);
            setHasMore(data.length < (total || 0));
          }
        }
      } catch (error) {
        console.log('[Genres] Error loading cache:', error);
      }
    };
    loadCachedGenres();
  }, [countryCode]);

  // Initial fetch
  useEffect(() => {
    setPage(1);
    fetchGenres(1, true);
  }, [countryCode]);

  // Load more when reaching end
  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && !searchQuery.trim()) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchGenres(nextPage, false);
    }
  }, [isLoadingMore, hasMore, page, fetchGenres, searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await fetchGenres(1, true);
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

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingMoreText}>{t('loading_more', 'Loading more...')}</Text>
      </View>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <LinearGradient colors={gradients.background as any} style={styles.gradient}>
        <SafeAreaView style={styles.container} edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('genres', 'Genres')}</Text>
            {totalGenres > 0 && (
              <Text style={styles.totalCount}>
                {genres.length} / {totalGenres}
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
              onEndReached={loadMore}
              onEndReachedThreshold={0.3}
              ListFooterComponent={renderFooter}
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
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  loadingMoreText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
});

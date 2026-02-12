import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Keyboard,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, gradients, spacing, borderRadius, typography, shadows } from '../src/constants/theme';
import { StationCard } from '../src/components/StationCard';
import stationService from '../src/services/stationService';
import { useAudioPlayer } from '../src/hooks/useAudioPlayer';
import { usePlayerStore } from '../src/store/playerStore';
import type { Station } from '../src/types';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Station[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const { playStation } = useAudioPlayer();
  const { currentStation, playbackState } = usePlayerStore();

  // Manual search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const data = await stationService.searchStations(searchQuery, 30);
      setResults(data || []);
      setHasSearched(true);
    } catch (error: any) {
      console.error('Search error:', error?.message || error);
      setResults([]);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle query change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 600);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleStationPress = (station: Station) => {
    playStation(station);
    Keyboard.dismiss();
  };

  const handleBack = () => {
    router.back();
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
  };

  const isStationPlaying = (station: Station) => {
    return currentStation?._id === station._id && playbackState === 'playing';
  };

  const isStationLoading = (station: Station) => {
    return currentStation?._id === station._id &&
      (playbackState === 'loading' || playbackState === 'buffering');
  };

  const renderItem = useCallback(
    ({ item }: { item: Station }) => (
      <StationCard
        station={item}
        onPress={handleStationPress}
        isPlaying={isStationPlaying(item)}
        isLoading={isStationLoading(item)}
      />
    ),
    [currentStation, playbackState]
  );

  const popularSearches = ['Jazz', 'Rock', 'News', 'Classical', 'Pop', 'Electronic', 'Country', 'Hip Hop'];

  return (
    <LinearGradient colors={gradients.background as any} style={styles.gradient}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Search Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <View style={styles.searchInputContainer}>
            <View style={styles.searchIconWrapper}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search stations, countries, genres..."
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              autoFocus
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Results */}
        <View style={styles.content}>
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingIconWrapper}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : results.length > 0 ? (
            <>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>{results.length} stations found</Text>
              </View>
              <FlatList
                data={results}
                renderItem={renderItem}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.resultsList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              />
            </>
          ) : hasSearched && query.length >= 2 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrapper}>
                <Ionicons name="search-outline" size={48} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No Results Found</Text>
              <Text style={styles.emptyText}>
                Try searching for a different station, country, or genre
              </Text>
              <TouchableOpacity style={styles.tryAgainButton} onPress={handleClear}>
                <Text style={styles.tryAgainText}>Clear Search</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.initialState}>
              <View style={styles.initialIconWrapper}>
                <LinearGradient
                  colors={[colors.primary, colors.accent] as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.initialIconGradient}
                >
                  <Ionicons name="radio" size={48} color={colors.text} />
                </LinearGradient>
              </View>
              <Text style={styles.initialTitle}>Search 40,000+ Stations</Text>
              <Text style={styles.initialText}>
                Find stations by name, country, language, or genre
              </Text>
              
              {/* Quick search suggestions */}
              <View style={styles.suggestions}>
                <Text style={styles.suggestionsTitle}>Popular Searches</Text>
                <View style={styles.suggestionChips}>
                  {popularSearches.map((term) => (
                    <Pressable
                      key={term}
                      style={styles.suggestionChip}
                      onPress={() => {
                        console.log('Chip pressed:', term);
                        setQuery(term);
                      }}
                    >
                      <Ionicons name="trending-up" size={14} color={colors.primary} />
                      <Text style={styles.suggestionChipText}>{term}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Recent Searches Placeholder */}
              <View style={styles.recentSection}>
                <Text style={styles.recentTitle}>Recent Searches</Text>
                <View style={styles.recentEmpty}>
                  <Ionicons name="time-outline" size={20} color={colors.textMuted} />
                  <Text style={styles.recentEmptyText}>No recent searches</Text>
                </View>
              </View>
            </View>
          )}
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIconWrapper: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  clearButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  loadingText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  
  // Results
  resultsHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  resultsCount: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  resultsList: {
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  tryAgainButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tryAgainText: {
    fontSize: typography.sizes.md,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  
  // Initial State
  initialState: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  initialIconWrapper: {
    marginBottom: spacing.lg,
  },
  initialIconGradient: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  initialText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  
  // Suggestions
  suggestions: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  suggestionsTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textMuted,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  suggestionChipText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  
  // Recent Searches
  recentSection: {
    width: '100%',
  },
  recentTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textMuted,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  recentEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  recentEmptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
});

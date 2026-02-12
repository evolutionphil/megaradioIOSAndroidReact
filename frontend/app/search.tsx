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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import stationService from '../src/services/stationService';
import { useAudioPlayer } from '../src/hooks/useAudioPlayer';
import { usePlayerStore } from '../src/store/playerStore';
import type { Station } from '../src/types';

// Filter types
type FilterType = 'radios' | 'genres' | 'profiles';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Station[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('radios');

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
    }, 400);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleStationPress = (station: Station) => {
    playStation(station);
    Keyboard.dismiss();
  };

  const handleCancel = () => {
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

  // Get station logo URL
  const getLogoUrl = (station: Station) => {
    if (station.logoAssets?.logo96) {
      const logo96 = station.logoAssets.logo96;
      if (logo96.startsWith('http')) return logo96;
      return `https://themegaradio.com${logo96}`;
    }
    if (station.favicon) {
      if (station.favicon.startsWith('http')) return station.favicon;
      return `https://themegaradio.com${station.favicon}`;
    }
    return null;
  };

  // Render station card
  const renderStationCard = ({ item }: { item: Station }) => {
    const logoUrl = getLogoUrl(item);
    const isPlaying = isStationPlaying(item);

    return (
      <TouchableOpacity
        style={styles.radioCard}
        onPress={() => handleStationPress(item)}
        activeOpacity={0.7}
        data-testid={`station-card-${item._id}`}
      >
        {/* Logo */}
        <View style={styles.radioLogo}>
          {logoUrl ? (
            <Image
              source={{ uri: logoUrl }}
              style={styles.radioLogoImage}
              resizeMode="contain"
            />
          ) : (
            <Ionicons name="radio" size={24} color="#5B5B5B" />
          )}
        </View>

        {/* Info */}
        <View style={styles.radioInfo}>
          <Text style={styles.radioName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.radioGenre} numberOfLines={1}>
            {item.tags?.[0] || item.country || 'Radio'}
          </Text>
        </View>

        {/* Heart Button */}
        <TouchableOpacity style={styles.heartButton}>
          <Ionicons
            name={isPlaying ? 'heart' : 'heart-outline'}
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'radios', label: 'Radios' },
    { key: 'genres', label: 'Genres' },
    { key: 'profiles', label: 'Profiles' },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Search Header */}
        <View style={styles.header}>
          {/* Search Box */}
          <View style={styles.searchBox}>
            <Ionicons name="search" size={24} color="#5B5B5B" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search radio, user"
              placeholderTextColor="#5B5B5B"
              value={query}
              onChangeText={setQuery}
              autoFocus
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              data-testid="search-input"
            />
            {query.length > 0 && (
              <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                <View style={styles.clearButtonInner}>
                  <Ionicons name="close" size={12} color="#787878" />
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Cancel Button */}
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterContainer}>
          {filters.map((filter) => (
            <Pressable
              key={filter.key}
              style={[
                styles.filterChip,
                activeFilter === filter.key && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(filter.key)}
              data-testid={`filter-${filter.key}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === filter.key && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Results */}
        <View style={styles.content}>
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF4199" />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : results.length > 0 ? (
            <FlatList
              data={results}
              renderItem={renderStationCard}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.resultsList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          ) : hasSearched && query.length >= 2 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color="#5B5B5B" />
              <Text style={styles.emptyTitle}>No Results Found</Text>
              <Text style={styles.emptyText}>
                Try searching for a different station
              </Text>
            </View>
          ) : (
            <View style={styles.initialState}>
              <Ionicons name="radio-outline" size={64} color="#5B5B5B" />
              <Text style={styles.initialTitle}>Search Stations</Text>
              <Text style={styles.initialText}>
                Find your favorite radio stations
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B1C1E',
  },
  safeArea: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 37,
    gap: 11,
  },

  // Search Box
  searchBox: {
    flex: 1,
    height: 45,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 15,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
    fontFamily: 'System',
  },
  clearButton: {
    marginLeft: 10,
  },
  clearButtonInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(91, 91, 91, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Cancel Button
  cancelButton: {
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    fontFamily: 'System',
  },

  // Filter Chips
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingTop: 20,
    gap: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#2F2F2F',
    borderRadius: 25,
  },
  filterChipActive: {
    backgroundColor: '#FF4199',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: 'System',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // Content
  content: {
    flex: 1,
    paddingTop: 28,
  },

  // Results List
  resultsList: {
    paddingHorizontal: 15,
    paddingBottom: 100,
    gap: 15,
  },

  // Radio Card
  radioCard: {
    width: '100%',
    height: 80,
    backgroundColor: '#282828',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  radioLogo: {
    width: 50,
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  radioLogoImage: {
    width: 46,
    height: 46,
  },
  radioInfo: {
    flex: 1,
    marginLeft: 15,
  },
  radioName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    fontFamily: 'System',
    marginBottom: 6,
  },
  radioGenre: {
    fontSize: 14,
    fontWeight: '300',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  heartButton: {
    width: 40,
    height: 40,
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: '#5B5B5B',
    fontFamily: 'System',
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  emptyText: {
    fontSize: 14,
    color: '#5B5B5B',
    textAlign: 'center',
    fontFamily: 'System',
  },

  // Initial State
  initialState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  initialTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  initialText: {
    fontSize: 14,
    color: '#5B5B5B',
    textAlign: 'center',
    fontFamily: 'System',
  },
});

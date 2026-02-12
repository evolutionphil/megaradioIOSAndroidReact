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
import type { Station, Genre } from '../src/types';
import api from '../src/services/api';
import { API_ENDPOINTS } from '../src/constants/api';

// Filter types
type FilterType = 'all' | 'radios' | 'genres' | 'profiles';

// Result item types
interface SearchResultItem {
  _id: string;
  type: 'radio' | 'genre' | 'profile';
  name: string;
  subtitle: string;
  imageUrl: string | null;
  data: any;
}

// Profile type
interface PublicProfile {
  _id: string;
  name: string;
  profileImageUrl?: string;
  favorites_count: number;
  slug?: string;
}

// Genre type for search
interface SearchGenre {
  _id: string;
  name: string;
  slug: string;
  stationCount?: number;
  discoverableImage?: string;
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [allResults, setAllResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const { playStation } = useAudioPlayer();
  const { currentStation, playbackState } = usePlayerStore();

  // Convert station to search result
  const stationToResult = (station: Station): SearchResultItem => {
    let imageUrl = null;
    if (station.logoAssets?.webp96) {
      imageUrl = `https://themegaradio.com/station-logos/${station.logoAssets.folder}/${station.logoAssets.webp96}`;
    } else if (station.favicon) {
      imageUrl = station.favicon.startsWith('http') ? station.favicon : `https://themegaradio.com${station.favicon}`;
    }
    
    // Get proper genre/tag for subtitle
    let subtitle = 'Radio';
    if (station.tags && typeof station.tags === 'string' && station.tags.length > 0) {
      subtitle = station.tags.split(',')[0].trim();
    } else if (station.genres && Array.isArray(station.genres) && station.genres.length > 0) {
      subtitle = station.genres[0];
    } else if (station.country) {
      subtitle = station.country;
    }
    
    return {
      _id: station._id,
      type: 'radio',
      name: station.name,
      subtitle,
      imageUrl,
      data: station,
    };
  };

  // Convert genre to search result
  const genreToResult = (genre: SearchGenre): SearchResultItem => {
    const imageUrl = genre.discoverableImage 
      ? `https://themegaradio.com${genre.discoverableImage}`
      : null;
    
    return {
      _id: genre._id,
      type: 'genre',
      name: genre.name,
      subtitle: `${genre.stationCount || 0} Stations`,
      imageUrl,
      data: genre,
    };
  };

  // Convert profile to search result
  const profileToResult = (profile: PublicProfile): SearchResultItem => {
    return {
      _id: profile._id,
      type: 'profile',
      name: profile.name,
      subtitle: `${profile.favorites_count || 0} Radios`,
      imageUrl: profile.profileImageUrl || null,
      data: profile,
    };
  };

  // Unified search function
  const performSearch = useCallback(async (searchQuery: string) => {
    console.log('performSearch called with:', searchQuery);
    if (searchQuery.length < 2) {
      setAllResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const lowerQuery = searchQuery.toLowerCase();
      
      console.log('Starting API calls...');
      
      // Fetch stations
      let stationsResponse: Station[] = [];
      try {
        console.log('Fetching stations...');
        stationsResponse = await stationService.searchStations(searchQuery, 30);
        console.log('Stations fetched:', stationsResponse?.length || 0);
      } catch (err) {
        console.error('Stations fetch error:', err);
      }
      
      // Fetch genres
      let genresResponse: SearchGenre[] = [];
      try {
        console.log('Fetching genres...');
        const genreRes = await api.get(API_ENDPOINTS.genres.discoverable);
        genresResponse = genreRes.data || [];
        console.log('Genres fetched:', genresResponse?.length || 0);
      } catch (err) {
        console.error('Genres fetch error:', err);
      }
      
      // Fetch profiles
      let profilesResponse: PublicProfile[] = [];
      try {
        console.log('Fetching profiles...');
        const profileRes = await api.get(API_ENDPOINTS.publicProfiles, { params: { limit: 50 } });
        profilesResponse = profileRes.data?.data || profileRes.data || [];
        console.log('Profiles fetched:', profilesResponse?.length || 0);
      } catch (err) {
        console.error('Profiles fetch error:', err);
      }

      console.log('API responses - Stations:', stationsResponse?.length, 'Genres:', genresResponse?.length, 'Profiles:', profilesResponse?.length);

      // Convert stations to results
      const stationResults = (stationsResponse || []).map(stationToResult);

      // Filter genres by name
      const filteredGenres = (genresResponse || []).filter((g: SearchGenre) => 
        g.name?.toLowerCase().includes(lowerQuery)
      );
      const genreResults = filteredGenres.map(genreToResult);

      // Filter profiles by name
      const filteredProfiles = (profilesResponse || []).filter((p: PublicProfile) => 
        p.name?.toLowerCase().includes(lowerQuery)
      );
      const profileResults = filteredProfiles.map(profileToResult);

      // Combine all results
      const combined = [...stationResults, ...genreResults, ...profileResults];
      console.log('Combined results:', combined.length);
      
      setAllResults(combined);
      setHasSearched(true);
    } catch (error: any) {
      console.error('Search error:', error?.message || error);
      setAllResults([]);
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

  // Filter results based on active filter
  const filteredResults = activeFilter === 'all' 
    ? allResults 
    : allResults.filter(item => {
        if (activeFilter === 'radios') return item.type === 'radio';
        if (activeFilter === 'genres') return item.type === 'genre';
        if (activeFilter === 'profiles') return item.type === 'profile';
        return true;
      });

  const handleItemPress = (item: SearchResultItem) => {
    Keyboard.dismiss();
    if (item.type === 'radio') {
      playStation(item.data as Station);
    } else if (item.type === 'genre') {
      router.push(`/discover?genre=${item.data.slug}`);
    } else if (item.type === 'profile') {
      // Navigate to profile page (future implementation)
      console.log('Navigate to profile:', item.data.slug);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const handleClear = () => {
    setQuery('');
    setAllResults([]);
    setHasSearched(false);
  };

  const isStationPlaying = (station: Station) => {
    return currentStation?._id === station._id && playbackState === 'playing';
  };

  // Get icon for result type
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'radio': return 'radio';
      case 'genre': return 'musical-notes';
      case 'profile': return 'person';
      default: return 'radio';
    }
  };

  // Render search result card
  const renderResultCard = ({ item }: { item: SearchResultItem }) => {
    const isPlaying = item.type === 'radio' && isStationPlaying(item.data);

    return (
      <TouchableOpacity
        style={styles.radioCard}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
        data-testid={`search-result-${item._id}`}
      >
        {/* Logo */}
        <View style={styles.radioLogo}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.radioLogoImage}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name={getResultIcon(item.type)} size={24} color="#5B5B5B" />
          )}
        </View>

        {/* Info */}
        <View style={styles.radioInfo}>
          <Text style={styles.radioName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.radioGenre} numberOfLines={1}>
            {item.subtitle}
          </Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity style={styles.heartButton}>
          {item.type === 'radio' ? (
            <Ionicons
              name={isPlaying ? 'heart' : 'heart-outline'}
              size={24}
              color="#FFFFFF"
            />
          ) : (
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
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
          ) : filteredResults.length > 0 ? (
            <FlatList
              data={filteredResults}
              renderItem={renderResultCard}
              keyExtractor={(item) => `${item.type}-${item._id}`}
              contentContainerStyle={styles.resultsList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          ) : hasSearched && query.length >= 2 ? (
            <View style={styles.emptyState}>
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=200&h=200&fit=crop' }}
                style={styles.emptyImage}
              />
              <Text style={styles.emptyTitle}>We couldn't find any result!</Text>
              <Text style={styles.emptyText}>
                Try searching for something else
              </Text>
            </View>
          ) : (
            <View style={styles.initialState}>
              <Ionicons name="radio-outline" size={64} color="#5B5B5B" />
              <Text style={styles.initialTitle}>Search Stations</Text>
              <Text style={styles.initialText}>
                Find your favorite radio stations, genres, and users
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
  emptyImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    opacity: 0.8,
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

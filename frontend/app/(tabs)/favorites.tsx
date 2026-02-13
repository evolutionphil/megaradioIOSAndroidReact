import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  FlatList,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFavoritesStore, SortOption, ViewMode } from '../../src/store/favoritesStore';
import { useAudioPlayer } from '../../src/hooks/useAudioPlayer';
import { usePlayerStore } from '../../src/store/playerStore';
import type { Station } from '../../src/types';

const FALLBACK_LOGO = 'https://themegaradio.com/static/default-station.png';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const getLogoUrl = (station: Station): string => {
  const logo = station.logo || station.favicon;
  if (!logo) return FALLBACK_LOGO;
  if (logo.startsWith('http')) return logo;
  return `https://themegaradio.com${logo.startsWith('/') ? '' : '/'}${logo}`;
};

export default function FavoritesScreen() {
  const router = useRouter();
  
  // Store
  const {
    favorites,
    isLoaded,
    loadFavorites,
    removeFavorite,
    sortOption,
    viewMode,
    setSortOption,
    setViewMode,
    getSortedFavorites,
    updateCustomOrder,
  } = useFavoritesStore();

  // Player
  const { playStation } = useAudioPlayer();
  const { currentStation, playbackState } = usePlayerStore();

  // Local state
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSortModal, setShowSortModal] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [reorderedList, setReorderedList] = useState<Station[]>([]);
  
  // Animation for bottom sheet
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Load favorites on mount
  useEffect(() => {
    if (!isLoaded) {
      loadFavorites();
    }
  }, [isLoaded, loadFavorites]);

  // Get sorted favorites
  const sortedFavorites = getSortedFavorites();

  // Helper to get genre display
const getGenreDisplay = (station: Station): string => {
  if (station.genres && station.genres.length > 0) {
    return station.genres[0];
  }
  return 'Radio';
};

// Filter by search
  const filteredFavorites = searchQuery
    ? sortedFavorites.filter(
        (s) =>
          s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          getGenreDisplay(s).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sortedFavorites;

  const handleStationPress = (station: Station) => {
    if (!isReordering) {
      playStation(station);
    }
  };

  const handleRemoveFavorite = (stationId: string) => {
    removeFavorite(stationId);
  };

  const isStationPlaying = (station: Station) => {
    return currentStation?._id === station._id && playbackState === 'playing';
  };

  // Search handlers
  const handleSearchActivate = () => {
    setIsSearchActive(true);
  };

  const handleSearchCancel = () => {
    setIsSearchActive(false);
    setSearchQuery('');
    Keyboard.dismiss();
  };

  const handleSearchClear = () => {
    setSearchQuery('');
  };

  // Sort modal handlers
  const openSortModal = () => {
    setShowSortModal(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
    }).start();
  };

  const closeSortModal = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setShowSortModal(false));
  };

  const handleSortSelect = (option: SortOption) => {
    setSortOption(option);
    if (option === 'custom') {
      // Enter reorder mode
      setReorderedList([...getSortedFavorites()]);
      setIsReordering(true);
    }
    closeSortModal();
  };

  const handleViewModeSelect = (mode: ViewMode) => {
    setViewMode(mode);
  };

  // Reorder handlers
  const handleReorderCancel = () => {
    setIsReordering(false);
    setReorderedList([]);
  };

  const handleReorderSave = async () => {
    const newOrder = reorderedList.map((s) => s._id);
    await updateCustomOrder(newOrder);
    setIsReordering(false);
    setReorderedList([]);
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    const newList = [...reorderedList];
    const [removed] = newList.splice(fromIndex, 1);
    newList.splice(toIndex, 0, removed);
    setReorderedList(newList);
  };

  // Sort options
  const sortOptions: { key: SortOption; label: string }[] = [
    { key: 'newest', label: 'Newest first' },
    { key: 'oldest', label: 'Oldest first' },
    { key: 'az', label: 'A-Z' },
    { key: 'za', label: 'Z-A' },
    { key: 'custom', label: 'Custom order' },
  ];

  // Render station item
  const renderStationItem = ({ item, index }: { item: Station; index: number }) => {
    const isPlaying = isStationPlaying(item);

    if (isReordering) {
      return (
        <View style={styles.stationCard} data-testid={`favorite-station-reorder-${item._id}`}>
          <Image
            source={{ uri: getLogoUrl(item) }}
            style={styles.stationLogo}
            defaultSource={{ uri: FALLBACK_LOGO }}
          />
          <View style={styles.stationInfo}>
            <Text style={styles.stationName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.stationGenre} numberOfLines={1}>
              {item.genre || 'Radio'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.dragHandle}
            data-testid={`drag-handle-${item._id}`}
          >
            <MaterialCommunityIcons name="drag" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.stationCard}
        onPress={() => handleStationPress(item)}
        activeOpacity={0.7}
        data-testid={`favorite-station-${item._id}`}
      >
        <Image
          source={{ uri: getLogoUrl(item) }}
          style={styles.stationLogo}
          defaultSource={{ uri: FALLBACK_LOGO }}
        />
        <View style={styles.stationInfo}>
          <Text style={[styles.stationName, isPlaying && styles.stationNamePlaying]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.stationGenre} numberOfLines={1}>
            {item.genre || 'Radio'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.heartButton}
          onPress={() => handleRemoveFavorite(item._id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          data-testid={`remove-favorite-${item._id}`}
        >
          <Ionicons name="heart" size={24} color="#FF4081" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer} data-testid="favorites-empty-state">
      <View style={styles.emptyIconContainer}>
        <Ionicons name="heart-outline" size={80} color="#4A4A4A" />
      </View>
      <Text style={styles.emptyTitle}>You don' have any{'\n'}favorites yet</Text>
      <TouchableOpacity
        style={styles.discoverLink}
        onPress={() => router.push('/(tabs)')}
        data-testid="discover-stations-btn"
      >
        <Text style={styles.discoverText}>Discover stations near to you!</Text>
        <Ionicons name="arrow-forward" size={16} color="#FF4081" style={{ marginLeft: 4 }} />
      </TouchableOpacity>
    </View>
  );

  // Search mode header
  if (isSearchActive) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Search Header */}
        <View style={styles.searchHeader}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search favorites..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
              data-testid="favorites-search-input"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={handleSearchClear} data-testid="search-clear-btn">
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={handleSearchCancel} data-testid="search-cancel-btn">
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Search Results */}
        <FlatList
          data={filteredFavorites}
          renderItem={renderStationItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>No stations found</Text>
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  // Reorder mode
  if (isReordering) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Favorites</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={openSortModal} style={styles.headerButton} data-testid="sort-btn">
              <Ionicons name="options-outline" size={24} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSearchActivate} style={styles.headerButton} data-testid="search-btn">
              <Ionicons name="search-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Reorder List */}
        <FlatList
          data={reorderedList}
          renderItem={renderStationItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Reorder Actions */}
        <View style={styles.reorderActions}>
          <TouchableOpacity
            style={styles.reorderCancelBtn}
            onPress={handleReorderCancel}
            data-testid="reorder-cancel-btn"
          >
            <Text style={styles.reorderCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.reorderSaveBtn}
            onPress={handleReorderSave}
            data-testid="reorder-save-btn"
          >
            <Text style={styles.reorderSaveText}>Save</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main view
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Favorites</Text>
          {favorites.length > 0 && (
            <Text style={styles.headerCount}>{favorites.length}</Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={openSortModal} style={styles.headerButton} data-testid="sort-btn">
            <Ionicons name="options-outline" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSearchActivate} style={styles.headerButton} data-testid="search-btn">
            <Ionicons name="search-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {favorites.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredFavorites}
          renderItem={renderStationItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Sort Modal (Bottom Sheet) */}
      <Modal visible={showSortModal} transparent animationType="none">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeSortModal}
        >
          <Animated.View
            style={[
              styles.bottomSheet,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Handle */}
            <View style={styles.sheetHandle} />

            {/* Sort Options */}
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={styles.sortOption}
                onPress={() => handleSortSelect(option.key)}
                data-testid={`sort-option-${option.key}`}
              >
                <Text style={styles.sortOptionText}>{option.label}</Text>
                <View
                  style={[
                    styles.radioOuter,
                    sortOption === option.key && styles.radioOuterActive,
                  ]}
                >
                  {sortOption === option.key && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}

            {/* Divider */}
            <View style={styles.sheetDivider} />

            {/* View Mode Toggle */}
            <View style={styles.viewModeRow}>
              <Text style={styles.viewModeLabel}>Grid</Text>
              <View style={styles.viewModeButtons}>
                <TouchableOpacity
                  style={[
                    styles.viewModeBtn,
                    viewMode === 'grid' && styles.viewModeBtnActive,
                  ]}
                  onPress={() => handleViewModeSelect('grid')}
                  data-testid="view-mode-grid"
                >
                  <Ionicons
                    name="grid"
                    size={18}
                    color={viewMode === 'grid' ? '#FFF' : '#888'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.viewModeBtn,
                    viewMode === 'list' && styles.viewModeBtnActive,
                  ]}
                  onPress={() => handleViewModeSelect('list')}
                  data-testid="view-mode-list"
                >
                  <Ionicons
                    name="list"
                    size={18}
                    color={viewMode === 'list' ? '#FFF' : '#888'}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  headerCount: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerButton: {
    padding: 4,
  },

  // Search Header
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },

  // Station Card
  stationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1C',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  stationLogo: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#2A2A2C',
  },
  stationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 2,
  },
  stationNamePlaying: {
    color: '#FF4081',
  },
  stationGenre: {
    fontSize: 14,
    color: '#888',
  },
  heartButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2A2A2C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandle: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: -60,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 30,
  },
  discoverLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discoverText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF4081',
  },

  // No Results
  noResultsContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#888',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#1A1A1C',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#666',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },

  // Sort Options
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  sortOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF4081',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: {
    borderColor: '#FF4081',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF4081',
  },

  // Divider
  sheetDivider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 16,
  },

  // View Mode
  viewModeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  viewModeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  viewModeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  viewModeBtn: {
    width: 40,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewModeBtnActive: {
    backgroundColor: '#555',
  },

  // Reorder Actions
  reorderActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  reorderCancelBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#666',
  },
  reorderCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  reorderSaveBtn: {
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#FF4081',
  },
  reorderSaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});

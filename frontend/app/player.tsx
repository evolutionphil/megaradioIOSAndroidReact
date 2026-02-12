import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '../src/constants/theme';
import { useAudioPlayer } from '../src/hooks/useAudioPlayer';
import { usePlayerStore } from '../src/store/playerStore';
import { useAddFavorite, useRemoveFavorite, useSimilarStations, usePopularStations } from '../src/hooks/useQueries';
import userService from '../src/services/userService';
import { useAuthStore } from '../src/store/authStore';
import type { Station } from '../src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ARTWORK_WIDTH = Math.min(SCREEN_WIDTH - 80, 350);
const ARTWORK_HEIGHT = 200;
const GRID_ITEM_WIDTH = Math.min((SCREEN_WIDTH - 60) / 3, 110);

export default function PlayerScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const {
    currentStation,
    playbackState,
    nowPlaying,
  } = usePlayerStore();

  const { playStation, togglePlayPause } = useAudioPlayer();
  const { data: similarData, isLoading: similarLoading } = useSimilarStations(currentStation?._id || '', 9);
  const { data: popularData, isLoading: popularLoading } = usePopularStations(undefined, 12);
  
  // Debug
  console.log('[Player] popularData:', popularData, 'loading:', popularLoading);
  console.log('[Player] similarData:', similarData, 'loading:', similarLoading);

  const [isFavorite, setIsFavorite] = useState(false);
  const [checkingFavorite, setCheckingFavorite] = useState(false);

  const addFavoriteMutation = useAddFavorite();
  const removeFavoriteMutation = useRemoveFavorite();

  useEffect(() => {
    if (isAuthenticated && currentStation) {
      checkFavoriteStatus();
    }
  }, [isAuthenticated, currentStation]);

  const checkFavoriteStatus = async () => {
    if (!currentStation) return;
    setCheckingFavorite(true);
    try {
      const result = await userService.checkFavorite(currentStation._id);
      setIsFavorite(result.isFavorite);
    } catch {
      // Ignore errors
    } finally {
      setCheckingFavorite(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  const handleToggleFavorite = async () => {
    if (!currentStation || !isAuthenticated) {
      router.push('/login');
      return;
    }

    try {
      if (isFavorite) {
        await removeFavoriteMutation.mutateAsync(currentStation._id);
        setIsFavorite(false);
      } else {
        await addFavoriteMutation.mutateAsync(currentStation._id);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Toggle favorite error:', error);
    }
  };

  const handleStationPress = (station: Station) => {
    playStation(station);
  };

  const isLoading = playbackState === 'loading' || playbackState === 'buffering';
  const isPlaying = playbackState === 'playing';

  const getLogoUrl = (station: Station) => {
    if (station.logoAssets?.webp192) {
      return `https://themegaradio.com/station-logos/${station.logoAssets.folder}/${station.logoAssets.webp192}`;
    }
    return station.favicon || station.logo || null;
  };

  const logoUrl = currentStation ? getLogoUrl(currentStation) : null;
  
  // Get stations for grids - use popularData as main source
  const stationsArray = popularData?.stations || (Array.isArray(popularData) ? popularData : []);
  const similarStations = similarData?.stations || (Array.isArray(similarData) ? similarData : stationsArray);
  const recentStations = stationsArray;

  // Get artist/song info
  const getArtistInfo = () => {
    if (nowPlaying?.artist) return nowPlaying.artist;
    if (currentStation?.genres?.[0]) return currentStation.genres[0];
    return currentStation?.country || 'Radio';
  };

  if (!currentStation) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="radio-outline" size={64} color="#666" />
            </View>
            <Text style={styles.emptyTitle}>No station playing</Text>
            <Text style={styles.emptyText}>Select a station to start listening</Text>
            <TouchableOpacity style={styles.goBackButton} onPress={handleClose}>
              <Text style={styles.goBackButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Station Grid Item Component
  const StationGridItem = ({ station }: { station: Station }) => {
    const stationLogo = getLogoUrl(station);
    return (
      <TouchableOpacity
        style={{ width: 110, marginRight: 12, marginBottom: 16 }}
        onPress={() => handleStationPress(station)}
        activeOpacity={0.7}
      >
        <View style={{ width: 110, height: 110, borderRadius: 12, overflow: 'hidden', backgroundColor: '#1E1E1E', marginBottom: 8 }}>
          {stationLogo ? (
            <Image source={{ uri: stationLogo }} style={{ width: 110, height: 110 }} resizeMode="cover" />
          ) : (
            <View style={{ width: 110, height: 110, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2A2A2A' }}>
              <Ionicons name="radio" size={24} color="#666" />
            </View>
          )}
        </View>
        <Text style={styles.gridStationName} numberOfLines={1}>
          {station.name}
        </Text>
        <Text style={styles.gridStationLocation} numberOfLines={1}>
          {station.country || 'Unknown'}, {station.state || 'Istanbul'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
              <Ionicons name="chevron-down" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <View style={styles.hdBadge}>
                <Text style={styles.hdText}>HD</Text>
              </View>
              <Text style={styles.headerTitle} numberOfLines={1}>{currentStation.name}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.headerIcon}>
                <Ionicons name="car-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIcon}>
                <Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Album Art */}
          <View style={styles.artworkContainer}>
            <View style={styles.artworkWrapper}>
              {logoUrl ? (
                <Image
                  source={{ uri: logoUrl }}
                  style={styles.artwork}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.artworkPlaceholder}>
                  <Ionicons name="radio" size={80} color="#666" />
                </View>
              )}
              {/* Live indicator */}
              <View style={styles.liveIndicator}>
                <View style={styles.liveIndicatorBar} />
              </View>
            </View>
          </View>

          {/* Now Playing Info */}
          <View style={styles.nowPlayingSection}>
            {/* Animated dots */}
            <View style={styles.animatedDots}>
              <View style={[styles.dot, styles.dotPink]} />
              <View style={[styles.dot, styles.dotPink]} />
              <View style={[styles.dot, styles.dotPink]} />
            </View>
            <Text style={styles.stationName}>{currentStation.name}</Text>
            <Text style={styles.artistName}>{getArtistInfo()}</Text>
            {/* Spotify & YouTube icons */}
            <View style={styles.socialIcons}>
              <TouchableOpacity style={[styles.socialButton, styles.spotifyButton]}>
                <Ionicons name="musical-notes" size={16} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.socialButton, styles.youtubeButton]}>
                <Ionicons name="play-circle" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Controls */}
          <View style={styles.mainControls}>
            <TouchableOpacity style={styles.controlButton}>
              <Ionicons name="time-outline" size={26} color="#AAAAAA" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton}>
              <Ionicons name="play-skip-back" size={32} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.playPauseButton}
              onPress={togglePlayPause}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="large" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={36}
                  color="#FFFFFF"
                  style={!isPlaying ? { marginLeft: 4 } : undefined}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton}>
              <Ionicons name="play-skip-forward" size={32} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleToggleFavorite}
              disabled={checkingFavorite}
            >
              {checkingFavorite ? (
                <ActivityIndicator size="small" color="#AAAAAA" />
              ) : (
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={26}
                  color={isFavorite ? '#FF4757' : '#AAAAAA'}
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Secondary Controls */}
          <View style={styles.secondaryControls}>
            <View style={styles.leftSecondaryControls}>
              <TouchableOpacity style={styles.secondaryButton}>
                <Ionicons name="share-social-outline" size={24} color="#AAAAAA" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton}>
                <Ionicons name="headset-outline" size={24} color="#AAAAAA" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton}>
                <Ionicons name="radio-outline" size={24} color="#AAAAAA" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.recButton}>
              <View style={styles.recDot} />
              <Text style={styles.recText}>REC</Text>
            </TouchableOpacity>
          </View>

          {/* Recently Played Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recently Played</Text>
            <View style={styles.stationGrid}>
              {recentStations.slice(0, 6).map((station: Station, index: number) => (
                <StationGridItem key={`recent-${station._id}-${index}`} station={station} />
              ))}
            </View>
          </View>

          {/* Similar Radios Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Similar Radios</Text>
            <View style={styles.stationGrid}>
              {(similarStations.length > 0 ? similarStations : recentStations).slice(0, 9).map((station: Station, index: number) => (
                <StationGridItem key={`similar-${station._id}-${index}`} station={station} />
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1A1F',
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  hdBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hdText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Artwork
  artworkContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  artworkWrapper: {
    width: ARTWORK_WIDTH,
    height: ARTWORK_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  artworkPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveIndicator: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  liveIndicatorBar: {
    width: 40,
    height: 6,
    backgroundColor: '#FF3B30',
    borderRadius: 3,
  },

  // Now Playing
  nowPlayingSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  animatedDots: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotPink: {
    backgroundColor: '#FF69B4',
  },
  stationName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  artistName: {
    fontSize: 16,
    color: '#AAAAAA',
    marginBottom: 12,
  },
  socialIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotifyButton: {
    backgroundColor: '#1DB954',
  },
  youtubeButton: {
    backgroundColor: '#FF0000',
  },

  // Main Controls
  mainControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  controlButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#3A3A3C',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },

  // Secondary Controls
  secondaryControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  leftSecondaryControls: {
    flexDirection: 'row',
    gap: 20,
  },
  secondaryButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
  },
  recText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Sections
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  stationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 12,
  },

  // Grid Items
  gridItem: {
    width: 110,
    maxWidth: 110,
  },
  gridImageContainer: {
    width: 110,
    height: 110,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
    marginBottom: 8,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
  },
  gridStationName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  gridStationLocation: {
    fontSize: 12,
    color: '#888888',
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#888888',
    marginBottom: 24,
  },
  goBackButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  goBackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

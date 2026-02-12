import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAudioPlayer } from '../src/hooks/useAudioPlayer';
import { usePlayerStore } from '../src/store/playerStore';
import { useAddFavorite, useRemoveFavorite, useSimilarStations, usePopularStations } from '../src/hooks/useQueries';
import userService from '../src/services/userService';
import { useAuthStore } from '../src/store/authStore';
import type { Station } from '../src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LOGO_SIZE = 190;
// Calculate grid item width for 3 columns with proper spacing
const GRID_PADDING = 16;
const GRID_GAP = 12;
const GRID_ITEM_WIDTH = Math.floor((SCREEN_WIDTH - (GRID_PADDING * 2) - (GRID_GAP * 2)) / 3);

// Country code to flag emoji mapping
const getCountryFlag = (countryCode?: string): string => {
  if (!countryCode) return '🌍';
  const code = countryCode.toUpperCase();
  const flags: Record<string, string> = {
    'DE': '🇩🇪', 'TR': '🇹🇷', 'US': '🇺🇸', 'GB': '🇬🇧', 'FR': '🇫🇷',
    'ES': '🇪🇸', 'IT': '🇮🇹', 'NL': '🇳🇱', 'BE': '🇧🇪', 'AT': '🇦🇹',
    'CH': '🇨🇭', 'PL': '🇵🇱', 'RU': '🇷🇺', 'JP': '🇯🇵', 'KR': '🇰🇷',
    'GERMANY': '🇩🇪', 'TURKEY': '🇹🇷', 'UNITED STATES': '🇺🇸',
    'HUNGARY': '🇭🇺', 'HU': '🇭🇺',
  };
  return flags[code] || '🌍';
};

export default function PlayerScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const {
    currentStation,
    playbackState,
    nowPlaying,
  } = usePlayerStore();

  const { playStation, togglePlayPause, stopPlayback } = useAudioPlayer();
  
  // Fetch similar stations based on current station ID
  const { data: similarData } = useSimilarStations(currentStation?._id || '', 9);
  const { data: popularData } = usePopularStations(undefined, 12);

  const [isFavorite, setIsFavorite] = useState(false);
  const [checkingFavorite, setCheckingFavorite] = useState(false);

  const addFavoriteMutation = useAddFavorite();
  const removeFavoriteMutation = useRemoveFavorite();

  useEffect(() => {
    if (isAuthenticated && currentStation) {
      checkFavoriteStatus();
    }
  }, [isAuthenticated, currentStation?._id]);

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

  // Handle station press - stop current and play new
  const handleStationPress = useCallback(async (station: Station) => {
    if (station._id !== currentStation?._id) {
      // Stop current playback first
      await stopPlayback();
      // Play new station
      playStation(station);
    }
  }, [currentStation?._id, stopPlayback, playStation]);

  const isLoading = playbackState === 'loading' || playbackState === 'buffering';
  const isPlaying = playbackState === 'playing';

  const getLogoUrl = useCallback((station: Station) => {
    if (station.logoAssets?.webp192) {
      return `https://themegaradio.com/station-logos/${station.logoAssets.folder}/${station.logoAssets.webp192}`;
    }
    return station.favicon || station.logo || null;
  }, []);

  const logoUrl = currentStation ? getLogoUrl(currentStation) : null;
  
  // Memoize stations
  const popularStations = useMemo(() => {
    return popularData?.stations || (Array.isArray(popularData) ? popularData : []);
  }, [popularData]);
  
  const similarStations = useMemo(() => {
    const similar = similarData?.stations || (Array.isArray(similarData) ? similarData : []);
    return similar.filter((s: Station) => s._id !== currentStation?._id);
  }, [similarData, currentStation?._id]);
  
  const displaySimilarStations = useMemo(() => {
    if (similarStations.length > 0) return similarStations;
    return popularStations.filter((s: Station) => s._id !== currentStation?._id);
  }, [similarStations, popularStations, currentStation?._id]);

  const getArtistInfo = () => {
    if (nowPlaying?.artist) return nowPlaying.artist;
    if (currentStation?.genres?.[0]) return currentStation.genres[0];
    return 'Unknown Artist';
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
  const StationGridItem = React.memo(({ station }: { station: Station }) => {
    const stationLogo = getLogoUrl(station);
    
    return (
      <TouchableOpacity
        style={styles.gridItem}
        onPress={() => handleStationPress(station)}
        activeOpacity={0.7}
      >
        <View style={styles.gridImageWrapper}>
          {stationLogo ? (
            <Image 
              source={{ uri: stationLogo }} 
              style={styles.gridImage}
              resizeMode="cover" 
            />
          ) : (
            <View style={[styles.gridImage, styles.gridPlaceholder]}>
              <Ionicons name="radio" size={24} color="#666" />
            </View>
          )}
        </View>
        <Text style={styles.gridStationName} numberOfLines={1}>
          {station.name}
        </Text>
        <Text style={styles.gridStationLocation} numberOfLines={1}>
          Turkey, Istanbul
        </Text>
      </TouchableOpacity>
    );
  });

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            {Platform.OS !== 'web' ? (
              <BlurView intensity={25} tint="dark" style={styles.headerBlur}>
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
              </BlurView>
            ) : (
              <View style={styles.headerBlurWeb}>
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
              </View>
            )}
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
              {/* Live indicator bar */}
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
                <Ionicons name="logo-spotify" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.socialButton, styles.youtubeButton]}>
                <Ionicons name="logo-youtube" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Controls */}
          <View style={styles.mainControls}>
            {/* Timer */}
            <TouchableOpacity style={styles.controlButton}>
              <Ionicons name="time-outline" size={28} color="#888888" />
            </TouchableOpacity>
            
            {/* Previous */}
            <TouchableOpacity style={styles.skipButton}>
              <Ionicons name="play-skip-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            {/* Play/Pause - Large button */}
            <TouchableOpacity
              style={styles.playPauseButton}
              onPress={togglePlayPause}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="large" color="#FFFFFF" />
              ) : isPlaying ? (
                <Ionicons name="pause" size={40} color="#FFFFFF" />
              ) : (
                <Ionicons name="play" size={40} color="#FFFFFF" style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>
            
            {/* Next */}
            <TouchableOpacity style={styles.skipButton}>
              <Ionicons name="play-skip-forward" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            {/* Heart */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleToggleFavorite}
              disabled={checkingFavorite}
            >
              <Ionicons 
                name={isFavorite ? 'heart' : 'heart-outline'} 
                size={28} 
                color={isFavorite ? '#FF4757' : '#888888'} 
              />
            </TouchableOpacity>
          </View>

          {/* Secondary Controls */}
          <View style={styles.secondaryControls}>
            <View style={styles.leftSecondaryControls}>
              {/* Share */}
              <TouchableOpacity style={styles.secondaryButton}>
                <Ionicons name="share-social-outline" size={24} color="#888888" />
              </TouchableOpacity>
              {/* Headset/Lock */}
              <TouchableOpacity style={styles.secondaryButton}>
                <Ionicons name="lock-closed-outline" size={24} color="#888888" />
              </TouchableOpacity>
              {/* Broadcast */}
              <TouchableOpacity style={styles.secondaryButton}>
                <Ionicons name="radio-outline" size={24} color="#888888" />
              </TouchableOpacity>
            </View>
            {/* REC Button */}
            <TouchableOpacity style={styles.recButton}>
              <View style={styles.recIconWrapper}>
                <View style={styles.recDotOuter}>
                  <View style={styles.recDotInner} />
                </View>
              </View>
              <Text style={styles.recText}>REC</Text>
            </TouchableOpacity>
          </View>

          {/* Recently Played Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recently Played</Text>
            <View style={styles.stationGrid}>
              {popularStations.slice(0, 6).map((station: Station, index: number) => (
                <StationGridItem key={`recent-${station._id}-${index}`} station={station} />
              ))}
            </View>
          </View>

          {/* Similar Radios Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Similar Radios</Text>
            <View style={styles.stationGrid}>
              {displaySimilarStations.slice(0, 9).map((station: Station, index: number) => (
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
    backgroundColor: '#0D1B1E',
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
  headerContainer: {
    width: '100%',
    height: 60,
  },
  headerBlur: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  headerBlurWeb: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(25px)',
      WebkitBackdropFilter: 'blur(25px)',
    } : {}),
  },
  header: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
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
    gap: 4,
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
    marginTop: 20,
    marginBottom: 16,
  },
  artworkWrapper: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
    position: 'relative',
  },
  artwork: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  artworkPlaceholder: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
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
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  animatedDots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotPink: {
    backgroundColor: '#FF4D8D',
  },
  stationName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  artistName: {
    fontSize: 16,
    color: '#888888',
    marginBottom: 16,
    textAlign: 'center',
  },
  socialIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  socialButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  controlButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },

  // Secondary Controls
  secondaryControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  leftSecondaryControls: {
    flexDirection: 'row',
    gap: 24,
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
    gap: 8,
  },
  recIconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  recDotOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recDotInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF6B6B',
  },
  recText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Sections
  section: {
    paddingHorizontal: GRID_PADDING,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  stationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  // Grid Items
  gridItem: {
    width: GRID_ITEM_WIDTH,
    marginBottom: 16,
  },
  gridImageWrapper: {
    width: GRID_ITEM_WIDTH,
    height: GRID_ITEM_WIDTH,
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
  },
  gridStationName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  gridStationLocation: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
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

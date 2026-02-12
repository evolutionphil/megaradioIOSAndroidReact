import React, { useEffect, useState, useMemo } from 'react';
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
import { colors, spacing, borderRadius, typography } from '../src/constants/theme';
import { useAudioPlayer } from '../src/hooks/useAudioPlayer';
import { usePlayerStore } from '../src/store/playerStore';
import { useAddFavorite, useRemoveFavorite, useSimilarStations, usePopularStations } from '../src/hooks/useQueries';
import userService from '../src/services/userService';
import { useAuthStore } from '../src/store/authStore';
import type { Station } from '../src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LOGO_SIZE = 190;
const GRID_ITEM_SIZE = 100;

// Country code to flag emoji mapping
const getCountryFlag = (countryCode?: string): string => {
  if (!countryCode) return '🌍';
  const code = countryCode.toUpperCase();
  const flags: Record<string, string> = {
    'DE': '🇩🇪', 'TR': '🇹🇷', 'US': '🇺🇸', 'GB': '🇬🇧', 'FR': '🇫🇷',
    'ES': '🇪🇸', 'IT': '🇮🇹', 'NL': '🇳🇱', 'BE': '🇧🇪', 'AT': '🇦🇹',
    'CH': '🇨🇭', 'PL': '🇵🇱', 'RU': '🇷🇺', 'JP': '🇯🇵', 'KR': '🇰🇷',
    'CN': '🇨🇳', 'BR': '🇧🇷', 'MX': '🇲🇽', 'CA': '🇨🇦', 'AU': '🇦🇺',
    'IN': '🇮🇳', 'SA': '🇸🇦', 'AE': '🇦🇪', 'EG': '🇪🇬', 'ZA': '🇿🇦',
    'GERMANY': '🇩🇪', 'TURKEY': '🇹🇷', 'UNITED STATES': '🇺🇸',
    'UNITED KINGDOM': '🇬🇧', 'FRANCE': '🇫🇷', 'SPAIN': '🇪🇸',
    'HUNGARY': '🇭🇺', 'HU': '🇭🇺',
  };
  return flags[code] || flags[countryCode.toUpperCase()] || '🌍';
};

export default function PlayerScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const {
    currentStation,
    playbackState,
    nowPlaying,
  } = usePlayerStore();

  const { playStation, togglePlayPause } = useAudioPlayer();
  
  // Fetch similar stations based on current station ID
  const { data: similarData, isLoading: similarLoading } = useSimilarStations(
    currentStation?._id || '', 
    9
  );
  
  // Fetch popular stations as fallback
  const { data: popularData, isLoading: popularLoading } = usePopularStations(undefined, 12);

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

  // Handle station press without causing re-renders
  const handleStationPress = (station: Station) => {
    if (station._id !== currentStation?._id) {
      playStation(station);
    }
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
  
  // Memoize stations to prevent unnecessary re-renders
  const popularStations = useMemo(() => {
    return popularData?.stations || (Array.isArray(popularData) ? popularData : []);
  }, [popularData]);
  
  const similarStations = useMemo(() => {
    const similar = similarData?.stations || (Array.isArray(similarData) ? similarData : []);
    // Filter out current station from similar
    return similar.filter((s: Station) => s._id !== currentStation?._id);
  }, [similarData, currentStation?._id]);
  
  // Use similar stations if available, otherwise use popular
  const displaySimilarStations = useMemo(() => {
    if (similarStations.length > 0) return similarStations;
    return popularStations.filter((s: Station) => s._id !== currentStation?._id);
  }, [similarStations, popularStations, currentStation?._id]);

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

  // Station Grid Item Component - Memoized to prevent re-renders
  const StationGridItem = React.memo(({ station }: { station: Station }) => {
    const stationLogo = getLogoUrl(station);
    const flag = getCountryFlag(station.countrycode || station.country);
    
    return (
      <View style={styles.gridItemContainer}>
        <TouchableOpacity
          onPress={() => handleStationPress(station)}
          activeOpacity={0.7}
        >
          <View style={styles.gridImageWrapper}>
            <Image 
              source={{ uri: stationLogo || 'https://via.placeholder.com/100' }} 
              style={styles.gridImage}
              resizeMode="cover" 
            />
            {/* Country flag badge */}
            <View style={styles.flagBadge}>
              <Text style={styles.flagText}>{flag}</Text>
            </View>
          </View>
          <Text style={styles.gridStationName} numberOfLines={1}>
            {station.name}
          </Text>
          <Text style={styles.gridStationLocation} numberOfLines={1}>
            {station.country || 'Unknown'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  });

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with blur */}
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

          {/* Album Art with Country Flag - Fixed 190x190 */}
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
              {/* Country flag badge on artwork */}
              <View style={styles.artworkFlagBadge}>
                <Text style={styles.artworkFlagText}>
                  {getCountryFlag(currentStation.countrycode || currentStation.country)}
                </Text>
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
            
            {/* Divider line */}
            <View style={styles.divider} />
          </View>

          {/* Main Controls with Custom Icons */}
          <View style={styles.mainControls}>
            {/* Timer */}
            <TouchableOpacity style={styles.controlButton}>
              <Image source={TimerIcon} style={styles.controlIcon} resizeMode="contain" />
            </TouchableOpacity>
            
            {/* Previous */}
            <TouchableOpacity style={styles.skipButton}>
              <Image source={PrevIcon} style={styles.skipIcon} resizeMode="contain" />
            </TouchableOpacity>
            
            {/* Play/Pause */}
            <TouchableOpacity
              style={styles.playPauseButton}
              onPress={togglePlayPause}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="large" color="#FFFFFF" />
              ) : isPlaying ? (
                <Image source={PauseIcon} style={styles.playPauseIcon} resizeMode="contain" />
              ) : (
                <Ionicons name="play" size={36} color="#FFFFFF" style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>
            
            {/* Next */}
            <TouchableOpacity style={styles.skipButton}>
              <Image source={NextIcon} style={styles.skipIcon} resizeMode="contain" />
            </TouchableOpacity>
            
            {/* Heart */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleToggleFavorite}
              disabled={checkingFavorite}
            >
              {checkingFavorite ? (
                <ActivityIndicator size="small" color="#AAAAAA" />
              ) : isFavorite ? (
                <Ionicons name="heart" size={26} color="#FF4757" />
              ) : (
                <Image source={HeartIcon} style={styles.controlIcon} resizeMode="contain" />
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
              {popularStations.slice(0, 6).map((station: Station, index: number) => (
                <StationGridItem key={`recent-${station._id}-${index}`} station={station} />
              ))}
            </View>
          </View>

          {/* Similar Radios Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Similar Radios</Text>
            {similarLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginTop: 20 }} />
            ) : (
              <View style={styles.stationGrid}>
                {displaySimilarStations.slice(0, 9).map((station: Station, index: number) => (
                  <StationGridItem key={`similar-${station._id}-${index}`} station={station} />
                ))}
              </View>
            )}
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

  // Header with blur
  headerContainer: {
    width: '100%',
    height: 107,
    marginBottom: 8,
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
    opacity: 0.9,
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

  // Artwork - Fixed 190x190
  artworkContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  artworkWrapper: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 20,
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
  artworkFlagBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkFlagText: {
    fontSize: 18,
  },

  // Now Playing
  nowPlayingSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
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
    textAlign: 'center',
  },
  artistName: {
    fontSize: 16,
    color: '#AAAAAA',
    marginBottom: 12,
    textAlign: 'center',
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
  divider: {
    width: '80%',
    height: 1,
    backgroundColor: '#2D2D2D',
    marginTop: 16,
  },

  // Main Controls
  mainControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 16,
  },
  controlButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlIcon: {
    width: 28,
    height: 28,
  },
  skipButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3A3A3C',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  skipIcon: {
    width: 32,
    height: 32,
  },
  playPauseButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#3A3A3C',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  playPauseIcon: {
    width: 40,
    height: 40,
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
    fontFamily: Platform.OS === 'ios' ? 'Ubuntu' : 'sans-serif',
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  stationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  // Grid Items
  gridItemContainer: {
    width: GRID_ITEM_SIZE,
    marginRight: 10,
    marginBottom: 16,
  },
  gridImageWrapper: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
    marginBottom: 8,
    position: 'relative',
  },
  gridImage: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
  },
  flagBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagText: {
    fontSize: 12,
  },
  gridStationName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  gridStationLocation: {
    fontSize: 10,
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

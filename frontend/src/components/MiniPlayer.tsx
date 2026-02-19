import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, borderRadius, spacing, typography } from '../constants/theme';
import { usePlayerStore } from '../store/playerStore';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useFavoritesStore } from '../store/favoritesStore';
import { ChevronUpIcon, HeartOutlineIcon, HeartFilledIcon, PauseIcon, PlayIcon } from './TabBarIcons';
import type { Station } from '../types';

// Default station logo URL - fallback when no logo available
const DEFAULT_STATION_LOGO = 'https://themegaradio.com/images/default-station.png';

// Logo URL helper - always returns a valid URL
const getStationLogoUrl = (station: Station | null | undefined): string => {
  if (!station) return DEFAULT_STATION_LOGO;
  
  try {
    if (station.logoAssets?.webp96 && station.logoAssets?.folder) {
      const folder = encodeURIComponent(station.logoAssets.folder);
      const file = encodeURIComponent(station.logoAssets.webp96);
      return `https://themegaradio.com/station-logos/${folder}/${file}`;
    }
    
    if (station.favicon && station.favicon.trim()) {
      const favicon = station.favicon.trim();
      if (favicon.startsWith('http://') || favicon.startsWith('https://')) {
        return favicon;
      } else if (favicon.startsWith('/')) {
        return `https://themegaradio.com${favicon}`;
      }
    }
    
    if (station.logo && station.logo.trim()) {
      const logo = station.logo.trim();
      if (logo.startsWith('http://') || logo.startsWith('https://')) {
        return logo;
      } else if (logo.startsWith('/')) {
        return `https://themegaradio.com${logo}`;
      }
    }
  } catch (e) {}
  
  return DEFAULT_STATION_LOGO;
};

// Check if we're on web
const isWeb = Platform.OS === 'web';

// Tab bar height - must match _layout.tsx
const BASE_TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 85 : 65;
const MINI_PLAYER_HEIGHT = 70;

interface MiniPlayerProps {
  isGlobal?: boolean; // If true, position at bottom: 0 (for non-tab screens)
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ isGlobal = false }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    currentStation,
    playbackState,
    nowPlaying,
    isMiniPlayerVisible,
    hideMiniPlayer,
  } = usePlayerStore();
  
  // Calculate tab bar height including system navigation bar for Android
  // Tab bar height: iOS=85, Android=65 + system nav bar inset
  const systemNavBarHeight = Platform.OS === 'android' ? insets.bottom : 0;
  const baseTabBarHeight = Platform.OS === 'ios' ? 85 : 65;
  const tabBarHeight = baseTabBarHeight + systemNavBarHeight;
  
  // Use the shared audio player hook - get all functions at once
  const { pause, resume, stop } = useAudioPlayer();
  
  // Favorites store
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  
  // Check if current station is favorited
  const isCurrentFavorite = currentStation ? isFavorite(currentStation._id) : false;

  // Early return AFTER all hooks
  if (!isMiniPlayerVisible || !currentStation) {
    return null;
  }

  // Get logo URL using shared utility
  const logoUrl = getStationLogoUrl(currentStation);
  const isPlaying = playbackState === 'playing';
  const isLoading = playbackState === 'loading' || playbackState === 'buffering';

  // Get genre/category from station
  const getGenre = () => {
    if (currentStation.tags && typeof currentStation.tags === 'string') {
      return currentStation.tags.split(',')[0].trim();
    }
    if (currentStation.genres && Array.isArray(currentStation.genres) && currentStation.genres.length > 0) {
      return currentStation.genres[0];
    }
    return currentStation.country || 'Radio';
  };

  const handlePress = () => {
    router.push('/player');
  };

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await pause();
      } else if (playbackState === 'paused') {
        await resume();
      }
    } catch (error) {
      console.error('[MiniPlayer] Play/Pause error:', error);
    }
  };

  const handleFavorite = async () => {
    console.log('[MiniPlayer] handleFavorite called');
    if (currentStation) {
      console.log('[MiniPlayer] Calling toggleFavorite for station:', currentStation._id);
      try {
        await toggleFavorite(currentStation);
        console.log('[MiniPlayer] toggleFavorite completed successfully');
      } catch (err) {
        console.error('[MiniPlayer] toggleFavorite error:', err);
      }
    } else {
      console.log('[MiniPlayer] No currentStation available');
    }
  };
  
  // Handle dismiss - stop playback and hide mini player
  const handleDismiss = async () => {
    try {
      await stop();
      hideMiniPlayer();
    } catch (e) {
      console.error('[MiniPlayer] Stop error:', e);
    }
  };

  return (
    <View style={[
      styles.container, 
      { bottom: isGlobal ? 0 : tabBarHeight },
      isGlobal && styles.containerGlobal
    ]}>
      <View style={styles.content}>
        {/* Chevron Up Button */}
        <TouchableOpacity style={styles.chevronButton} onPress={handlePress}>
          <ChevronUpIcon color="#FFFFFF" size={32} />
        </TouchableOpacity>

        {/* Station Logo - Tappable to open player */}
        <TouchableOpacity style={styles.logoContainer} onPress={handlePress} activeOpacity={0.8}>
          <Image source={{ uri: logoUrl }} style={styles.logo} resizeMode="cover" />
        </TouchableOpacity>

        {/* Station Info - Tappable to open player */}
        <TouchableOpacity style={styles.info} onPress={handlePress} activeOpacity={0.8}>
          <Text style={styles.stationName} numberOfLines={1}>
            {currentStation.name}
          </Text>
          <Text style={styles.genreText} numberOfLines={1}>
            {nowPlaying?.song || nowPlaying?.title || getGenre()}
          </Text>
        </TouchableOpacity>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Play/Pause Button */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handlePlayPause}
            disabled={isLoading}
            testID="mini-player-play-pause"
            accessibilityLabel={isPlaying ? "Pause" : "Play"}
            accessibilityRole="button"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : isPlaying ? (
              <PauseIcon color="#FFFFFF" size={18} />
            ) : (
              <PlayIcon color="#FFFFFF" size={18} />
            )}
          </TouchableOpacity>

          {/* Favorite Button */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleFavorite}
            testID="mini-player-favorite"
            accessibilityLabel="Toggle Favorite"
            accessibilityRole="button"
          >
            {isCurrentFavorite ? (
              <HeartFilledIcon color="#FF4081" size={18} />
            ) : (
              <HeartOutlineIcon color="#FFFFFF" size={18} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    // bottom is set dynamically via inline style
    left: 0,
    right: 0,
    height: MINI_PLAYER_HEIGHT,
    backgroundColor: '#000000',
    borderTopWidth: 0,
  },
  containerGlobal: {
    // bottom: 0 is handled inline
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  chevronButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  logoContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#2F2F2F',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  placeholderLogo: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2F2F2F',
  },
  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  genreText: {
    fontSize: 14,
    color: '#AAAAAA',
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3A3A3C',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MiniPlayer;

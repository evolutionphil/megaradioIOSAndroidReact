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
import { colors, borderRadius, spacing, typography } from '../constants/theme';
import { usePlayerStore } from '../store/playerStore';
import { ChevronUpIcon, HeartOutlineIcon, PauseIcon, PlayIcon } from './TabBarIcons';

// Tab bar height - must match _layout.tsx
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 85 : 65;
const MINI_PLAYER_HEIGHT = 70;

export const MiniPlayer: React.FC = () => {
  const router = useRouter();
  const {
    currentStation,
    playbackState,
    nowPlaying,
    isMiniPlayerVisible,
    setPlaybackState,
  } = usePlayerStore();

  if (!isMiniPlayerVisible || !currentStation) {
    return null;
  }

  // Get logo URL
  const getLogoUrl = () => {
    if (currentStation.logoAssets?.webp96) {
      return `https://themegaradio.com/station-logos/${currentStation.logoAssets.folder}/${currentStation.logoAssets.webp96}`;
    }
    return currentStation.favicon || currentStation.logo || null;
  };

  const logoUrl = getLogoUrl();
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

  const handlePlayPause = () => {
    if (isPlaying) {
      setPlaybackState('paused');
    } else if (playbackState === 'paused') {
      setPlaybackState('playing');
    }
  };

  const handleFavorite = () => {
    // TODO: Implement favorite toggle
    console.log('Toggle favorite');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.content}
        onPress={handlePress}
        activeOpacity={0.95}
      >
        {/* Chevron Up Button */}
        <TouchableOpacity style={styles.chevronButton} onPress={handlePress}>
          <ChevronUpIcon color="#FFFFFF" size={32} />
        </TouchableOpacity>

        {/* Station Logo */}
        <View style={styles.logoContainer}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.logo} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderLogo}>
              <Ionicons name="radio" size={24} color="#FFFFFF" />
            </View>
          )}
        </View>

        {/* Station Info */}
        <View style={styles.info}>
          <Text style={styles.stationName} numberOfLines={1}>
            {currentStation.name}
          </Text>
          <Text style={styles.genreText} numberOfLines={1}>
            {getGenre()}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Play/Pause Button */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handlePlayPause}
            disabled={isLoading}
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
          >
            <HeartOutlineIcon color="#FFFFFF" size={18} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: TAB_BAR_HEIGHT,
    left: 0,
    right: 0,
    height: MINI_PLAYER_HEIGHT,
    backgroundColor: '#000000',
    borderTopWidth: 0,
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

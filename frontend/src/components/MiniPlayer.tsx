import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, borderRadius, spacing, typography, shadows } from '../constants/theme';
import { usePlayerStore, PlaybackState } from '../store/playerStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MINI_PLAYER_HEIGHT = 64;

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

  const logoUrl =
    currentStation.logoAssets?.webp96 ||
    currentStation.favicon ||
    currentStation.logo;

  const isPlaying = playbackState === 'playing';
  const isLoading = playbackState === 'loading' || playbackState === 'buffering';

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

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {/* Progress bar */}
      {isPlaying && <View style={styles.progressBar} />}

      <View style={styles.content}>
        {/* Station Logo */}
        <View style={styles.logoContainer}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.logo} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderLogo}>
              <Ionicons name="radio" size={24} color={colors.textMuted} />
            </View>
          )}
        </View>

        {/* Station Info */}
        <View style={styles.info}>
          <Text style={styles.stationName} numberOfLines={1}>
            {currentStation.name}
          </Text>
          <Text style={styles.nowPlaying} numberOfLines={1}>
            {nowPlaying?.title || currentStation.country || 'Streaming...'}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={handlePlayPause}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={24}
                color={colors.text}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80, // Above tab bar
    left: 0,
    right: 0,
    height: MINI_PLAYER_HEIGHT,
    backgroundColor: colors.playerBackground,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.md,
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 2,
    width: '100%',
    backgroundColor: colors.playerProgress,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surface,
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
  },
  info: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  stationName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  nowPlaying: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MiniPlayer;

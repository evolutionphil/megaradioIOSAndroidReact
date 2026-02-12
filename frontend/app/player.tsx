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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, gradients, spacing, borderRadius, typography } from '../src/constants/theme';
import { useAudioPlayer } from '../src/hooks/useAudioPlayer';
import { usePlayerStore } from '../src/store/playerStore';
import { useAddFavorite, useRemoveFavorite, useSimilarStations } from '../src/hooks/useQueries';
import userService from '../src/services/userService';
import { useAuthStore } from '../src/store/authStore';
import { StationCard } from '../src/components/StationCard';
import type { Station } from '../src/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PlayerScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const {
    currentStation,
    playbackState,
    nowPlaying,
  } = usePlayerStore();

  const { playStation, togglePlayPause, stopPlayback } = useAudioPlayer();
  const { data: similarData } = useSimilarStations(currentStation?._id || '', 6);

  const [isFavorite, setIsFavorite] = useState(false);
  const [checkingFavorite, setCheckingFavorite] = useState(false);

  const addFavoriteMutation = useAddFavorite();
  const removeFavoriteMutation = useRemoveFavorite();

  // Check if station is favorited
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
    } catch (error) {
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

  const handleSimilarStationPress = (station: Station) => {
    playStation(station);
  };

  const isLoading = playbackState === 'loading' || playbackState === 'buffering';
  const isPlaying = playbackState === 'playing';
  const hasError = playbackState === 'error';

  const logoUrl = currentStation?.logoAssets?.webp384 ||
    currentStation?.logoAssets?.webp192 ||
    currentStation?.favicon ||
    currentStation?.logo;

  const similarStations = similarData?.stations || [];

  if (!currentStation) {
    return (
      <LinearGradient colors={gradients.background} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <View style={styles.emptyState}>
            <Ionicons name="radio-outline" size={80} color={colors.textMuted} />
            <Text style={styles.emptyText}>No station playing</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={gradients.player} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
              <Ionicons name="chevron-down" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Now Playing</Text>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Album Art */}
          <View style={styles.artworkContainer}>
            {logoUrl ? (
              <Image
                source={{ uri: logoUrl }}
                style={styles.artwork}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.artworkPlaceholder}>
                <Ionicons name="radio" size={80} color={colors.textMuted} />
              </View>
            )}
            {isPlaying && (
              <View style={styles.playingIndicator}>
                <View style={styles.equalizerBar} />
                <View style={[styles.equalizerBar, styles.equalizerBar2]} />
                <View style={[styles.equalizerBar, styles.equalizerBar3]} />
              </View>
            )}
          </View>

          {/* Station Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.stationName} numberOfLines={2}>
              {currentStation.name}
            </Text>
            <Text style={styles.stationMeta}>
              {currentStation.country || currentStation.countrycode}
              {currentStation.genres?.[0] && ` • ${currentStation.genres[0]}`}
            </Text>
            {nowPlaying?.title && (
              <View style={styles.nowPlayingContainer}>
                <Ionicons name="musical-notes" size={16} color={colors.primary} />
                <Text style={styles.nowPlayingText} numberOfLines={1}>
                  {nowPlaying.title}
                </Text>
              </View>
            )}
          </View>

          {/* Error Message */}
          {hasError && (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={20} color={colors.error} />
              <Text style={styles.errorText}>Unable to play this station</Text>
            </View>
          )}

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleToggleFavorite}
              disabled={checkingFavorite}
            >
              {checkingFavorite ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={28}
                  color={isFavorite ? colors.accent : colors.text}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.playPauseButton}
              onPress={togglePlayPause}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="large" color={colors.text} />
              ) : (
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={40}
                  color={colors.text}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton}>
              <Ionicons name="share-outline" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Station Details */}
          <View style={styles.detailsContainer}>
            {currentStation.bitrate && (
              <View style={styles.detailItem}>
                <Ionicons name="speedometer-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>{currentStation.bitrate} kbps</Text>
              </View>
            )}
            {currentStation.codec && (
              <View style={styles.detailItem}>
                <Ionicons name="disc-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>{currentStation.codec}</Text>
              </View>
            )}
            {currentStation.language && (
              <View style={styles.detailItem}>
                <Ionicons name="language-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>{currentStation.language}</Text>
              </View>
            )}
          </View>

          {/* Similar Stations */}
          {similarStations.length > 0 && (
            <View style={styles.similarSection}>
              <Text style={styles.similarTitle}>Similar Stations</Text>
              {similarStations.map((station) => (
                <StationCard
                  key={station._id}
                  station={station}
                  onPress={handleSimilarStationPress}
                  isPlaying={currentStation._id === station._id && isPlaying}
                  isLoading={currentStation._id === station._id && isLoading}
                />
              ))}
            </View>
          )}
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  artworkContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  artwork: {
    width: SCREEN_WIDTH - spacing.xl * 2,
    height: SCREEN_WIDTH - spacing.xl * 2,
    maxWidth: 320,
    maxHeight: 320,
    borderRadius: borderRadius.lg,
  },
  artworkPlaceholder: {
    width: SCREEN_WIDTH - spacing.xl * 2,
    height: SCREEN_WIDTH - spacing.xl * 2,
    maxWidth: 320,
    maxHeight: 320,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playingIndicator: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.overlay,
    borderRadius: borderRadius.sm,
    padding: spacing.xs,
  },
  equalizerBar: {
    width: 4,
    height: 16,
    backgroundColor: colors.primary,
    borderRadius: 2,
    marginHorizontal: 2,
  },
  equalizerBar2: {
    height: 24,
  },
  equalizerBar3: {
    height: 12,
  },
  infoContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  stationName: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  stationMeta: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  nowPlayingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  nowPlayingText: {
    marginLeft: spacing.xs,
    fontSize: typography.sizes.sm,
    color: colors.text,
    maxWidth: 200,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    marginLeft: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.error,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.xl,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  detailText: {
    marginLeft: spacing.xs,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  similarSection: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  similarTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
  },
  closeButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  closeButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
});

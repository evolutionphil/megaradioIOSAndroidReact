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
import { colors, gradients, spacing, borderRadius, typography, shadows } from '../src/constants/theme';
import { useAudioPlayer } from '../src/hooks/useAudioPlayer';
import { usePlayerStore } from '../src/store/playerStore';
import { useAddFavorite, useRemoveFavorite, useSimilarStations } from '../src/hooks/useQueries';
import userService from '../src/services/userService';
import { useAuthStore } from '../src/store/authStore';
import { StationCard } from '../src/components/StationCard';
import type { Station } from '../src/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ARTWORK_SIZE = Math.min(SCREEN_WIDTH - spacing.xl * 2, 300);

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
      <LinearGradient colors={gradients.background as any} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="radio-outline" size={64} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No station playing</Text>
            <Text style={styles.emptyText}>Select a station to start listening</Text>
            <TouchableOpacity style={styles.goBackButton} onPress={handleClose}>
              <Text style={styles.goBackButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1A1725', '#0D0B14'] as any} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
              <Ionicons name="chevron-down" size={26} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerLabel}>NOW PLAYING</Text>
              <Text style={styles.headerTitle} numberOfLines={1}>{currentStation.name}</Text>
            </View>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
            </TouchableOpacity>
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
                  <Ionicons name="radio" size={80} color={colors.textMuted} />
                </View>
              )}
              {isPlaying && (
                <View style={styles.playingOverlay}>
                  <View style={styles.equalizer}>
                    <View style={[styles.eqBar, styles.eqBar1]} />
                    <View style={[styles.eqBar, styles.eqBar2]} />
                    <View style={[styles.eqBar, styles.eqBar3]} />
                    <View style={[styles.eqBar, styles.eqBar4]} />
                    <View style={[styles.eqBar, styles.eqBar5]} />
                  </View>
                </View>
              )}
            </View>
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
                <Ionicons name="musical-notes" size={14} color={colors.primary} />
                <Text style={styles.nowPlayingText} numberOfLines={1}>
                  {nowPlaying.title}
                </Text>
              </View>
            )}
          </View>

          {/* Error Message */}
          {hasError && (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={18} color={colors.error} />
              <Text style={styles.errorText}>Unable to play this station</Text>
            </View>
          )}

          {/* Main Controls */}
          <View style={styles.controls}>
            <TouchableOpacity style={styles.secondaryControl}>
              <Ionicons name="shuffle" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipControl}>
              <Ionicons name="play-skip-back" size={28} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.playPauseButton}
              onPress={togglePlayPause}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark] as any}
                style={styles.playPauseGradient}
              >
                {isLoading ? (
                  <ActivityIndicator size="large" color={colors.text} />
                ) : (
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={36}
                    color={colors.text}
                    style={!isPlaying && { marginLeft: 4 }}
                  />
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipControl}>
              <Ionicons name="play-skip-forward" size={28} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryControl}>
              <Ionicons name="repeat" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleToggleFavorite}
              disabled={checkingFavorite}
            >
              {checkingFavorite ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <>
                  <Ionicons
                    name={isFavorite ? 'heart' : 'heart-outline'}
                    size={22}
                    color={isFavorite ? colors.accent : colors.text}
                  />
                  <Text style={styles.actionButtonText}>
                    {isFavorite ? 'Saved' : 'Save'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="share-outline" size={22} color={colors.text} />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="download-outline" size={22} color={colors.text} />
              <Text style={styles.actionButtonText}>Record</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="timer-outline" size={22} color={colors.text} />
              <Text style={styles.actionButtonText}>Sleep</Text>
            </TouchableOpacity>
          </View>

          {/* Station Details */}
          <View style={styles.detailsContainer}>
            {currentStation.bitrate && (
              <View style={styles.detailChip}>
                <Ionicons name="speedometer-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.detailText}>{currentStation.bitrate} kbps</Text>
              </View>
            )}
            {currentStation.codec && (
              <View style={styles.detailChip}>
                <Ionicons name="disc-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.detailText}>{currentStation.codec}</Text>
              </View>
            )}
            {currentStation.language && (
              <View style={styles.detailChip}>
                <Ionicons name="language-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.detailText}>{currentStation.language}</Text>
              </View>
            )}
          </View>

          {/* Similar Stations */}
          {similarStations.length > 0 && (
            <View style={styles.similarSection}>
              <Text style={styles.similarTitle}>Similar Stations</Text>
              {similarStations.slice(0, 4).map((station) => (
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
  
  // Header
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  
  // Artwork
  artworkContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  artworkWrapper: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  artworkPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  equalizer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 30,
    gap: 4,
  },
  eqBar: {
    width: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  eqBar1: { height: 12 },
  eqBar2: { height: 24 },
  eqBar3: { height: 18 },
  eqBar4: { height: 28 },
  eqBar5: { height: 16 },
  
  // Info
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
    gap: spacing.xs,
  },
  nowPlayingText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    maxWidth: 200,
  },
  
  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.error,
  },
  
  // Controls
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  secondaryControl: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipControl: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    ...shadows.glow,
  },
  playPauseGradient: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  actionButton: {
    alignItems: 'center',
    padding: spacing.sm,
  },
  actionButtonText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  
  // Details
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  detailText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  
  // Similar Stations
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
  
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  goBackButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  goBackButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
});

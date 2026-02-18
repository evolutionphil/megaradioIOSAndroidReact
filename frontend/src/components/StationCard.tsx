import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing, typography, shadows, gradients } from '../constants/theme';
import type { Station } from '../types';

// Default station logo URL - fallback when no logo available
const DEFAULT_STATION_LOGO = 'https://themegaradio.com/images/default-station.png';

interface StationCardProps {
  station: Station;
  onPress: (station: Station) => void;
  isPlaying?: boolean;
  isLoading?: boolean;
  style?: object;
  variant?: 'default' | 'compact' | 'large';
}

export const StationCard: React.FC<StationCardProps> = ({
  station,
  onPress,
  isPlaying = false,
  isLoading = false,
  style,
  variant = 'default',
}) => {
  // Helper function to build reliable logo URL with fallback
  const getLogoUrl = (): string => {
    try {
      // Priority 1: logoAssets (best quality, our own CDN)
      if (station.logoAssets?.webp96 && station.logoAssets?.folder) {
        const folder = encodeURIComponent(station.logoAssets.folder);
        const file = encodeURIComponent(station.logoAssets.webp96);
        return `https://themegaradio.com/station-logos/${folder}/${file}`;
      }
      
      // Priority 2: favicon field
      if (station.favicon && station.favicon.trim()) {
        const favicon = station.favicon.trim();
        if (favicon.startsWith('http://') || favicon.startsWith('https://')) {
          return favicon;
        } else if (favicon.startsWith('/')) {
          return `https://themegaradio.com${favicon}`;
        }
      }
      
      // Priority 3: logo field
      if (station.logo && station.logo.trim()) {
        const logo = station.logo.trim();
        if (logo.startsWith('http://') || logo.startsWith('https://')) {
          return logo;
        } else if (logo.startsWith('/')) {
          return `https://themegaradio.com${logo}`;
        }
      }
    } catch (e) {
      console.log('[StationCard] Logo URL error:', e);
    }
    
    // Fallback: Default station logo
    return DEFAULT_STATION_LOGO;
  };

  const logoUrl = getLogoUrl();

  if (variant === 'large') {
    return (
      <TouchableOpacity
        style={[styles.largeContainer, style]}
        onPress={() => onPress(station)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={gradients.cardElevated as any}
          style={styles.largeGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.largeLogo}>
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} style={styles.largeLogoImage} resizeMode="cover" />
            ) : (
              <View style={styles.largePlaceholder}>
                <Ionicons name="radio" size={40} color={colors.textMuted} />
              </View>
            )}
            {isPlaying && !isLoading && (
              <View style={styles.largePlayingIndicator}>
                <Ionicons name="volume-high" size={16} color={colors.text} />
              </View>
            )}
          </View>
          <Text style={styles.largeName} numberOfLines={1}>{station.name}</Text>
          <Text style={styles.largeCountry} numberOfLines={1}>
            {station.country || 'Radio'}
          </Text>
          <TouchableOpacity style={[styles.largePlayBtn, isPlaying && styles.playBtnActive]}>
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color={colors.text} />
            )}
          </TouchableOpacity>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, isPlaying && styles.compactActive, style]}
        onPress={() => onPress(station)}
        activeOpacity={0.7}
      >
        <View style={styles.compactLogo}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.compactLogoImage} resizeMode="cover" />
          ) : (
            <View style={styles.compactPlaceholder}>
              <Ionicons name="radio" size={16} color={colors.textMuted} />
            </View>
          )}
        </View>
        <Text style={styles.compactName} numberOfLines={1}>{station.name}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, isPlaying && styles.containerPlaying, style]}
      onPress={() => onPress(station)}
      activeOpacity={0.7}
    >
      <View style={styles.logoContainer}>
        {logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            style={styles.logo}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderLogo}>
            <Ionicons name="radio" size={24} color={colors.textMuted} />
          </View>
        )}
        {isPlaying && !isLoading && (
          <View style={styles.playingBadge}>
            <View style={styles.equalizerContainer}>
              <View style={[styles.eqBar, styles.eqBar1]} />
              <View style={[styles.eqBar, styles.eqBar2]} />
              <View style={[styles.eqBar, styles.eqBar3]} />
            </View>
          </View>
        )}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </View>
      
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {station.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {station.country || station.countrycode || 'Unknown'}
          {station.genres?.[0] && ` • ${station.genres[0]}`}
        </Text>
      </View>

      <TouchableOpacity 
        style={[styles.playButton, isPlaying && styles.playButtonActive]}
        onPress={() => onPress(station)}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : (
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={16}
            color={colors.text}
          />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Default variant
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  containerPlaying: {
    backgroundColor: colors.backgroundCardHover,
    borderColor: colors.primary,
    ...shadows.glow,
  },
  logoContainer: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
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
    backgroundColor: colors.surfaceLight,
  },
  playingBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primary,
    paddingVertical: 2,
    alignItems: 'center',
  },
  equalizerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 10,
    gap: 2,
  },
  eqBar: {
    width: 3,
    backgroundColor: colors.text,
    borderRadius: 1,
  },
  eqBar1: { height: 4 },
  eqBar2: { height: 8 },
  eqBar3: { height: 5 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  name: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  meta: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonActive: {
    backgroundColor: colors.accent,
  },
  
  // Large variant
  largeContainer: {
    width: 150,
    marginRight: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  largeGradient: {
    padding: spacing.md,
    alignItems: 'center',
  },
  largeLogo: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  largeLogoImage: {
    width: '100%',
    height: '100%',
  },
  largePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
  },
  largePlayingIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  largeCountry: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  largePlayBtn: {
    marginTop: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtnActive: {
    backgroundColor: colors.accent,
  },
  
  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  compactActive: {
    borderColor: colors.primary,
    backgroundColor: colors.backgroundCardHover,
  },
  compactLogo: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  compactLogoImage: {
    width: '100%',
    height: '100%',
  },
  compactPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactName: {
    marginLeft: spacing.sm,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
    maxWidth: 100,
  },
});

export default StationCard;

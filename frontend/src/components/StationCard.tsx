import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing, typography, shadows } from '../constants/theme';
import type { Station } from '../types';

interface StationCardProps {
  station: Station;
  onPress: (station: Station) => void;
  isPlaying?: boolean;
  isLoading?: boolean;
  style?: object;
}

export const StationCard: React.FC<StationCardProps> = ({
  station,
  onPress,
  isPlaying = false,
  isLoading = false,
  style,
}) => {
  const logoUrl = station.logoAssets?.webp96 || station.favicon || station.logo;

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
            <Ionicons name="radio" size={28} color={colors.textMuted} />
          </View>
        )}
        {isPlaying && !isLoading && (
          <View style={styles.playingIndicator}>
            <Ionicons name="musical-notes" size={14} color={colors.text} />
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
        <Text style={styles.country} numberOfLines={1}>
          {station.country || station.countrycode || 'Unknown'}
          {station.genre && ` • ${station.genres?.[0] || ''}`}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.playButton}>
          <Ionicons
            name={isPlaying && !isLoading ? 'pause' : 'play'}
            size={18}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  containerPlaying: {
    backgroundColor: colors.backgroundCardHover,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  logoContainer: {
    width: 56,
    height: 56,
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
    backgroundColor: colors.surface,
  },
  playingIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  name: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  country: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default StationCard;

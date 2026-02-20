import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing, typography, shadows } from '../constants/theme';
import type { Genre } from '../types';

interface GenreCardProps {
  genre: Genre;
  onPress: (genre: Genre) => void;
  style?: object;
  size?: 'small' | 'medium' | 'large';
}

// Genre specific gradients and icons
const genreStyles: Record<string, { gradient: [string, string]; icon: keyof typeof Ionicons.glyphMap }> = {
  pop: { gradient: ['#FF6B6B', '#EE5A5A'], icon: 'star' },
  rock: { gradient: ['#4ECDC4', '#2EC4B6'], icon: 'flash' },
  jazz: { gradient: ['#FFD93D', '#F5CB38'], icon: 'musical-notes' },
  classical: { gradient: ['#6BCB77', '#5CB868'], icon: 'leaf' },
  electronic: { gradient: ['#4D96FF', '#3D8BFF'], icon: 'pulse' },
  'hip-hop': { gradient: ['#FF8585', '#FF7070'], icon: 'mic' },
  country: { gradient: ['#C9B037', '#B8A032'], icon: 'sunny' },
  world: { gradient: ['#9B59B6', '#8E44AD'], icon: 'earth' },
  news: { gradient: ['#667eea', '#764ba2'], icon: 'newspaper' },
  talk: { gradient: ['#f093fb', '#f5576c'], icon: 'chatbubbles' },
  sports: { gradient: ['#4facfe', '#00f2fe'], icon: 'football' },
  oldies: { gradient: ['#fa709a', '#fee140'], icon: 'time' },
  alternative: { gradient: ['#a8edea', '#fed6e3'], icon: 'bonfire' },
  reggae: { gradient: ['#11998e', '#38ef7d'], icon: 'leaf' },
  metal: { gradient: ['#434343', '#000000'], icon: 'skull' },
  folk: { gradient: ['#c79081', '#dfa579'], icon: 'cafe' },
  default: { gradient: ['#8B5CF6', '#7C3AED'], icon: 'radio' },
};

const getGenreStyle = (slug: string) => {
  const key = slug.toLowerCase().replace(/[\s_]/g, '-');
  return genreStyles[key] || genreStyles.default;
};

export const GenreCard: React.FC<GenreCardProps> = ({
  genre,
  onPress,
  style,
  size = 'medium',
}) => {
  const { gradient, icon } = getGenreStyle(genre.slug);
  
  const containerStyle = [
    styles.container,
    size === 'small' && styles.containerSmall,
    size === 'large' && styles.containerLarge,
    style,
  ];
  
  const iconSize = size === 'small' ? 20 : size === 'large' ? 32 : 24;

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={() => onPress(genre)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={gradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={iconSize} color="rgba(255,255,255,0.9)" />
        </View>
        <View style={styles.content}>
          <Text style={[styles.name, size === 'small' && styles.nameSmall]} numberOfLines={1}>
            {genre.name}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 140,
    height: 90,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  containerSmall: {
    width: 110,
    height: 70,
  },
  containerLarge: {
    width: 160,
    height: 110,
  },
  gradient: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  name: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  nameSmall: {
    fontSize: typography.sizes.sm,
  },
  count: {
    fontSize: typography.sizes.xs,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
});

export default GenreCard;

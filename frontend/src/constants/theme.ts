// MegaRadio Theme - Premium Dark Theme inspired by Figma designs
export const colors = {
  // Primary colors - Vibrant purple
  primary: '#8B5CF6',
  primaryLight: '#A78BFA',
  primaryDark: '#7C3AED',
  
  // Background colors - Deep dark with purple tint
  background: '#0D0B14',
  backgroundSecondary: '#13111C',
  backgroundCard: '#1A1725',
  backgroundCardHover: '#221F2E',
  
  // Surface colors
  surface: '#1A1725',
  surfaceLight: '#241F30',
  surfaceElevated: '#2A2538',
  
  // Text colors
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textAccent: '#C4B5FD',
  
  // Accent colors - Pink/Magenta
  accent: '#EC4899',
  accentSecondary: '#F472B6',
  accentLight: '#FBCFE8',
  
  // Status colors
  success: '#10B981',
  successLight: '#34D399',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Gradient colors
  gradientStart: '#1A0B2E',
  gradientMiddle: '#130B21',
  gradientEnd: '#0D0B14',
  
  // Border colors
  border: '#2D2640',
  borderLight: '#3D3558',
  
  // Player colors
  playerBackground: '#13111C',
  playerAccent: '#8B5CF6',
  playerProgress: '#EC4899',
  
  // Tab bar
  tabBarActive: '#8B5CF6',
  tabBarInactive: '#6B7280',
  tabBarBackground: '#0D0B14',
  
  // Overlay
  overlay: 'rgba(13, 11, 20, 0.9)',
  overlayLight: 'rgba(13, 11, 20, 0.6)',
  
  // Genre card colors
  genrePop: ['#FF6B6B', '#EE5A5A'],
  genreRock: ['#4ECDC4', '#45B7AA'],
  genreJazz: ['#FFD93D', '#F5CB38'],
  genreClassical: ['#6BCB77', '#5CB868'],
  genreElectronic: ['#4D96FF', '#3D8BFF'],
  genreHipHop: ['#FF8585', '#FF7070'],
  genreCountry: ['#C9B037', '#B8A032'],
  genreWorld: ['#9B59B6', '#8E4DB1'],
};

export const gradients = {
  background: ['#0D0B14', '#13111C', '#0D0B14'],
  backgroundReverse: ['#13111C', '#0D0B14'],
  primary: ['#8B5CF6', '#7C3AED'],
  primaryToAccent: ['#8B5CF6', '#EC4899'],
  accent: ['#EC4899', '#F472B6'],
  card: ['#1A1725', '#13111C'],
  cardElevated: ['#241F30', '#1A1725'],
  player: ['#1A1725', '#13111C'],
  surface: ['rgba(26, 23, 37, 0.8)', 'rgba(19, 17, 28, 0.9)'],
  glass: ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)'],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const typography = {
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    xxxl: 28,
    title: 26,
    hero: 32,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  accentGlow: {
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
};

// Animation durations
export const animations = {
  fast: 150,
  normal: 300,
  slow: 500,
};

export default {
  colors,
  gradients,
  spacing,
  borderRadius,
  typography,
  shadows,
  animations,
};

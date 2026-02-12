// MegaRadio Theme - Dark Purple Gradient Theme
export const colors = {
  // Primary colors
  primary: '#8B5CF6',
  primaryLight: '#A78BFA',
  primaryDark: '#7C3AED',
  
  // Background colors
  background: '#0F0A1E',
  backgroundSecondary: '#1A1333',
  backgroundCard: '#251D3D',
  backgroundCardHover: '#2D2448',
  
  // Surface colors
  surface: '#1E1635',
  surfaceLight: '#2A2145',
  
  // Text colors
  text: '#FFFFFF',
  textSecondary: '#A0A0B0',
  textMuted: '#6B6B80',
  textAccent: '#C4B5FD',
  
  // Accent colors
  accent: '#EC4899',
  accentSecondary: '#F472B6',
  
  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Gradient colors
  gradientStart: '#1A0B2E',
  gradientMiddle: '#16082D',
  gradientEnd: '#0F0A1E',
  
  // Border colors
  border: '#3D3356',
  borderLight: '#4A4266',
  
  // Player colors
  playerBackground: '#1A1333',
  playerAccent: '#8B5CF6',
  playerProgress: '#EC4899',
  
  // Tab bar
  tabBarActive: '#8B5CF6',
  tabBarInactive: '#6B6B80',
  tabBarBackground: '#0F0A1E',
  
  // Overlay
  overlay: 'rgba(15, 10, 30, 0.8)',
  overlayLight: 'rgba(15, 10, 30, 0.5)',
};

export const gradients = {
  background: ['#1A0B2E', '#16082D', '#0F0A1E'],
  primary: ['#8B5CF6', '#7C3AED'],
  accent: ['#EC4899', '#F472B6'],
  card: ['#251D3D', '#1E1635'],
  player: ['#2D2448', '#1A1333'],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 24,
    xxxl: 32,
    title: 28,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

export default {
  colors,
  gradients,
  spacing,
  borderRadius,
  typography,
  shadows,
};

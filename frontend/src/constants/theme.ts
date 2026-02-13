// MegaRadio Theme - Exact Figma Design
export const colors = {
  // Background - Pure black
  background: '#000000',
  backgroundSecondary: '#141417',
  backgroundCard: '#1A1A1D',
  
  // Surface
  surface: '#1A1A1D',
  surfaceLight: '#252528',
  
  // Text
  text: '#FFFFFF',
  textSecondary: '#AEAEB2',
  textMuted: '#6B6B6E',
  
  // Primary/Accent
  primary: '#8B5CF6',
  primaryDark: '#4B30BE',
  accent: '#E53935',
  accentPink: '#FF1493',
  accentPinkButton: '#FF4B8C',
  
  // Auth specific
  inputBackground: '#FFFFFF',
  inputPlaceholder: '#8E8E93',
  inputIcon: '#5C6670',
  errorToast: '#FF6B6B',
  errorBorder: '#FF6B6B',
  
  // Genre colors
  genreOrange: '#FF8C00',
  genreCyan: '#00FFFF',
  genrePurple: '#8A2BE2',
  genreBlue: '#0066FF',
  genrePink: '#FF1493',
  genreGreen: '#00FF7F',
  genreRed: '#FF0000',
  genreYellow: '#FFD700',
  
  // Status
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  
  // Border
  border: '#2A2A2D',
  borderLight: '#3A3A3D',
  
  // Tab bar
  tabBarActive: '#8B5CF6',
  tabBarInactive: '#6B6B6E',
  tabBarBackground: '#000000',
  
  // Button
  buttonGray: '#3A3A3D',
  buttonLight: '#EFEFEF',
};

export const gradients = {
  background: ['#000000', '#000000'],
  premium: ['#4B30BE', '#8B5CF6'],
  jazz: ['#0066FF', '#00BFFF'],
  accent: ['#8B5CF6', '#FF1493'],
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
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const typography = {
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
    title: 22,
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
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
};

export default { colors, gradients, spacing, borderRadius, typography, shadows };

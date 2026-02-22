import { useWindowDimensions, Platform } from 'react-native';

// Breakpoints for different device sizes
export const BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  largeTablet: 1024,
} as const;

// Device type detection
export type DeviceType = 'phone' | 'tablet' | 'largeTablet';

export interface GridMetrics {
  columns: number;
  gap: number;
  itemWidth: number;
  sidePadding: number;
}

export interface ResponsiveMetrics {
  width: number;
  height: number;
  isTablet: boolean;
  isLargeTablet: boolean;
  isPhone: boolean;
  deviceType: DeviceType;
  // Grid calculations
  getGridMetrics: (customSidePadding?: number) => GridMetrics;
  // Scaling helpers
  scale: (phoneValue: number, tabletMultiplier?: number, largeTabletMultiplier?: number) => number;
  // Spacing
  sidePadding: number;
  // Player artwork size
  artworkSize: number;
  // Genre card dimensions
  genreCardWidth: number;
  genreCardHeight: number;
  // Banner dimensions
  bannerWidth: number;
  bannerHeight: number;
  // Typography scaling
  headingScale: number;
}

/**
 * Custom hook for responsive design across iOS devices (iPhone & iPad)
 * Returns device metrics and helper functions for adaptive layouts
 */
export function useResponsive(): ResponsiveMetrics {
  const { width, height } = useWindowDimensions();
  
  // Device type detection
  const isLargeTablet = width >= BREAKPOINTS.largeTablet;
  const isTablet = width >= BREAKPOINTS.tablet;
  const isPhone = width < BREAKPOINTS.tablet;
  
  const deviceType: DeviceType = isLargeTablet ? 'largeTablet' : isTablet ? 'tablet' : 'phone';
  
  // Side padding - increases on larger screens
  const sidePadding = isLargeTablet ? 40 : isTablet ? 32 : 15;
  
  // Player artwork size - scales up on tablets
  const artworkSize = isLargeTablet ? 350 : isTablet ? 280 : 190;
  
  // Genre card dimensions
  const genreCardWidth = isLargeTablet ? 180 : isTablet ? 160 : 130;
  const genreCardHeight = isLargeTablet ? 60 : isTablet ? 52 : 45;
  
  // Banner dimensions for discoverable genres
  const bannerWidth = isLargeTablet ? 480 : isTablet ? 400 : 300;
  const bannerHeight = isLargeTablet ? 200 : isTablet ? 180 : 160;
  
  // Heading scale for larger screens
  const headingScale = isLargeTablet ? 1.3 : isTablet ? 1.2 : 1;
  
  /**
   * Calculate grid metrics based on screen width
   * Returns columns, gap, item width, and padding
   */
  const getGridMetrics = (customSidePadding?: number): GridMetrics => {
    const padding = customSidePadding ?? sidePadding;
    
    let columns: number;
    let gap: number;
    
    if (isLargeTablet) {
      columns = 5;
      gap = 16;
    } else if (isTablet) {
      columns = 4;
      gap = 12;
    } else {
      columns = 3;
      gap = 8;
    }
    
    // Calculate available width for items
    const availableWidth = width - (padding * 2);
    const totalGapWidth = gap * (columns - 1);
    const itemWidth = Math.floor((availableWidth - totalGapWidth) / columns);
    
    return {
      columns,
      gap,
      itemWidth,
      sidePadding: padding,
    };
  };
  
  /**
   * Scale a value based on device type
   * @param phoneValue - Base value for phones
   * @param tabletMultiplier - Multiplier for tablets (default: 1.3)
   * @param largeTabletMultiplier - Multiplier for large tablets (default: 1.5)
   */
  const scale = (
    phoneValue: number, 
    tabletMultiplier: number = 1.3, 
    largeTabletMultiplier: number = 1.5
  ): number => {
    if (isLargeTablet) return Math.round(phoneValue * largeTabletMultiplier);
    if (isTablet) return Math.round(phoneValue * tabletMultiplier);
    return phoneValue;
  };
  
  return {
    width,
    height,
    isTablet,
    isLargeTablet,
    isPhone,
    deviceType,
    getGridMetrics,
    scale,
    sidePadding,
    artworkSize,
    genreCardWidth,
    genreCardHeight,
    bannerWidth,
    bannerHeight,
    headingScale,
  };
}

export default useResponsive;

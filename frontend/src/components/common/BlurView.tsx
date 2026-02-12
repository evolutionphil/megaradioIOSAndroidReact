import React from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';
import { BlurView as ExpoBlurView } from 'expo-blur';

interface BlurViewProps {
  style?: ViewStyle;
  intensity?: number;
  tint?: 'dark' | 'light' | 'default' | 'systemMaterial' | 'systemThinMaterial' | 'systemUltraThinMaterial';
  children?: React.ReactNode;
  blurColor?: string;
  blurAmount?: number;
}

export const BlurView: React.FC<BlurViewProps> = ({
  style,
  intensity = 50,
  tint = 'dark',
  children,
  blurColor = 'rgba(51, 0, 255, 0.3)',
  blurAmount = 20,
}) => {
  // For web, use CSS backdrop-filter blur (more performant)
  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.container,
          style,
          {
            backgroundColor: blurColor,
            // @ts-ignore - Web-specific CSS property
            backdropFilter: `blur(${blurAmount}px)`,
            WebkitBackdropFilter: `blur(${blurAmount}px)`,
          },
        ]}
      >
        {children}
      </View>
    );
  }

  // For native iOS/Android, use expo-blur with proper settings
  // expo-blur works best with lower intensity values (20-80)
  // and systemMaterial tints for better native appearance
  return (
    <ExpoBlurView
      style={[styles.container, style]}
      intensity={Math.min(intensity, 100)}
      tint={tint}
      experimentalBlurMethod="dimezisBlurView"
    >
      {children}
    </ExpoBlurView>
  );
};

// Alternative glow effect component for native
export const GlowView: React.FC<{
  style?: ViewStyle;
  glowColor?: string;
  glowRadius?: number;
  children?: React.ReactNode;
}> = ({
  style,
  glowColor = '#3300FF',
  glowRadius = 100,
  children,
}) => {
  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.container,
          style,
          {
            // @ts-ignore - Web-specific CSS
            boxShadow: `0 0 ${glowRadius}px ${glowRadius / 2}px ${glowColor}`,
          },
        ]}
      >
        {children}
      </View>
    );
  }

  // For native, use shadow properties
  // Note: Android doesn't support colored shadows well
  // Consider using a gradient overlay for Android
  return (
    <View
      style={[
        styles.container,
        style,
        Platform.select({
          ios: {
            shadowColor: glowColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: glowRadius,
          },
          android: {
            elevation: 20,
            // Android elevation doesn't support colors
            // Use a semi-transparent background overlay instead
            backgroundColor: `${glowColor}20`,
          },
        }),
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

export default BlurView;

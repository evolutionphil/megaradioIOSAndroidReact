import React from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';
import { BlurView as ExpoBlurView } from 'expo-blur';

interface BlurViewProps {
  style?: ViewStyle;
  intensity?: number;
  tint?: 'dark' | 'light' | 'default';
  children?: React.ReactNode;
  blurColor?: string;
  blurAmount?: number;
}

export const BlurView: React.FC<BlurViewProps> = ({
  style,
  intensity = 100,
  tint = 'dark',
  children,
  blurColor = '#3300FF4D',
  blurAmount = 205,
}) => {
  // For web, use CSS filter blur
  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.container,
          style,
          {
            backgroundColor: blurColor,
            // @ts-ignore - Web-specific CSS property
            filter: `blur(${blurAmount}px)`,
          },
        ]}
      >
        {children}
      </View>
    );
  }

  // For native iOS/Android, use expo-blur
  return (
    <ExpoBlurView
      style={[styles.container, style]}
      intensity={intensity}
      tint={tint}
    >
      {children}
    </ExpoBlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

export default BlurView;

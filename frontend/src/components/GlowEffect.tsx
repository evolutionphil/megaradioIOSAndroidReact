import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

interface GlowProps {
  size?: number;
  top?: number;
  left?: number;
  color?: string;
  opacity?: number;
}

export const GlowEffect: React.FC<GlowProps> = ({
  size = 430,
  top = -130,
  left = -160,
  color = '120, 60, 255',
  opacity = 0.35,
}) => {
  return (
    <View style={[styles.container, { width: size, height: size, top, left }]} pointerEvents="none">
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={`rgb(${color})`} stopOpacity={opacity} />
            <Stop offset="40%" stopColor={`rgb(${color})`} stopOpacity={opacity * 0.6} />
            <Stop offset="70%" stopColor={`rgb(${color})`} stopOpacity={opacity * 0.25} />
            <Stop offset="100%" stopColor={`rgb(${color})`} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={size} height={size} fill="url(#glow)" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 0,
  },
});

export default GlowEffect;

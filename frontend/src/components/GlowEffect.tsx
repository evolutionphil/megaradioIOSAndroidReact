import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';

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
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size, top, left }]} pointerEvents="none">
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient 
            id="softGlow" 
            cx="50%" 
            cy="50%" 
            rx="50%" 
            ry="50%"
            gradientUnits="userSpaceOnUse"
          >
            {/* Center - most intense */}
            <Stop offset="0%" stopColor={`rgb(${color})`} stopOpacity={opacity} />
            {/* Gradual fade with multiple stops for smooth blur effect */}
            <Stop offset="15%" stopColor={`rgb(${color})`} stopOpacity={opacity * 0.85} />
            <Stop offset="30%" stopColor={`rgb(${color})`} stopOpacity={opacity * 0.65} />
            <Stop offset="45%" stopColor={`rgb(${color})`} stopOpacity={opacity * 0.45} />
            <Stop offset="60%" stopColor={`rgb(${color})`} stopOpacity={opacity * 0.28} />
            <Stop offset="75%" stopColor={`rgb(${color})`} stopOpacity={opacity * 0.12} />
            <Stop offset="90%" stopColor={`rgb(${color})`} stopOpacity={opacity * 0.04} />
            {/* Edge - fully transparent for soft blur */}
            <Stop offset="100%" stopColor={`rgb(${color})`} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={centerX} cy={centerY} r={radius} fill="url(#softGlow)" />
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

import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Ellipse, Rect, G } from 'react-native-svg';

interface IconProps {
  color: string;
  size?: number;
  focused?: boolean;
}

// Discover - Radio icon with antenna
export const DiscoverIcon: React.FC<IconProps> = ({ color, size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 28 32" fill="none">
    {/* Antenna */}
    <Path
      d="M14 2V8"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {/* Radio body */}
    <Rect
      x="4"
      y="10"
      width="20"
      height="18"
      rx="4"
      fill={color}
    />
    {/* Speaker holes */}
    <Circle cx="10" cy="18" r="1.5" fill="#1B1C1E" />
    <Circle cx="14" cy="18" r="1.5" fill="#1B1C1E" />
    <Circle cx="18" cy="18" r="1.5" fill="#1B1C1E" />
    <Circle cx="10" cy="23" r="1.5" fill="#1B1C1E" />
    <Circle cx="14" cy="23" r="1.5" fill="#1B1C1E" />
    <Circle cx="18" cy="23" r="1.5" fill="#1B1C1E" />
  </Svg>
);

// Favorites - Heart icon (filled/outline based on focus)
export const FavoritesIcon: React.FC<IconProps> = ({ color, size = 28, focused }) => (
  <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
    <Path
      d="M14 25C14 25 3 18 3 10.5C3 6.35786 6.35786 3 10.5 3C12.5 3 14 4 14 4C14 4 15.5 3 17.5 3C21.6421 3 25 6.35786 25 10.5C25 18 14 25 14 25Z"
      fill={color}
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Profile - Person icon with head and body
export const ProfileIcon: React.FC<IconProps> = ({ color, size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
    {/* Head */}
    <Ellipse
      cx="14"
      cy="8"
      rx="4"
      ry="5"
      fill={color}
    />
    {/* Body */}
    <Ellipse
      cx="14"
      cy="24"
      rx="3"
      ry="4"
      fill={color}
    />
  </Svg>
);

// Records - Vinyl disc icon
export const RecordsIcon: React.FC<IconProps> = ({ color, size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
    {/* Outer circle - outline */}
    <Circle
      cx="14"
      cy="14"
      r="12"
      stroke={color}
      strokeWidth="2.5"
      fill="none"
    />
    {/* Inner circle - filled */}
    <Circle
      cx="14"
      cy="14"
      r="7"
      stroke={color}
      strokeWidth="2.5"
      fill="none"
    />
    {/* Center dot */}
    <Circle
      cx="14"
      cy="14"
      r="2"
      fill={color}
    />
  </Svg>
);

// Chevron Up icon for mini player
export const ChevronUpIcon: React.FC<IconProps> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle
      cx="12"
      cy="12"
      r="11"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
    />
    <Path
      d="M8 14L12 10L16 14"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Play icon
export const PlayIcon: React.FC<IconProps> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M8 5V19L19 12L8 5Z"
      fill={color}
    />
  </Svg>
);

// Pause icon
export const PauseIcon: React.FC<IconProps> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="6" y="4" width="4" height="16" fill={color} rx="1" />
    <Rect x="14" y="4" width="4" height="16" fill={color} rx="1" />
  </Svg>
);

// Heart outline for mini player
export const HeartOutlineIcon: React.FC<IconProps> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 21C12 21 3 15 3 9C3 5.68629 5.68629 3 9 3C10.5 3 12 4 12 4C12 4 13.5 3 15 3C18.3137 3 21 5.68629 21 9C21 15 12 21 12 21Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Ellipse, Rect, G, Line } from 'react-native-svg';

interface IconProps {
  color: string;
  size?: number;
  focused?: boolean;
}

// Discover - Radio icon with antenna (matching Figma design)
export const DiscoverIcon: React.FC<IconProps> = ({ color, size = 24 }) => (
  <Svg width={size} height={size + 4} viewBox="0 0 24 28" fill="none">
    {/* Antenna */}
    <Line
      x1="12"
      y1="2"
      x2="12"
      y2="7"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    {/* Radio body */}
    <Rect
      x="4"
      y="9"
      width="16"
      height="15"
      rx="3"
      fill={color}
    />
    {/* Speaker holes - 2 rows of 3 */}
    <Circle cx="8" cy="15" r="1.2" fill="#1B1C1E" />
    <Circle cx="12" cy="15" r="1.2" fill="#1B1C1E" />
    <Circle cx="16" cy="15" r="1.2" fill="#1B1C1E" />
    <Circle cx="8" cy="20" r="1.2" fill="#1B1C1E" />
    <Circle cx="12" cy="20" r="1.2" fill="#1B1C1E" />
    <Circle cx="16" cy="20" r="1.2" fill="#1B1C1E" />
  </Svg>
);

// Favorites - Heart icon (filled)
export const FavoritesIcon: React.FC<IconProps> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      fill={color}
    />
  </Svg>
);

// Profile - Person silhouette icon
export const ProfileIcon: React.FC<IconProps> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Head - oval */}
    <Ellipse
      cx="12"
      cy="7"
      rx="3.5"
      ry="4"
      fill={color}
    />
    {/* Body - bottom oval */}
    <Ellipse
      cx="12"
      cy="20"
      rx="2.5"
      ry="3.5"
      fill={color}
    />
  </Svg>
);

// Records - Vinyl disc icon with concentric circles
export const RecordsIcon: React.FC<IconProps> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Outer circle */}
    <Circle
      cx="12"
      cy="12"
      r="10"
      stroke={color}
      strokeWidth="2"
      fill="none"
    />
    {/* Middle circle */}
    <Circle
      cx="12"
      cy="12"
      r="6"
      stroke={color}
      strokeWidth="2"
      fill="none"
    />
    {/* Center dot */}
    <Circle
      cx="12"
      cy="12"
      r="2"
      fill={color}
    />
  </Svg>
);

// Chevron Up icon for mini player - circle with up arrow
export const ChevronUpIcon: React.FC<IconProps> = ({ color, size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
    <Circle
      cx="14"
      cy="14"
      r="13"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
    />
    <Path
      d="M9 16L14 11L19 16"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Play icon - triangle
export const PlayIcon: React.FC<IconProps> = ({ color, size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path
      d="M6 4L16 10L6 16V4Z"
      fill={color}
    />
  </Svg>
);

// Pause icon - two vertical bars
export const PauseIcon: React.FC<IconProps> = ({ color, size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Rect x="4" y="3" width="4" height="14" rx="1" fill={color} />
    <Rect x="12" y="3" width="4" height="14" rx="1" fill={color} />
  </Svg>
);

// Heart outline for mini player
export const HeartOutlineIcon: React.FC<IconProps> = ({ color, size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path
      d="M10 17.5l-1.05-.95C4.85 12.95 2 10.35 2 7.25 2 4.67 4.01 2.5 6.5 2.5c1.4 0 2.75.65 3.5 1.7.75-1.05 2.1-1.7 3.5-1.7C16.01 2.5 18 4.67 18 7.25c0 3.1-2.85 5.7-6.95 9.3L10 17.5z"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
    />
  </Svg>
);

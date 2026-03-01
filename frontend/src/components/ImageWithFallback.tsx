import React, { useState } from 'react';
import { Image, ImageProps, ImageSourcePropType, StyleSheet, View } from 'react-native';

// Default station logo - LOCAL asset for fallback (no network required)
const DEFAULT_STATION_LOGO_SOURCE = require('../../assets/images/default-station-logo.png');

interface ImageWithFallbackProps extends Omit<ImageProps, 'source'> {
  uri?: string | null;
  fallbackUri?: string;
  fallbackSource?: ImageSourcePropType;
}

/**
 * Image component with automatic fallback to default logo on error
 * Use this for station logos, user avatars, and any image that might fail to load
 */
export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  uri,
  fallbackUri,
  fallbackSource = DEFAULT_STATION_LOGO_SOURCE,
  style,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);

  // If no URI provided, use fallback immediately
  if (!uri || uri.trim() === '') {
    return <Image source={fallbackSource} style={style} {...props} />;
  }

  // If error occurred, show fallback
  if (hasError) {
    return <Image source={fallbackSource} style={style} {...props} />;
  }

  // Try to load the original image
  return (
    <Image
      source={{ uri }}
      style={style}
      onError={() => setHasError(true)}
      {...props}
    />
  );
};

export default ImageWithFallback;

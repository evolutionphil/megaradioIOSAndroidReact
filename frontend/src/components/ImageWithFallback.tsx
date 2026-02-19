import React, { useState } from 'react';
import { Image, ImageProps, ImageSourcePropType, StyleSheet, View } from 'react-native';

// Default station logo - our MegaRadio icon
const DEFAULT_STATION_LOGO = 'https://themegaradio.com/images/default-station.png';

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
  fallbackUri = DEFAULT_STATION_LOGO,
  fallbackSource,
  style,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);

  // If no URI provided, use fallback immediately
  if (!uri || uri.trim() === '') {
    if (fallbackSource) {
      return <Image source={fallbackSource} style={style} {...props} />;
    }
    return <Image source={{ uri: fallbackUri }} style={style} {...props} />;
  }

  // If error occurred, show fallback
  if (hasError) {
    if (fallbackSource) {
      return <Image source={fallbackSource} style={style} {...props} />;
    }
    return <Image source={{ uri: fallbackUri }} style={style} {...props} />;
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

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
  // 0 = primary uri, 1 = fallbackUri (remote), 2 = local fallbackSource
  const [stage, setStage] = useState<0 | 1 | 2>(0);

  // Reset the chain whenever the sources change (e.g., list re-uses the row).
  React.useEffect(() => {
    setStage(0);
  }, [uri, fallbackUri]);

  const hasPrimary = !!(uri && uri.trim() !== '');
  const hasFallbackUri = !!(fallbackUri && fallbackUri.trim() !== '');

  // Stage 0: primary
  if (stage === 0 && hasPrimary) {
    return (
      <Image
        source={{ uri }}
        style={style}
        onError={() => setStage(hasFallbackUri ? 1 : 2)}
        {...props}
      />
    );
  }

  // Stage 1 (or no primary but has fallbackUri): remote fallback URL
  if (stage <= 1 && hasFallbackUri) {
    return (
      <Image
        source={{ uri: fallbackUri }}
        style={style}
        onError={() => setStage(2)}
        {...props}
      />
    );
  }

  // Final: local fallback asset (never fails)
  return <Image source={fallbackSource} style={style} {...props} />;
};

export default ImageWithFallback;

import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface AvatarWithFallbackProps {
  uri: string | null | undefined;
  size: number;
  style?: ViewStyle;
}

export const AvatarWithFallback: React.FC<AvatarWithFallbackProps> = ({ 
  uri, 
  size,
  style 
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  // Reset error state when URI changes
  useEffect(() => {
    setImageError(false);
    setImageLoading(true);
  }, [uri]);
  
  // Check if we have a valid URL
  const hasValidUri = uri && typeof uri === 'string' && uri.trim().length > 0;
  
  // Build full URL if relative
  let fullUri: string | null = null;
  if (hasValidUri) {
    fullUri = uri.startsWith('http') ? uri : `https://themegaradio.com${uri}`;
  }
  
  // Show fallback if no valid URI or image failed to load
  const showFallback = !hasValidUri || imageError;
  
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    overflow: 'hidden' as const,
  };
  
  // Render gradient fallback
  const renderFallback = () => (
    <LinearGradient
      colors={['#FF4199', '#FF8C42']}
      style={[containerStyle, style]}
    >
      <View style={styles.fallbackContent}>
        <Ionicons name="person" size={size * 0.5} color="#FFF" />
      </View>
    </LinearGradient>
  );
  
  if (showFallback) {
    return renderFallback();
  }
  
  return (
    <View style={[containerStyle, style]}>
      <Image
        source={{ uri: fullUri! }}
        style={{ width: size, height: size }}
        onError={() => {
          console.log('[AvatarWithFallback] Image failed to load:', fullUri);
          setImageError(true);
          setImageLoading(false);
        }}
        onLoad={() => {
          console.log('[AvatarWithFallback] Image loaded successfully');
          setImageLoading(false);
        }}
      />
      {/* Show fallback overlay while loading or on error */}
      {imageLoading && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#333' }]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fallbackContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AvatarWithFallback;

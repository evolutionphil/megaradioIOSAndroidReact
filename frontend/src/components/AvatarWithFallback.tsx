import React, { useState } from 'react';
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
  
  if (showFallback) {
    return (
      <LinearGradient
        colors={['#FF4199', '#FF8C42']}
        style={[containerStyle, style]}
      >
        <View style={styles.fallbackContent}>
          <Ionicons name="person" size={size * 0.5} color="#FFF" />
        </View>
      </LinearGradient>
    );
  }
  
  return (
    <View style={[containerStyle, style]}>
      <Image
        source={{ uri: fullUri! }}
        style={{ width: size, height: size }}
        onError={() => {
          console.log('[AvatarWithFallback] Image failed to load:', fullUri);
          setImageError(true);
        }}
        onLoad={() => {
          console.log('[AvatarWithFallback] Image loaded successfully');
        }}
      />
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

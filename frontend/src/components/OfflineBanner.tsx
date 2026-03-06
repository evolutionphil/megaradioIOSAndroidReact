// OfflineBanner - Shows when app is offline and using cached data
// Displays a subtle banner at the top of the screen

import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface OfflineBannerProps {
  // Optional: show even when online (for testing)
  forceShow?: boolean;
  // Optional: custom message
  message?: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ 
  forceShow = false,
  message,
}) => {
  const { t } = useTranslation();
  const { isOffline } = useNetworkStatus();
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const shouldShow = forceShow || isOffline;

  useEffect(() => {
    if (shouldShow) {
      // Slide in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [shouldShow, slideAnim, opacityAnim]);

  // Don't render on web
  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents={shouldShow ? 'auto' : 'none'}
    >
      <View style={styles.content}>
        <Ionicons name="cloud-offline-outline" size={16} color="#FFF" />
        <Text style={styles.text}>
          {message || t('offline_mode', 'Offline - Showing cached data')}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#FF6B35', // Orange color for offline
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Ubuntu-Medium',
  },
});

export default OfflineBanner;

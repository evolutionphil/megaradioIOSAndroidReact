// UniversalCastButton - YouTube-style unified Cast button
// Shows both AirPlay (iOS) and Chromecast devices in one picker
// Tap: Opens native device picker (AirPlay on iOS, Chromecast on Android)

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { 
  View, 
  TouchableOpacity, 
  StyleSheet, 
  Platform, 
  Alert,
  Animated,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Conditionally import AirPlay (iOS only)
let AirPlayButton: any = null;
let showRoutePicker: any = null;
let useAirplayConnectivity: any = null;
let useExternalPlaybackAvailability: any = null;

try {
  const airplay = require('react-airplay');
  AirPlayButton = airplay.AirPlayButton;
  showRoutePicker = airplay.showRoutePicker;
  useAirplayConnectivity = airplay.useAirplayConnectivity;
  useExternalPlaybackAvailability = airplay.useExternalPlaybackAvailability;
  console.log('[UniversalCast] AirPlay loaded successfully');
} catch (e) {
  console.log('[UniversalCast] AirPlay not available:', e);
}

// Conditionally import Google Cast
let GoogleCast: any = null;
let CastButton: any = null;
let useCastState: any = null;
let useRemoteMediaClient: any = null;
let useDevices: any = null;

try {
  const googleCast = require('react-native-google-cast');
  GoogleCast = googleCast.default || googleCast;
  CastButton = googleCast.CastButton;
  useCastState = googleCast.useCastState;
  useRemoteMediaClient = googleCast.useRemoteMediaClient;
  useDevices = googleCast.useDevices;
  console.log('[UniversalCast] Google Cast loaded successfully');
} catch (e) {
  console.log('[UniversalCast] Google Cast not available:', e);
}

interface UniversalCastButtonProps {
  size?: number;
  color?: string;
  activeColor?: string;
  station?: {
    _id?: string;
    name: string;
    url?: string;
    url_resolved?: string;
    urlResolved?: string;
    favicon?: string;
    logo?: string;
    country?: string;
  } | null;
  streamUrl?: string | null;
  nowPlaying?: { title?: string; artist?: string } | null;
  onStopLocalAudio?: () => void;
}

export const UniversalCastButton: React.FC<UniversalCastButtonProps> = ({
  size = 24,
  color = '#FFFFFF',
  activeColor = '#4CAF50',
  station,
  streamUrl,
  nowPlaying,
  onStopLocalAudio,
}) => {
  // Animation for pulsing when casting
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Chromecast state
  const castState = useCastState?.();
  const remoteMediaClient = useRemoteMediaClient?.();
  const chromecastDevices = useDevices?.();
  
  // AirPlay state (iOS only)
  const isAirplayConnected = useAirplayConnectivity?.() || false;
  const isExternalPlaybackAvailable = useExternalPlaybackAvailability?.() || false;
  
  // Combined state
  const isCasting = castState === 'CONNECTED' || isAirplayConnected;
  const hasDevices = (chromecastDevices?.length > 0) || isExternalPlaybackAvailable;

  // Pulse animation when casting
  useEffect(() => {
    if (isCasting) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isCasting]);

  // Log state changes
  useEffect(() => {
    console.log('[UniversalCast] State:', {
      castState,
      isAirplayConnected,
      isExternalPlaybackAvailable,
      chromecastDevices: chromecastDevices?.length || 0,
    });
  }, [castState, isAirplayConnected, isExternalPlaybackAvailable, chromecastDevices]);

  // Get station logo URL
  const getStationLogoUrl = (station: any): string => {
    if (!station) return 'https://themegaradio.com/logo.png';
    const logo = station.favicon || station.logo;
    if (!logo) return 'https://themegaradio.com/logo.png';
    if (logo.startsWith('http')) return logo;
    return `https://themegaradio.com${logo.startsWith('/') ? '' : '/'}${logo}`;
  };

  // Cast to Chromecast
  const castToChromecast = useCallback(async () => {
    if (!remoteMediaClient || !station) {
      console.log('[UniversalCast] Cannot cast - missing client or station');
      return;
    }

    const url = streamUrl || station.url_resolved || station.urlResolved || station.url;
    if (!url) {
      console.log('[UniversalCast] Cannot cast - no stream URL');
      return;
    }

    try {
      console.log('[UniversalCast] Casting to Chromecast...');
      
      // Stop local audio
      if (onStopLocalAudio) {
        onStopLocalAudio();
      }

      // Determine content type
      let contentType = 'audio/mp3';
      const urlLower = url.toLowerCase();
      if (urlLower.includes('.m3u8') || urlLower.includes('hls')) {
        contentType = 'application/x-mpegURL';
      } else if (urlLower.includes('.aac')) {
        contentType = 'audio/aac';
      }

      await remoteMediaClient.loadMedia({
        mediaInfo: {
          contentUrl: url,
          contentType,
          streamType: 'LIVE',
          metadata: {
            type: 'musicTrack',
            title: nowPlaying?.title || station.name,
            subtitle: nowPlaying?.artist || station.country || 'MegaRadio',
            images: [{ url: getStationLogoUrl(station) }],
          },
        },
        autoplay: true,
      });

      console.log('[UniversalCast] ✅ Chromecast started:', station.name);
    } catch (err) {
      console.error('[UniversalCast] ❌ Chromecast error:', err);
    }
  }, [remoteMediaClient, station, streamUrl, nowPlaying, onStopLocalAudio]);

  // Auto-cast to Chromecast when connected
  useEffect(() => {
    if (castState === 'CONNECTED' && station && streamUrl && remoteMediaClient) {
      castToChromecast();
    }
  }, [castState]);

  // Handle button press
  const handlePress = useCallback(() => {
    console.log('[UniversalCast] Button pressed');
    
    if (Platform.OS === 'ios') {
      // iOS: Show AirPlay picker (includes AirPlay + local speakers)
      if (showRoutePicker) {
        console.log('[UniversalCast] Showing AirPlay picker');
        showRoutePicker();
      } else {
        // Fallback: Show Chromecast dialog
        if (GoogleCast) {
          GoogleCast.showCastDialog?.();
        } else {
          Alert.alert(
            'Cast',
            'AirPlay: Kontrol Merkezi\'nden ses çıkışını değiştirin.\n\nChromecast: Native build gerekli.',
            [{ text: 'Tamam' }]
          );
        }
      }
    } else {
      // Android: Show Chromecast dialog
      if (GoogleCast) {
        GoogleCast.showCastDialog?.();
      } else {
        Alert.alert('Cast', 'Cast özelliği için native build gereklidir.');
      }
    }
  }, []);

  // Determine icon and color
  const getIconName = () => {
    if (isCasting) return 'tv';
    if (Platform.OS === 'ios' && isExternalPlaybackAvailable) return 'tv-outline';
    return 'tv-outline';
  };

  const getIconColor = () => {
    if (isCasting) return activeColor;
    if (hasDevices) return color;
    return color;
  };

  // For iOS with AirPlay available, use native AirPlayButton for best UX
  if (Platform.OS === 'ios' && AirPlayButton) {
    return (
      <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.buttonWrapper}>
          {/* Invisible AirPlayButton overlay for native functionality */}
          <AirPlayButton
            style={styles.airplayButton}
            prioritizesVideoDevices={false}
            tintColor="transparent"
            activeTintColor="transparent"
          />
          {/* Visible custom icon */}
          <View style={styles.iconOverlay} pointerEvents="none">
            <Ionicons 
              name={getIconName()} 
              size={size} 
              color={getIconColor()} 
            />
            {isCasting && (
              <View style={[styles.castingDot, { backgroundColor: activeColor }]} />
            )}
          </View>
        </View>
      </Animated.View>
    );
  }

  // For Android or fallback, use custom button with Chromecast
  if (CastButton && Platform.OS === 'android') {
    return (
      <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
        <CastButton 
          style={[styles.castButton, { tintColor: getIconColor() }]} 
        />
      </Animated.View>
    );
  }

  // Fallback button (no native SDK available)
  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
      <TouchableOpacity
        style={styles.fallbackButton}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={getIconName()} 
          size={size} 
          color={getIconColor()}
        />
        {isCasting && (
          <View style={[styles.castingDot, { backgroundColor: activeColor }]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonWrapper: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  airplayButton: {
    width: 44,
    height: 44,
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 2,
    opacity: 0.01, // Nearly invisible but still tappable
  },
  iconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  castButton: {
    width: 28,
    height: 28,
  },
  fallbackButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  castingDot: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default UniversalCastButton;

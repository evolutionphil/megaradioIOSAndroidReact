// NativeCastButton - Universal Cast button for Chromecast + AirPlay
// Shows native Google Cast button when available, AirPlay route picker on iOS
// When tapped on Chromecast, opens native device picker automatically

import React, { useEffect, useCallback, useState } from 'react';
import { 
  View, 
  TouchableOpacity, 
  StyleSheet, 
  Platform, 
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getStationLogoUrl } from '../utils/stationLogoHelper';

// Google Cast - dynamically loaded
let GoogleCast: any = null;
let CastButton: any = null;
let useCastState: any = null;
let useRemoteMediaClient: any = null;
let isChromecastAvailable = false;

try {
  const mod = require('react-native-google-cast');
  GoogleCast = mod.default || mod.GoogleCast;
  CastButton = mod.CastButton;
  useCastState = mod.useCastState;
  useRemoteMediaClient = mod.useRemoteMediaClient;
  isChromecastAvailable = true;
} catch (e) {
  // Expected on web
}

// AirPlay - dynamically loaded (iOS only)
let AirplayButton: any = null;
let showRoutePicker: any = null;
let isAirplayAvailable = false;

try {
  const airplayMod = require('react-airplay');
  AirplayButton = airplayMod.AirplayButton;
  showRoutePicker = airplayMod.showRoutePicker;
  isAirplayAvailable = true;
} catch (e) {
  // Expected on non-iOS
}

interface NativeCastButtonProps {
  size?: number;
  color?: string;
  activeColor?: string;
  station?: any;
  streamUrl?: string | null;
  nowPlaying?: { title?: string; artist?: string } | null;
  onStopLocalAudio?: () => void;
}

export const NativeCastButton: React.FC<NativeCastButtonProps> = ({
  size = 22,
  color = '#FFFFFF',
  activeColor = '#4CAF50',
  station,
  streamUrl,
  nowPlaying,
  onStopLocalAudio,
}) => {
  // Chromecast hooks (conditionally called)
  const castState = useCastState?.();
  const remoteMediaClient = useRemoteMediaClient?.();

  // Auto-cast when device connects
  useEffect(() => {
    if (castState === 'connected' && station && streamUrl && remoteMediaClient) {
      castToChromecast();
    }
  }, [castState, station, streamUrl, remoteMediaClient]);

  const castToChromecast = useCallback(async () => {
    if (!remoteMediaClient || !station) return;

    const url = streamUrl || station.url_resolved || station.urlResolved || station.url;
    if (!url) return;

    try {
      onStopLocalAudio?.();

      let contentType = 'audio/mp3';
      const urlLower = url.toLowerCase();
      if (urlLower.includes('.m3u8') || urlLower.includes('hls')) {
        contentType = 'application/x-mpegURL';
      } else if (urlLower.includes('.aac')) {
        contentType = 'audio/aac';
      } else if (urlLower.includes('.ogg')) {
        contentType = 'audio/ogg';
      }

      const logoUrl = getStationLogoUrl(station) || 'https://themegaradio.com/logo.png';

      await remoteMediaClient.loadMedia({
        mediaInfo: {
          contentUrl: url,
          contentType,
          streamType: 'live',
          metadata: {
            type: 'musicTrack',
            title: nowPlaying?.title || station.name,
            subtitle: nowPlaying?.artist || station.country || 'MegaRadio',
            images: [{ url: logoUrl }],
          },
        },
        autoplay: true,
      });

      console.log('[NativeCastButton] Cast started:', station.name);
    } catch (err) {
      console.error('[NativeCastButton] Cast error:', err);
    }
  }, [remoteMediaClient, station, streamUrl, nowPlaying, onStopLocalAudio]);

  const isConnected = castState === 'connected';
  const isConnecting = castState === 'connecting';

  // Priority 1: Show native CastButton if Google Cast is available
  if (isChromecastAvailable && CastButton && Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <CastButton 
          style={[
            styles.castButton, 
            { tintColor: isConnected ? activeColor : isConnecting ? '#FFA000' : color }
          ]} 
        />
      </View>
    );
  }

  // Priority 2: Show AirPlay button on iOS
  if (Platform.OS === 'ios' && isAirplayAvailable && AirplayButton) {
    return (
      <TouchableOpacity
        style={styles.container}
        onPress={() => showRoutePicker?.({ prioritizesVideoDevices: false })}
      >
        <AirplayButton
          tintColor={color}
          activeTintColor={activeColor}
          style={{ width: size, height: size }}
        />
      </TouchableOpacity>
    );
  }

  // Fallback: TV icon (opens CastModal via parent)
  return (
    <TouchableOpacity
      style={styles.fallbackButton}
      onPress={() => {
        if (Platform.OS === 'ios' && showRoutePicker) {
          showRoutePicker({ prioritizesVideoDevices: false });
        } else if (GoogleCast) {
          GoogleCast.showCastDialog?.();
        }
      }}
    >
      <Ionicons 
        name="tv-outline" 
        size={size} 
        color={color} 
        style={{ opacity: 0.7 }} 
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  castButton: {
    width: 24,
    height: 24,
  },
  fallbackButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NativeCastButton;

// NativeCastButton - Direct Cast button that opens system device picker
// No modal needed - directly shows available Cast devices

import React, { useEffect, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Conditionally import Google Cast
let GoogleCast: any = null;
let CastButton: any = null;
let useCastState: any = null;
let useRemoteMediaClient: any = null;
let useCastSession: any = null;

try {
  const googleCast = require('react-native-google-cast');
  GoogleCast = googleCast.default || googleCast;
  CastButton = googleCast.CastButton;
  useCastState = googleCast.useCastState;
  useRemoteMediaClient = googleCast.useRemoteMediaClient;
  useCastSession = googleCast.useCastSession;
} catch (e) {
  console.log('[NativeCastButton] Google Cast not available');
}

interface NativeCastButtonProps {
  size?: number;
  color?: string;
  station?: {
    _id?: string;
    stationuuid?: string;
    name: string;
    url?: string;
    url_resolved?: string;
    favicon?: string;
    country?: string;
  } | null;
  streamUrl?: string | null;
  nowPlaying?: { title?: string; artist?: string } | null;
  onStopLocalAudio?: () => void;
}

export const NativeCastButton: React.FC<NativeCastButtonProps> = ({
  size = 22,
  color = '#FFFFFF',
  station,
  streamUrl,
  nowPlaying,
  onStopLocalAudio,
}) => {
  const castState = useCastState?.() || 'NO_DEVICES_AVAILABLE';
  const remoteMediaClient = useRemoteMediaClient?.();
  const castSession = useCastSession?.();

  // When connected, automatically start casting
  useEffect(() => {
    if (castState === 'CONNECTED' && station && streamUrl && remoteMediaClient) {
      console.log('[NativeCastButton] Connected! Auto-casting...');
      castToDevice();
    }
  }, [castState, station, streamUrl]);

  const castToDevice = useCallback(async () => {
    if (!remoteMediaClient || !station || !streamUrl) {
      return;
    }

    try {
      // Stop local audio
      if (onStopLocalAudio) {
        onStopLocalAudio();
      }

      // Determine content type
      const url = streamUrl.toLowerCase();
      let contentType = 'audio/mp3';
      if (url.includes('.m3u8') || url.includes('hls')) {
        contentType = 'application/x-mpegURL';
      } else if (url.includes('.aac')) {
        contentType = 'audio/aac';
      }

      const mediaInfo = {
        contentUrl: streamUrl,
        contentType,
        streamType: 'LIVE',
        metadata: {
          type: 'generic',
          title: nowPlaying?.title || station.name,
          subtitle: nowPlaying?.artist || station.country || 'MegaRadio',
          images: station.favicon ? [{
            url: station.favicon.startsWith('http') ? station.favicon : `https://themegaradio.com${station.favicon}`
          }] : [],
        },
      };

      await remoteMediaClient.loadMedia({
        mediaInfo,
        autoplay: true,
        playPosition: 0,
      });

      console.log('[NativeCastButton] Casting started:', station.name);
    } catch (err) {
      console.error('[NativeCastButton] Cast error:', err);
    }
  }, [remoteMediaClient, station, streamUrl, nowPlaying, onStopLocalAudio]);

  // Show native CastButton if available (this opens system picker automatically)
  if (CastButton && Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <CastButton style={[styles.castButton, { tintColor: color }]} />
      </View>
    );
  }

  // Fallback for web or Expo Go - show disabled icon
  return (
    <TouchableOpacity
      style={styles.fallbackButton}
      onPress={() => {
        Alert.alert(
          'Cast Kullanılamıyor',
          'Cast özelliği için native build gereklidir. EAS build oluşturun.',
          [{ text: 'Tamam' }]
        );
      }}
    >
      <Ionicons name="tv-outline" size={size} color={color} style={{ opacity: 0.5 }} />
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
  },
});

export default NativeCastButton;

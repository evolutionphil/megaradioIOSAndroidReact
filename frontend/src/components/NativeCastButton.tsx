// NativeCastButton - Universal Cast button for Chromecast + AirPlay
// Shows native device picker when tapped
// Chromecast: react-native-google-cast (DISABLED - causes crash on RN 0.81+)
// AirPlay: iOS native AVRoutePickerView (when no Chromecast available)

import React, { useEffect, useCallback, useState } from 'react';
import { 
  View, 
  TouchableOpacity, 
  StyleSheet, 
  Platform, 
  Alert,
  ActionSheetIOS,
  findNodeHandle,
  requireNativeComponent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// DISABLED: react-native-google-cast causes crash with RN 0.81+ / Fabric
// All Google Cast imports removed to prevent Metro bundler from resolving them

// Set all to null - Google Cast disabled
const GoogleCast: any = null;
const CastButton: any = null;
const useCastState: any = null;
const useRemoteMediaClient: any = null;
const useCastSession: any = null;
const useDevices: any = null;
const CastState: any = null;

console.log('[NativeCastButton] Google Cast DISABLED (Fabric compatibility issue)');

interface NativeCastButtonProps {
  size?: number;
  color?: string;
  station?: {
    _id?: string;
    stationuuid?: string;
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

export const NativeCastButton: React.FC<NativeCastButtonProps> = ({
  size = 22,
  color = '#FFFFFF',
  station,
  streamUrl,
  nowPlaying,
  onStopLocalAudio,
}) => {
  const [isDiscovering, setIsDiscovering] = useState(true);
  
  // Use hooks conditionally
  const castState = useCastState?.();
  const remoteMediaClient = useRemoteMediaClient?.();
  const castSession = useCastSession?.();
  const devices = useDevices?.();

  // Start discovery on mount
  useEffect(() => {
    if (GoogleCast && Platform.OS !== 'web') {
      console.log('[NativeCastButton] Starting device discovery...');
      GoogleCast.showIntroductoryOverlay?.();
      
      // Discovery timeout
      const timeout = setTimeout(() => {
        setIsDiscovering(false);
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, []);

  // Log cast state changes
  useEffect(() => {
    console.log('[NativeCastButton] Cast state:', castState);
    console.log('[NativeCastButton] Devices found:', devices?.length || 0);
    
    if (castState === 'CONNECTED') {
      console.log('[NativeCastButton] Connected to device!');
      setIsDiscovering(false);
    }
  }, [castState, devices]);

  // Auto-cast when connected
  useEffect(() => {
    if (castState === 'CONNECTED' && station && streamUrl && remoteMediaClient) {
      console.log('[NativeCastButton] Connected! Starting cast...');
      castToDevice();
    }
  }, [castState, station, streamUrl]);

  const getStationLogoUrl = (station: any): string => {
    if (!station) return 'https://themegaradio.com/logo.png';
    
    const logo = station.favicon || station.logo;
    if (!logo) return 'https://themegaradio.com/logo.png';
    
    if (logo.startsWith('http')) return logo;
    return `https://themegaradio.com${logo.startsWith('/') ? '' : '/'}${logo}`;
  };

  const castToDevice = useCallback(async () => {
    if (!remoteMediaClient || !station) {
      console.log('[NativeCastButton] Cannot cast - missing client or station');
      return;
    }

    const url = streamUrl || station.url_resolved || station.urlResolved || station.url;
    if (!url) {
      console.log('[NativeCastButton] Cannot cast - no stream URL');
      return;
    }

    try {
      console.log('[NativeCastButton] Casting to device...');
      
      // Stop local audio first
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
      } else if (urlLower.includes('.ogg')) {
        contentType = 'audio/ogg';
      }

      const mediaInfo = {
        contentUrl: url,
        contentType,
        streamType: 'LIVE',
        metadata: {
          type: 'musicTrack',
          title: nowPlaying?.title || station.name,
          subtitle: nowPlaying?.artist || station.country || 'MegaRadio',
          albumTitle: 'MegaRadio',
          images: [{
            url: getStationLogoUrl(station),
          }],
        },
      };

      console.log('[NativeCastButton] Loading media:', mediaInfo);
      
      await remoteMediaClient.loadMedia({
        mediaInfo,
        autoplay: true,
        playPosition: 0,
      });

      console.log('[NativeCastButton] ✅ Cast started successfully:', station.name);
    } catch (err) {
      console.error('[NativeCastButton] ❌ Cast error:', err);
      Alert.alert('Cast Hatası', 'Cihaza bağlanırken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  }, [remoteMediaClient, station, streamUrl, nowPlaying, onStopLocalAudio]);

  // Handle manual button press (for when native button doesn't work)
  const handleManualCast = useCallback(() => {
    if (Platform.OS === 'ios') {
      // On iOS, show action sheet with options
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['İptal', 'Chromecast Ara', 'AirPlay Kullan'],
          cancelButtonIndex: 0,
          title: 'Cihaz Seç',
          message: 'Radyoyu hangi cihazda çalmak istiyorsunuz?',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            // Chromecast
            if (GoogleCast) {
              GoogleCast.showCastDialog?.();
            } else {
              Alert.alert('Chromecast', 'Chromecast özelliği native build gerektirir.');
            }
          } else if (buttonIndex === 2) {
            // AirPlay
            Alert.alert(
              'AirPlay',
              'AirPlay kullanmak için:\n\n1. Kontrol Merkezi\'ni açın (sağ üstten kaydırın)\n2. Ses çıkışını değiştirin\n3. AirPlay cihazınızı seçin',
              [{ text: 'Tamam' }]
            );
          }
        }
      );
    } else {
      // Android - just try to show cast dialog
      if (GoogleCast) {
        GoogleCast.showCastDialog?.();
      } else {
        Alert.alert('Cast', 'Cast özelliği native build gerektirir.');
      }
    }
  }, []);

  // Show native CastButton if Google Cast is available
  if (CastButton && Platform.OS !== 'web') {
    // Check if we have devices or are connected
    const hasDevices = devices && devices.length > 0;
    const isConnected = castState === 'CONNECTED' || castState === 'CONNECTING';
    
    // Always show the native CastButton - it handles discovery internally
    return (
      <TouchableOpacity 
        style={styles.container}
        onLongPress={handleManualCast}
        delayLongPress={500}
      >
        <CastButton 
          style={[
            styles.castButton, 
            { tintColor: isConnected ? '#4CAF50' : color }
          ]} 
        />
      </TouchableOpacity>
    );
  }

  // Fallback for web or when Google Cast is not available
  return (
    <TouchableOpacity
      style={styles.fallbackButton}
      onPress={() => {
        if (Platform.OS === 'ios') {
          handleManualCast();
        } else {
          Alert.alert(
            'Cast Kullanılamıyor',
            'Cast özelliği için native build gereklidir.\n\nEAS build oluşturun:\neas build --profile preview --platform all',
            [{ text: 'Tamam' }]
          );
        }
      }}
    >
      <Ionicons 
        name="tv-outline" 
        size={size} 
        color={color} 
        style={{ opacity: 0.5 }} 
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

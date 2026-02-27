// NativeCastModal - Google Cast / Chromecast integration for direct streaming
// This is SEPARATE from the existing CastModal (API-based casting to MegaRadio TV app)
// DISABLED: react-native-google-cast causes crash with RN 0.81+ / Fabric

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { colors, typography, spacing } from '../constants/theme';
import type { Station } from '../types';

// Custom message namespace for MegaRadio
const MEGARADIO_NAMESPACE = 'urn:x-cast:com.visiongo.megaradio';

// DISABLED: react-native-google-cast causes crash with RN 0.81+ / Fabric
// Error: RCTThirdPartyComponentsProvider - attempt to insert nil object
// TODO: Re-enable when library is updated for Fabric compatibility
/*
let GoogleCast: any = null;
let CastButton: any = null;
let useCastState: any = null;
let useDevices: any = null;
let useRemoteMediaClient: any = null;
let useCastSession: any = null;
let CastContext: any = null;
let useCastChannel: any = null;

try {
  const googleCast = require('react-native-google-cast');
  GoogleCast = googleCast.default || googleCast;
  CastButton = googleCast.CastButton;
  useCastState = googleCast.useCastState;
  useDevices = googleCast.useDevices;
  useRemoteMediaClient = googleCast.useRemoteMediaClient;
  useCastSession = googleCast.useCastSession;
  CastContext = googleCast.CastContext;
  useCastChannel = googleCast.useCastChannel;
  
  // Start discovery immediately on import (not waiting for button tap)
  if (CastContext) {
    try {
      const ctx = CastContext.getSessionManager?.();
      console.log('[NativeCast] CastContext available, discovery should start automatically');
    } catch (e) {
      console.log('[NativeCast] CastContext init warning:', e);
    }
  }
  console.log('[NativeCast] Google Cast module loaded successfully');
} catch (e) {
  console.log('[NativeCast] Google Cast not available (expected in dev/web):', e);
}
*/

// Set all to null - Google Cast disabled
const GoogleCast: any = null;
const CastButton: any = null;
const useCastState: any = null;
const useDevices: any = null;
const useRemoteMediaClient: any = null;
const useCastSession: any = null;
const CastContext: any = null;
const useCastChannel: any = null;

console.log('[NativeCast] Google Cast DISABLED (Fabric compatibility issue)');
    } catch (e) {
      console.log('[NativeCast] CastContext init:', e);
    }
  }
} catch (e) {
  console.log('[NativeCast] Google Cast not available (web or Expo Go)');
}

const { width } = Dimensions.get('window');

interface NativeCastModalProps {
  visible: boolean;
  onClose: () => void;
  station: Station | null;
  streamUrl: string | null;
  nowPlaying?: {
    title?: string;
    artist?: string;
  } | null;
  onStopLocalAudio?: () => void; // Callback to stop local audio when casting starts
}

// Fallback component for when Google Cast is not available
const NativeCastUnavailable: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <View style={styles.content}>
    <View style={styles.iconContainer}>
      <Ionicons name="tv-outline" size={48} color={colors.textMuted} />
    </View>
    <Text style={styles.unavailableTitle}>Cast Mevcut Değil</Text>
    <Text style={styles.unavailableText}>
      Native cast özelliği için uygulamayı EAS Build ile oluşturmanız gerekmektedir.
      {'\n\n'}
      Expo Go'da bu özellik desteklenmemektedir.
    </Text>
    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
      <Text style={styles.closeBtnText}>Kapat</Text>
    </TouchableOpacity>
  </View>
);

// Device item component
const DeviceItem: React.FC<{
  device: any;
  onSelect: (device: any) => void;
  isConnecting: boolean;
}> = ({ device, onSelect, isConnecting }) => (
  <TouchableOpacity 
    style={styles.deviceItem}
    onPress={() => onSelect(device)}
    disabled={isConnecting}
  >
    <View style={styles.deviceIcon}>
      <Ionicons name="tv" size={24} color={colors.primary} />
    </View>
    <View style={styles.deviceInfo}>
      <Text style={styles.deviceName}>{device.friendlyName}</Text>
      <Text style={styles.deviceModel}>{device.modelName || 'Chromecast'}</Text>
    </View>
    {isConnecting ? (
      <ActivityIndicator size="small" color={colors.primary} />
    ) : (
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    )}
  </TouchableOpacity>
);

// Main Native Cast Content Component
const NativeCastContent: React.FC<{
  station: Station | null;
  streamUrl: string | null;
  nowPlaying?: { title?: string; artist?: string } | null;
  onClose: () => void;
  onStopLocalAudio?: () => void;
}> = ({ station, streamUrl, nowPlaying, onClose, onStopLocalAudio }) => {
  const castState = useCastState?.() || 'NO_DEVICES_AVAILABLE';
  const devices = useDevices?.() || [];
  const remoteMediaClient = useRemoteMediaClient?.();
  const castSession = useCastSession?.();
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasStoppedLocalAudio = useRef(false);

  // Stop local audio when connected to Cast device
  useEffect(() => {
    if (castState === 'CONNECTED' && !hasStoppedLocalAudio.current && onStopLocalAudio) {
      console.log('[NativeCast] Connected to Cast device, stopping local audio');
      onStopLocalAudio();
      hasStoppedLocalAudio.current = true;
    }
    
    // Reset flag when disconnected
    if (castState === 'NOT_CONNECTED' || castState === 'NO_DEVICES_AVAILABLE') {
      hasStoppedLocalAudio.current = false;
    }
  }, [castState, onStopLocalAudio]);

  // Get connection status text
  const getStatusText = () => {
    switch (castState) {
      case 'NO_DEVICES_AVAILABLE':
        return 'Cihaz aranıyor...';
      case 'NOT_CONNECTED':
        return 'Bağlı değil';
      case 'CONNECTING':
        return 'Bağlanıyor...';
      case 'CONNECTED':
        return 'Bağlı';
      default:
        return 'Aranıyor...';
    }
  };

  const getStatusColor = () => {
    return castState === 'CONNECTED' ? '#4CAF50' : colors.textMuted;
  };

  // Determine content type for stream URL
  const getContentType = (url: string): string => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('.m3u8') || lowerUrl.includes('hls')) {
      return 'application/x-mpegURL';
    }
    if (lowerUrl.includes('.mp3') || lowerUrl.includes('mp3')) {
      return 'audio/mp3'; // Use audio/mp3 instead of audio/mpeg for better compatibility
    }
    if (lowerUrl.includes('.aac') || lowerUrl.includes('aac')) {
      return 'audio/aac';
    }
    if (lowerUrl.includes('.ogg')) {
      return 'audio/ogg';
    }
    // Default to MP3 for radio streams
    return 'audio/mp3';
  };

  // Send custom message to receiver
  const sendCustomMessage = useCallback(async (message: any) => {
    if (!castSession) {
      console.log('[NativeCast] No cast session available');
      return false;
    }
    
    try {
      await castSession.sendMessage(MEGARADIO_NAMESPACE, message);
      console.log('[NativeCast] Custom message sent:', message);
      return true;
    } catch (err) {
      console.error('[NativeCast] Failed to send custom message:', err);
      return false;
    }
  }, [castSession]);

  // Cast audio to selected device
  const handleCastAudio = useCallback(async () => {
    if (!remoteMediaClient || !station || !streamUrl) {
      setError('Lütfen önce bir cihaza bağlanın');
      return;
    }

    setIsCasting(true);
    setError(null);

    try {
      const contentType = getContentType(streamUrl);
      console.log('[NativeCast] Casting with contentType:', contentType, 'URL:', streamUrl);
      
      // Stop local audio before starting cast
      if (onStopLocalAudio) {
        console.log('[NativeCast] Stopping local audio before cast');
        onStopLocalAudio();
      }

      // Try custom message channel first (for MegaRadio receiver)
      const customMessage = {
        type: 'LOAD',
        stationId: station._id || station.stationuuid,
        stationName: station.name,
        streamUrl: streamUrl,
        imageUrl: station.favicon ? 
          (station.favicon.startsWith('http') ? station.favicon : `https://themegaradio.com${station.favicon}`) 
          : null,
      };
      
      const sentViaCustomChannel = await sendCustomMessage(customMessage);
      
      if (!sentViaCustomChannel) {
        // Fallback to standard media loading
        console.log('[NativeCast] Falling back to standard media loading');
        
        // Prepare media info - use Generic metadata for better audio support
        const mediaInfo = {
          contentUrl: streamUrl,
          contentType: contentType,
          streamType: 'LIVE',
          streamDuration: 0,
          metadata: {
            type: 'generic',
            title: nowPlaying?.title || station.name,
            subtitle: nowPlaying?.artist || station.country || 'MegaRadio',
            images: station.favicon ? [{ 
              url: station.favicon.startsWith('http') ? station.favicon : `https://themegaradio.com${station.favicon}`
            }] : [],
          },
        };

        console.log('[NativeCast] Loading media:', JSON.stringify(mediaInfo, null, 2));

        await remoteMediaClient.loadMedia({
          mediaInfo,
          autoplay: true,
          playPosition: 0,
        });
      }

      console.log('[NativeCast] Audio casting started:', station.name);
      
      // Show success and close after delay
      Alert.alert(
        'Cast Başlatıldı!',
        `${station.name} seçili cihazda çalmaya başladı.`,
        [{ text: 'Tamam', onPress: onClose }]
      );
    } catch (err: any) {
      console.error('[NativeCast] Cast error:', err);
      setError(`Cast başlatılamadı: ${err.message || 'Bilinmeyen hata'}`);
    } finally {
      setIsCasting(false);
    }
  }, [remoteMediaClient, station, streamUrl, nowPlaying, onClose, onStopLocalAudio, sendCustomMessage]);

  // Pause casting
  const handlePause = useCallback(async () => {
    if (remoteMediaClient) {
      await remoteMediaClient.pause();
    }
  }, [remoteMediaClient]);

  // Resume casting
  const handleResume = useCallback(async () => {
    if (remoteMediaClient) {
      await remoteMediaClient.play();
    }
  }, [remoteMediaClient]);

  // Stop casting
  const handleStop = useCallback(async () => {
    if (remoteMediaClient) {
      await remoteMediaClient.stop();
    }
  }, [remoteMediaClient]);

  // End session
  const handleDisconnect = useCallback(async () => {
    if (castSession) {
      await castSession.endSession(true);
    }
  }, [castSession]);

  return (
    <View style={styles.content}>
      {/* Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>

      {/* Native Cast Button (shows system device picker) */}
      {CastButton && (
        <View style={styles.nativeCastButtonContainer}>
          <CastButton style={styles.nativeCastButton} />
          <Text style={styles.nativeCastHint}>
            Cihaz seçmek için yukarıdaki butona dokunun
          </Text>
        </View>
      )}

      {/* Station Info */}
      {station && (
        <View style={styles.stationInfo}>
          <Text style={styles.stationName}>{station.name}</Text>
          {nowPlaying?.title && (
            <Text style={styles.nowPlayingText}>
              {nowPlaying.artist ? `${nowPlaying.artist} - ` : ''}{nowPlaying.title}
            </Text>
          )}
        </View>
      )}

      {/* Device List */}
      {devices.length > 0 && castState !== 'CONNECTED' && (
        <View style={styles.deviceList}>
          <Text style={styles.deviceListTitle}>Bulunan Cihazlar ({devices.length})</Text>
          <FlatList
            data={devices}
            keyExtractor={(item) => item.deviceId}
            renderItem={({ item }) => (
              <DeviceItem 
                device={item} 
                onSelect={() => {}} 
                isConnecting={isConnecting}
              />
            )}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Cast Button (when connected) */}
      {castState === 'CONNECTED' && (
        <>
          <TouchableOpacity
            style={[styles.castButton, isCasting && styles.castButtonDisabled]}
            onPress={handleCastAudio}
            disabled={isCasting || !station}
          >
            {isCasting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="play" size={24} color="#FFFFFF" />
                <Text style={styles.castButtonText}>Cast'e Gönder</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Playback Controls */}
          <View style={styles.controlsRow}>
            <TouchableOpacity style={styles.controlButton} onPress={handlePause}>
              <Ionicons name="pause" size={20} color={colors.textMuted} />
              <Text style={styles.controlText}>Duraklat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={handleResume}>
              <Ionicons name="play" size={20} color={colors.textMuted} />
              <Text style={styles.controlText}>Devam</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={handleStop}>
              <Ionicons name="stop" size={20} color={colors.textMuted} />
              <Text style={styles.controlText}>Durdur</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={handleDisconnect}>
              <Ionicons name="close-circle" size={20} color="#FF6B6B" />
              <Text style={[styles.controlText, { color: '#FF6B6B' }]}>Bağlantıyı Kes</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* No devices found */}
      {devices.length === 0 && castState !== 'CONNECTED' && (
        <View style={styles.noDevices}>
          <Ionicons name="search" size={32} color={colors.textMuted} />
          <Text style={styles.noDevicesText}>
            Chromecast veya Google Cast destekli cihaz aranıyor...
          </Text>
          <Text style={styles.noDevicesHint}>
            Cihazınızın aynı WiFi ağında olduğundan emin olun.
          </Text>
        </View>
      )}
    </View>
  );
};

// Main Modal Component
export const NativeCastModal: React.FC<NativeCastModalProps> = ({
  visible,
  onClose,
  station,
  streamUrl,
  nowPlaying,
  onStopLocalAudio,
}) => {
  const isGoogleCastAvailable = GoogleCast !== null && Platform.OS !== 'web';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={80} tint="dark" style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <Ionicons name="tv" size={24} color={colors.primary} />
              <Text style={styles.title}>Chromecast / AirPlay</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {isGoogleCastAvailable ? (
            <NativeCastContent
              station={station}
              streamUrl={streamUrl}
              nowPlaying={nowPlaying}
              onClose={onClose}
              onStopLocalAudio={onStopLocalAudio}
            />
          ) : (
            <NativeCastUnavailable onClose={onClose} />
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Stream doğrudan TV'ye gönderilir (MegaRadio TV uygulaması gerekmez)
            </Text>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  container: {
    width: width - 40,
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontFamily: 'Ubuntu-Bold',
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.lg,
    alignItems: 'center',
  },

  // Status
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: typography.sizes.sm,
    fontFamily: 'Ubuntu-Medium',
  },

  // Native Cast Button
  nativeCastButtonContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  nativeCastButton: {
    width: 48,
    height: 48,
    tintColor: colors.primary,
  },
  nativeCastHint: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  // Station Info
  stationInfo: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  stationName: {
    fontSize: typography.sizes.lg,
    fontFamily: 'Ubuntu-Bold',
    color: colors.text,
  },
  nowPlayingText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: 4,
  },

  // Device List
  deviceList: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  deviceListTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: 'Ubuntu-Medium',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: typography.sizes.md,
    fontFamily: 'Ubuntu-Medium',
    color: colors.text,
  },
  deviceModel: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },

  // Cast Button
  castButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: 30,
    width: '100%',
    marginBottom: spacing.lg,
  },
  castButtonDisabled: {
    opacity: 0.6,
  },
  castButtonText: {
    fontSize: typography.sizes.lg,
    fontFamily: 'Ubuntu-Bold',
    color: '#FFFFFF',
  },

  // Controls
  controlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  controlButton: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  controlText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },

  // No Devices
  noDevices: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  noDevicesText: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  noDevicesHint: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
    width: '100%',
  },
  errorText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: '#FF6B6B',
  },

  // Unavailable
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  unavailableTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: 'Ubuntu-Bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  unavailableText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  closeBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: 30,
  },
  closeBtnText: {
    fontSize: typography.sizes.md,
    fontFamily: 'Ubuntu-Bold',
    color: '#FFFFFF',
  },

  // Footer
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  footerText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default NativeCastModal;

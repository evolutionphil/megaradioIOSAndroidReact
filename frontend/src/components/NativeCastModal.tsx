// NativeCastModal.tsx - Chromecast + AirPlay casting for MegaRadio
// Chromecast: react-native-google-cast (native SDK)
// AirPlay: react-airplay (native AVRoutePickerView)

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { colors, typography, spacing } from '../constants/theme';
import { getStationLogoUrl } from '../utils/stationLogoHelper';
import type { Station } from '../types';

const { width } = Dimensions.get('window');

// ============== Google Cast (Chromecast) ==============
let GoogleCast: any = null;
let CastButton: any = null;
let useCastState: any = null;
let useRemoteMediaClient: any = null;
let useCastSession: any = null;
let CastState: any = null;
let isChromecastAvailable = false;

try {
  const mod = require('react-native-google-cast');
  GoogleCast = mod.default || mod.GoogleCast;
  CastButton = mod.CastButton;
  useCastState = mod.useCastState;
  useRemoteMediaClient = mod.useRemoteMediaClient;
  useCastSession = mod.useCastSession;
  CastState = mod.CastState;
  isChromecastAvailable = true;
  console.log('[NativeCast] Google Cast module loaded');
} catch (e) {
  console.log('[NativeCast] Google Cast not available (expected on web)');
}

// ============== AirPlay ==============
let AirplayButton: any = null;
let showRoutePicker: any = null;
let useAirplayConnectivity: any = null;
let useExternalPlaybackAvailability: any = null;
let isAirplayModuleAvailable = false;

try {
  const airplayMod = require('react-airplay');
  AirplayButton = airplayMod.AirplayButton;
  showRoutePicker = airplayMod.showRoutePicker;
  useAirplayConnectivity = airplayMod.useAirplayConnectivity;
  useExternalPlaybackAvailability = airplayMod.useExternalPlaybackAvailability;
  isAirplayModuleAvailable = true;
  console.log('[NativeCast] AirPlay module loaded');
} catch (e) {
  console.log('[NativeCast] AirPlay not available (expected on non-iOS)');
}

interface NativeCastModalProps {
  visible: boolean;
  onClose: () => void;
  station: Station | null;
  streamUrl: string | null;
  nowPlaying?: {
    title?: string;
    artist?: string;
  } | null;
  onStopLocalAudio?: () => void;
}

// ============== Main Cast Modal ==============
export const NativeCastModal: React.FC<NativeCastModalProps> = ({
  visible,
  onClose,
  station,
  streamUrl,
  nowPlaying,
  onStopLocalAudio,
}) => {
  // Chromecast hooks (conditionally called)
  const castState = useCastState?.();
  const remoteMediaClient = useRemoteMediaClient?.();
  const castSession = useCastSession?.();
  
  const [isCasting, setIsCasting] = useState(false);
  const [castError, setCastError] = useState<string | null>(null);

  // Auto-cast when Chromecast connects
  useEffect(() => {
    if (castState === 'connected' && station && streamUrl && remoteMediaClient && !isCasting) {
      console.log('[NativeCast] Chromecast connected, auto-casting...');
      castToChromecast();
    }
  }, [castState, station, streamUrl, remoteMediaClient]);

  const castToChromecast = useCallback(async () => {
    if (!remoteMediaClient || !station) return;

    const url = streamUrl || (station as any).url_resolved || (station as any).urlResolved || (station as any).url;
    if (!url) {
      setCastError('Stream URL bulunamadi');
      return;
    }

    try {
      setIsCasting(true);
      setCastError(null);

      // Stop local audio
      onStopLocalAudio?.();

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

      const logoUrl = getStationLogoUrl(station) || 'https://themegaradio.com/logo.png';

      await remoteMediaClient.loadMedia({
        mediaInfo: {
          contentUrl: url,
          contentType,
          streamType: 'live',
          metadata: {
            type: 'musicTrack',
            title: nowPlaying?.title || station.name,
            subtitle: nowPlaying?.artist || (station as any).country || 'MegaRadio',
            images: [{ url: logoUrl }],
          },
        },
        autoplay: true,
      });

      console.log('[NativeCast] Chromecast streaming started:', station.name);
    } catch (err: any) {
      console.error('[NativeCast] Chromecast error:', err);
      setCastError(err?.message || 'Baglanti hatasi');
    } finally {
      setIsCasting(false);
    }
  }, [remoteMediaClient, station, streamUrl, nowPlaying, onStopLocalAudio]);

  const handleShowChromecastDialog = () => {
    if (GoogleCast) {
      GoogleCast.showCastDialog?.();
    }
  };

  const handleDisconnect = async () => {
    try {
      if (GoogleCast) {
        await GoogleCast.endSession?.();
      }
    } catch (e) {
      console.log('[NativeCast] Disconnect error:', e);
    }
  };

  const isConnected = castState === 'connected';
  const isConnecting = castState === 'connecting';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <BlurView intensity={40} tint="dark" style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Cihaza Aktar</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeIcon}>
              <Ionicons name="close-circle" size={28} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Station Info */}
          {station && (
            <View style={styles.stationInfo}>
              <Ionicons name="radio" size={20} color={colors.primary} />
              <Text style={styles.stationName} numberOfLines={1}>
                {station.name}
              </Text>
            </View>
          )}

          {/* Cast Error */}
          {castError && (
            <View style={styles.errorBox}>
              <Ionicons name="warning" size={16} color="#FF6B6B" />
              <Text style={styles.errorText}>{castError}</Text>
            </View>
          )}

          {/* ===== CHROMECAST SECTION ===== */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chromecast</Text>
            
            {isChromecastAvailable ? (
              <View>
                {isConnected ? (
                  // Connected state
                  <View style={styles.connectedBox}>
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    <Text style={styles.connectedText}>Bagli</Text>
                    <View style={styles.connectedActions}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={castToChromecast}
                        disabled={isCasting}
                      >
                        {isCasting ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.actionBtnText}>Aktar</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.disconnectBtn]}
                        onPress={handleDisconnect}
                      >
                        <Text style={styles.actionBtnText}>Kes</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : isConnecting ? (
                  // Connecting state
                  <View style={styles.connectingBox}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.connectingText}>Baglaniliyor...</Text>
                  </View>
                ) : (
                  // Not connected - show native CastButton for device discovery
                  <TouchableOpacity
                    style={styles.castRow}
                    onPress={handleShowChromecastDialog}
                  >
                    <View style={styles.castIconWrap}>
                      {CastButton ? (
                        <CastButton style={{ width: 24, height: 24, tintColor: '#fff' }} />
                      ) : (
                        <Ionicons name="tv-outline" size={24} color="#fff" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.castRowTitle}>Chromecast Cihazi Sec</Text>
                      <Text style={styles.castRowSub}>
                        Aginizdaki Chromecast cihazlarini tarar
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.unavailableBox}>
                <Text style={styles.unavailableText}>
                  Chromecast native build gerektirir
                </Text>
              </View>
            )}
          </View>

          {/* ===== AIRPLAY SECTION (iOS only) ===== */}
          {Platform.OS === 'ios' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>AirPlay</Text>
              
              {isAirplayModuleAvailable ? (
                <TouchableOpacity
                  style={styles.castRow}
                  onPress={() => {
                    if (showRoutePicker) {
                      showRoutePicker({ prioritizesVideoDevices: false });
                    }
                  }}
                >
                  <View style={styles.castIconWrap}>
                    {AirplayButton ? (
                      <AirplayButton
                        tintColor="#fff"
                        activeTintColor={colors.primary}
                        style={{ width: 24, height: 24 }}
                      />
                    ) : (
                      <Ionicons name="volume-high" size={24} color="#fff" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.castRowTitle}>AirPlay Cihazi Sec</Text>
                    <Text style={styles.castRowSub}>
                      Apple TV, HomePod ve diger AirPlay cihazlari
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.castRow}
                  onPress={() => {
                    Alert.alert(
                      'AirPlay',
                      'AirPlay kullanmak icin:\n\n1. Kontrol Merkezi\'ni acin\n2. Ses cikisini degistirin\n3. AirPlay cihazinizi secin',
                      [{ text: 'Tamam' }]
                    );
                  }}
                >
                  <View style={styles.castIconWrap}>
                    <Ionicons name="volume-high" size={24} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.castRowTitle}>AirPlay</Text>
                    <Text style={styles.castRowSub}>
                      Kontrol Merkezi'nden ses cikisini degistirin
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Close Button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Kapat</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  closeIcon: {
    padding: 4,
  },
  stationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  stationName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,107,0.12)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    flex: 1,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  castRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  castIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  castRowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  castRowSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  connectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.12)',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  connectedText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#4CAF50',
  },
  connectedActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  disconnectBtn: {
    backgroundColor: '#FF6B6B',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  connectingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  connectingText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  unavailableBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 14,
  },
  unavailableText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default NativeCastModal;

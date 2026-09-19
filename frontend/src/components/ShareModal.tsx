import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Share,
  Linking,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlowEffect } from './GlowEffect';
import * as Clipboard from 'expo-clipboard';
import type { Station } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import { resolveStationShareUrl, stationShareContent } from '../utils/stationShare';

const ARTWORK_SIZE = 190;

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  station: Station | null;
  nowPlayingTitle?: string;
  getLogoUrl: (station: Station) => string | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  visible,
  onClose,
  station,
  nowPlayingTitle,
  getLogoUrl,
}) => {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    generation.current++;
    setShareError(null);
    return () => { generation.current++; };
  }, [visible, station?._id]);

  if (!station) return null;

  const logoUrl = getLogoUrl(station);
  const shareText = `${station.name} - MegaRadio`;
  const withShareUrl = async (action: (url: string) => Promise<unknown>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    const request = generation.current;
    setBusy(true);
    setShareError(null);
    try {
      const url = await resolveStationShareUrl(station);
      if (request !== generation.current) return;
      await action(url);
      if (request === generation.current) onClose();
    } catch (error) {
      if (request === generation.current) setShareError(error instanceof Error ? error.message : 'Paylaşım başarısız. Tekrar deneyin.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const handleFacebookShare = () => withShareUrl(async url => {
    const facebook = `fb://share?link=${encodeURIComponent(url)}`;
    const supported = await Linking.canOpenURL(facebook).catch(() => false);
    return Linking.openURL(supported ? facebook :
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(shareText)}`);
  });
  const handleInstagramShare = () => withShareUrl(url => Share.share(stationShareContent(station, url, nowPlayingTitle)));
  const handleWhatsAppShare = handleInstagramShare;
  const handleMore = handleInstagramShare;
  const handleCopyLink = () => withShareUrl(url => Clipboard.setStringAsync(url));

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
      testID="share-modal-dialog"
    >
      <StatusBar barStyle="light-content" backgroundColor="#1B1C1E" />
      <View style={[styles.fullScreen, { paddingTop: insets.top, paddingBottom: insets.bottom || 24 }]} testID="share-modal">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Share</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            testID="share-modal-close"
          >
            <Ionicons name="close" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Main content centered */}
        <View style={styles.content}>
          {/* Artwork with glow */}
          <View style={styles.artworkSection}>
            <GlowEffect size={ARTWORK_SIZE + 80} top={0} left={0} opacity={0.40} />
            <View style={styles.artworkWrapper}>
                <ImageWithFallback
                  testID="share-station-logo"
                  uri={logoUrl}
                  style={styles.artwork}
                  contentFit="cover"
                />
            </View>
          </View>

          {/* Equalizer bars */}
          <View style={styles.eqDots}>
            <View style={[styles.eqBar, { height: 10 }]} />
            <View style={[styles.eqBar, { height: 16 }]} />
            <View style={[styles.eqBar, { height: 12 }]} />
          </View>

          {/* Station info */}
          <Text testID="share-station-name" style={styles.stationName} numberOfLines={1}>{station.name}</Text>
          <Text testID="share-song-title" style={styles.songTitle} numberOfLines={1}>{nowPlayingTitle || 'Live Radio'}</Text>
          {busy && <ActivityIndicator testID="share-loading" color="#FF4199" />}
          {shareError && <Text testID="share-error" accessibilityRole="alert" style={styles.shareError}>{shareError}</Text>}

          {/* Social buttons - Facebook, Instagram, WhatsApp */}
          <View style={styles.socialRow}>
            <TouchableOpacity
              style={[styles.socialBtn, { backgroundColor: '#3b5998' }]}
              onPress={handleFacebookShare}
              testID="share-facebook"
              disabled={busy}
            >
              <FontAwesome5 name="facebook-f" size={24} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.socialBtn, { backgroundColor: '#C13584' }]}
              onPress={handleInstagramShare}
              testID="share-instagram"
              disabled={busy}
            >
              <FontAwesome5 name="instagram" size={26} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.socialBtn, { backgroundColor: '#25D366' }]}
              onPress={handleWhatsAppShare}
              testID="share-whatsapp"
              disabled={busy}
            >
              <FontAwesome5 name="whatsapp" size={26} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom actions */}
        <View style={styles.bottomActions}>
          {/* Copy Link */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleCopyLink}
            testID="share-copy-link"
            disabled={busy}
          >
            <Ionicons name="link-outline" size={22} color="#FFF" />
            <Text style={styles.actionText}>Copy Link</Text>
          </TouchableOpacity>

          {/* More */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleMore}
            testID="share-more"
            disabled={busy}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color="#FFF" />
            <Text style={styles.actionText}>More</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  shareError: { color: '#FF4199', textAlign: 'center', fontSize: 14, marginBottom: 12 },
  fullScreen: {
    flex: 1,
    backgroundColor: '#1B1C1E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerSpacer: { width: 40 },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Ubuntu-Bold',
    color: '#FFF',
    textAlign: 'center',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Main content
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  // Artwork with multi-layer glow (simulates blur on iOS)
  artworkSection: {
    width: ARTWORK_SIZE + 80,
    height: ARTWORK_SIZE + 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  artworkWrapper: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#2A2A2A',
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
  },
  artworkPlaceholder: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
  },

  // Equalizer bars
  eqDots: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    marginBottom: 10,
  },
  eqBar: {
    width: 5,
    backgroundColor: '#FF4199',
    borderRadius: 3,
  },

  // Station info
  stationName: {
    fontSize: 22,
    fontFamily: 'Ubuntu-Bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  songTitle: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
  },

  // Social buttons
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
  },
  socialBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Bottom actions
  bottomActions: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 56,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 16,
  },
  actionText: {
    fontSize: 16,
    fontFamily: 'Ubuntu-Medium',
    color: '#FFF',
  },
});

export default ShareModal;

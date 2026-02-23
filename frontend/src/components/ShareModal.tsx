import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Share,
  Linking,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlowEffect } from './GlowEffect';
import * as Clipboard from 'expo-clipboard';
import type { Station } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
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

  if (!station) return null;

  const logoUrl = getLogoUrl(station);
  const stationUrl = `https://themegaradio.com/station/${station._id}`;
  const shareText = `${station.name} - MegaRadio`;
  const shareMessage = nowPlayingTitle
    ? `${station.name} - ${nowPlayingTitle}\nMegaRadio'da dinle: ${stationUrl}`
    : `${station.name} - MegaRadio'da dinle: ${stationUrl}`;

  const handleFacebookShare = () => {
    const fbUrl = `fb://share?link=${encodeURIComponent(stationUrl)}`;
    Linking.canOpenURL(fbUrl).then((supported) => {
      if (supported) {
        Linking.openURL(fbUrl);
      } else {
        Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(stationUrl)}&quote=${encodeURIComponent(shareText)}`);
      }
    });
  };

  const handleInstagramShare = async () => {
    // Instagram doesn't have a direct share URL, use native share with Instagram hint
    onClose();
    try {
      await Share.share({
        message: shareMessage,
        url: stationUrl,
        title: shareText,
      });
    } catch {}
  };

  const handleWhatsAppShare = async () => {
    // Use native Share API instead of direct URL scheme
    // This opens the system share sheet and lets user choose their WhatsApp app
    onClose();
    try {
      await Share.share({
        message: shareMessage,
        url: Platform.OS === 'ios' ? stationUrl : undefined,
        title: shareText,
      });
    } catch {}
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(stationUrl);
    onClose();
  };

  const handleMore = async () => {
    onClose();
    setTimeout(async () => {
      try {
        await Share.share({
          message: shareMessage,
          url: stationUrl,
          title: shareText,
        });
      } catch {}
    }, 300);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="#1B1C1E" />
      <View style={[styles.fullScreen, { paddingTop: insets.top, paddingBottom: insets.bottom || 24 }]} data-testid="share-modal">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Share</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            data-testid="share-modal-close"
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
              {logoUrl ? (
                <Image
                  source={{ uri: logoUrl }}
                  style={styles.artwork}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.artworkPlaceholder}>
                  <Ionicons name="radio" size={60} color="#666" />
                </View>
              )}
            </View>
          </View>

          {/* Equalizer bars */}
          <View style={styles.eqDots}>
            <View style={[styles.eqBar, { height: 10 }]} />
            <View style={[styles.eqBar, { height: 16 }]} />
            <View style={[styles.eqBar, { height: 12 }]} />
          </View>

          {/* Station info */}
          <Text style={styles.stationName} numberOfLines={1}>{station.name}</Text>
          <Text style={styles.songTitle} numberOfLines={1}>{nowPlayingTitle || 'Live Radio'}</Text>

          {/* Social buttons - Facebook, Instagram, WhatsApp */}
          <View style={styles.socialRow}>
            <TouchableOpacity
              style={[styles.socialBtn, { backgroundColor: '#3b5998' }]}
              onPress={handleFacebookShare}
              data-testid="share-facebook"
            >
              <FontAwesome5 name="facebook-f" size={24} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.socialBtn, { backgroundColor: '#C13584' }]}
              onPress={handleInstagramShare}
              data-testid="share-instagram"
            >
              <FontAwesome5 name="instagram" size={26} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.socialBtn, { backgroundColor: '#25D366' }]}
              onPress={handleWhatsAppShare}
              data-testid="share-whatsapp"
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
            data-testid="share-copy-link"
          >
            <Ionicons name="link-outline" size={22} color="#FFF" />
            <Text style={styles.actionText}>Copy Link</Text>
          </TouchableOpacity>

          {/* More */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleMore}
            data-testid="share-more"
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

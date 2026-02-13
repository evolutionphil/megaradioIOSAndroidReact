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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  if (!station) return null;

  const logoUrl = getLogoUrl(station);
  const stationUrl = `https://themegaradio.com/station/${station._id}`;
  const shareText = nowPlayingTitle
    ? `${station.name} - ${nowPlayingTitle}`
    : `${station.name} on MegaRadio`;

  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(stationUrl)}`;
    Linking.openURL(url);
  };

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(stationUrl)}`;
    Linking.openURL(url);
  };

  const handleWhatsAppShare = () => {
    const url = `whatsapp://send?text=${encodeURIComponent(`${shareText} ${stationUrl}`)}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${stationUrl}`)}`);
    });
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(stationUrl);
    onClose();
  };

  const handleMore = async () => {
    onClose();
    try {
      await Share.share({
        message: `${shareText}\n${stationUrl}`,
        url: stationUrl,
        title: shareText,
      });
    } catch {}
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay} data-testid="share-modal">
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.headerTitle}>Share</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              data-testid="share-modal-close"
            >
              <Ionicons name="close" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Artwork with glow */}
          <View style={styles.artworkSection}>
            <View style={styles.glowOuter} />
            <View style={styles.glowInner} />
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

          {/* Equalizer dots */}
          <View style={styles.eqDots}>
            <View style={[styles.eqBar, { height: 12 }]} />
            <View style={[styles.eqBar, { height: 18 }]} />
            <View style={[styles.eqBar, { height: 14 }]} />
          </View>

          {/* Station info */}
          <Text style={styles.stationName}>{station.name}</Text>
          <Text style={styles.songTitle}>{nowPlayingTitle || 'Live Radio'}</Text>

          {/* Social buttons */}
          <View style={styles.socialRow}>
            <TouchableOpacity
              style={[styles.socialBtn, { backgroundColor: '#3b5998' }]}
              onPress={handleFacebookShare}
              data-testid="share-facebook"
            >
              <Text style={styles.fbIcon}>f</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.socialBtn, { backgroundColor: '#1DA1F2' }]}
              onPress={handleTwitterShare}
              data-testid="share-twitter"
            >
              <Ionicons name="logo-twitter" size={24} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.socialBtn, { backgroundColor: '#25D366' }]}
              onPress={handleWhatsAppShare}
              data-testid="share-whatsapp"
            >
              <Ionicons name="logo-whatsapp" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Copy Link */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleCopyLink}
            data-testid="share-copy-link"
          >
            <Ionicons name="link" size={22} color="#FFF" />
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1B1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerSpacer: { width: 36 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Artwork with glow
  artworkSection: {
    width: ARTWORK_SIZE + 60,
    height: ARTWORK_SIZE + 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  glowOuter: {
    position: 'absolute',
    width: ARTWORK_SIZE + 80,
    height: ARTWORK_SIZE + 80,
    borderRadius: (ARTWORK_SIZE + 80) / 2,
    backgroundColor: 'rgba(123, 97, 255, 0.12)',
  },
  glowInner: {
    position: 'absolute',
    width: ARTWORK_SIZE + 40,
    height: ARTWORK_SIZE + 40,
    borderRadius: (ARTWORK_SIZE + 40) / 2,
    backgroundColor: 'rgba(123, 97, 255, 0.18)',
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

  // Equalizer dots
  eqDots: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    marginBottom: 8,
  },
  eqBar: {
    width: 5,
    backgroundColor: '#FF4199',
    borderRadius: 3,
  },

  // Station info
  stationName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  songTitle: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    marginBottom: 28,
  },

  // Social buttons
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 28,
  },
  socialBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fbIcon: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFF',
  },

  // Action rows
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
    fontWeight: '600',
    color: '#FFF',
  },
});

export default ShareModal;

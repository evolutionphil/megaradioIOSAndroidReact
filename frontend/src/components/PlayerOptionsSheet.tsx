import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { colors, spacing, typography } from '../constants/theme';
import { useFavoritesStore } from '../store/favoritesStore';
import { useAuthStore } from '../store/authStore';
import type { Station } from '../types';
import { resolveStationShareUrl, stationShareContent } from '../utils/stationShare';

interface PlayerOptionsSheetProps {
  visible: boolean;
  onClose: () => void;
  station: Station | null;
  onShowEqualizer?: () => void;
}

export const PlayerOptionsSheet: React.FC<PlayerOptionsSheetProps> = ({
  visible,
  onClose,
  station,
  onShowEqualizer,
}) => {
  const { isAuthenticated } = useAuthStore();
  const { isFavorite, addFavorite, removeFavorite } = useFavoritesStore();
  
  const stationIsFavorite = station ? isFavorite(station._id) : false;

  // Handle add/remove favorite
  const handleFavoriteToggle = async () => {
    if (!station) return;
    
    if (stationIsFavorite) {
      await removeFavorite(station._id);
    } else {
      await addFavorite(station);
    }
    onClose();
  };

  // Handle copy link
  const handleCopyLink = async () => {
    if (!station) return;
    try {
      await Clipboard.setStringAsync(await resolveStationShareUrl(station));
      onClose();
    } catch (error) {
      Alert.alert('Paylaşım', error instanceof Error ? error.message : 'Bağlantı hazırlanamadı.');
    }
  };

  // Handle native share
  const handleShare = async () => {
    try {
      if (!station) return;
      const url = await resolveStationShareUrl(station);
      await Share.share(stationShareContent(station, url));
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Paylaşım', error instanceof Error ? error.message : 'Bağlantı hazırlanamadı.');
    }
    onClose();
  };

  // Handle play preview (30 seconds)
  const handlePlayPreview = () => {
    // This would trigger a 30 second preview
    // For now, just close the modal
    onClose();
  };

  // Handle equalizer
  const handleEqualizer = () => {
    onShowEqualizer?.();
    onClose();
  };

  if (!station) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID="player-options-modal"
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
        testID="player-options-dismiss"
      >
        <View style={styles.sheet}>
          {/* Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          {/* Options List */}
          <View style={styles.optionsList}>
            {/* Add to Favorites */}
            <TouchableOpacity 
              style={styles.optionRow}
              onPress={handleFavoriteToggle}
              testID="player-options-favorite"
            >
              <View style={styles.optionIcon}>
                <Ionicons 
                  name={stationIsFavorite ? "heart" : "heart-outline"} 
                  size={24} 
                  color={stationIsFavorite ? "#FF4199" : "#FFFFFF"} 
                />
              </View>
              <Text style={styles.optionText}>
                {stationIsFavorite ? 'Remove from Favorites' : 'Add this radio to Favorites'}
              </Text>
            </TouchableOpacity>

            {/* Play Preview */}
            <TouchableOpacity 
              style={styles.optionRow}
              onPress={handlePlayPreview}
              testID="player-options-preview"
            >
              <View style={styles.optionIcon}>
                <Ionicons name="play" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.optionText}>Play Preview</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>30 Second</Text>
              </View>
            </TouchableOpacity>

            {/* Equalizer */}
            <TouchableOpacity 
              style={styles.optionRow}
              onPress={handleEqualizer}
              testID="player-options-equalizer"
            >
              <View style={styles.optionIcon}>
                <Ionicons name="options" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.optionText}>Equalizer</Text>
              <View style={[styles.badge, styles.badgePink]}>
                <Text style={[styles.badgeText, styles.badgeTextPink]}>Classic</Text>
              </View>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Copy Link */}
            <TouchableOpacity 
              style={styles.optionRow}
              onPress={handleCopyLink}
              testID="player-options-copy-link"
            >
              <View style={styles.optionIcon}>
                <Ionicons name="link" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.optionText}>Copy Link</Text>
            </TouchableOpacity>

            {/* Share */}
            <TouchableOpacity 
              style={styles.optionRow}
              onPress={handleShare}
              testID="player-options-share"
            >
              <View style={styles.optionIcon}>
                <Ionicons name="share-outline" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.optionText}>Share...</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#555',
    borderRadius: 2,
  },
  optionsList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Ubuntu-Medium',
    color: '#FFFFFF',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#333',
    borderRadius: 16,
  },
  badgePink: {
    backgroundColor: '#FF4199',
  },
  badgeText: {
    fontSize: 13,
    fontFamily: 'Ubuntu-Medium',
    color: '#888',
  },
  badgeTextPink: {
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: spacing.sm,
  },
});

export default PlayerOptionsSheet;

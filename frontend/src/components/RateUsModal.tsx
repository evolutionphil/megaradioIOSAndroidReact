import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as StoreReview from 'expo-store-review';

interface Props {
  visible: boolean;
  onClose: () => void;
  onRated?: () => void;
}

const APP_STORE_URL = 'https://apps.apple.com/app/id6759302561';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.megaradio';

export const RateUsModal: React.FC<Props> = ({ visible, onClose, onRated }) => {
  const { t } = useTranslation();

  const handleRate = async () => {
    try {
      // Native in-app review on iOS / Android (preferred — keeps user in app)
      const isAvailable = await StoreReview.isAvailableAsync();
      const hasAction = await StoreReview.hasAction();

      if (isAvailable && hasAction) {
        await StoreReview.requestReview();
      } else {
        // Fallback: open store page directly
        const url = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
        await Linking.openURL(url);
      }
      onRated?.();
    } catch (e) {
      console.log('[RateUs] Error opening review:', e);
      const url = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
      Linking.openURL(url).catch(() => {});
    } finally {
      onClose();
    }
  };

  // 5 stars arranged in arc (V-shape ascending then descending)
  const starOffsets = [-12, -6, 0, -6, -12];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={styles.card}
          onPress={(e) => e.stopPropagation()}
          data-testid="rate-us-modal"
        >
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            data-testid="rate-us-close-btn"
            hitSlop={12}
          >
            <Ionicons name="close" size={20} color="#000" />
          </TouchableOpacity>

          {/* Stars in arc formation */}
          <View style={styles.starsRow}>
            {starOffsets.map((offset, i) => (
              <Ionicons
                key={i}
                name="star"
                size={28}
                color="#F5C25C"
                style={[styles.star, { marginTop: offset }]}
              />
            ))}
          </View>

          {/* Title */}
          <Text style={styles.title} data-testid="rate-us-title">
            {t('rate_us_title', 'You like MegaRadio?')}
          </Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            {t('rate_us_subtitle', "We're working hard to make MegaRadio better.")}
          </Text>

          {/* Rate us button */}
          <TouchableOpacity
            style={styles.rateBtn}
            onPress={handleRate}
            data-testid="rate-us-btn"
            activeOpacity={0.85}
          >
            <Text style={styles.rateBtnText}>
              {t('rate_us_button', 'Rate us!')}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 18,
    gap: 2,
  },
  star: {
    // marginTop applied dynamically for arc shape
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.9,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  rateBtn: {
    backgroundColor: '#FF4199',
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 999,
    minWidth: 140,
    alignItems: 'center',
  },
  rateBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default RateUsModal;

// Cast Modal - Simple TV Cast (Polling-based, no pairing code!)
// Same account login = automatic cast
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '../store/authStore';
import { castService } from '../services/castService';
import { colors, typography, spacing } from '../constants/theme';

const { width } = Dimensions.get('window');

interface CastModalProps {
  visible: boolean;
  onClose: () => void;
  currentStation?: any;
}

export const CastModal: React.FC<CastModalProps> = ({
  visible,
  onClose,
  currentStation,
}) => {
  const { token, isAuthenticated } = useAuthStore();
  const [isCasting, setIsCasting] = useState(false);
  const [castSuccess, setCastSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // TV'ye cast et
  const handleCastToTV = async () => {
    if (!token || !currentStation) {
      setError('Lütfen önce giriş yapın ve bir radyo seçin');
      return;
    }

    setIsCasting(true);
    setError(null);
    setCastSuccess(false);

    try {
      const success = await castService.castStation(token, currentStation);
      
      if (success) {
        setCastSuccess(true);
        // 2 saniye sonra modalı kapat
        setTimeout(() => {
          onClose();
          setCastSuccess(false);
        }, 2000);
      } else {
        setError('TV\'ye gönderilemedi. TV açık ve aynı hesapla giriş yapılmış olmalı.');
      }
    } catch (err: any) {
      console.error('[CastModal] Cast error:', err);
      setError('Bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setIsCasting(false);
    }
  };

  // TV'yi duraklat
  const handlePauseTV = async () => {
    if (!token) return;
    
    setIsCasting(true);
    const success = await castService.sendPause(token);
    setIsCasting(false);
    
    if (success) {
      showAlert('Başarılı', 'TV duraklatıldı');
    }
  };

  // TV'yi durdur
  const handleStopTV = async () => {
    if (!token) return;
    
    setIsCasting(true);
    const success = await castService.sendStop(token);
    setIsCasting(false);
    
    if (success) {
      showAlert('Başarılı', 'TV durduruldu');
      onClose();
    }
  };

  const handleClose = () => {
    setError(null);
    setCastSuccess(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <BlurView intensity={80} tint="dark" style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>TV'de Çal</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Success State */}
            {castSuccess ? (
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
                </View>
                <Text style={styles.successTitle}>TV'ye Gönderildi!</Text>
                <Text style={styles.successSubtitle}>
                  {currentStation?.name} TV'nizde çalmaya başlayacak
                </Text>
              </View>
            ) : (
              <>
                {/* TV Icon */}
                <View style={styles.tvIconContainer}>
                  <Ionicons name="tv" size={48} color={colors.primary} />
                </View>

                {/* Station Info */}
                {currentStation && (
                  <View style={styles.stationInfo}>
                    <Text style={styles.stationName}>{currentStation.name}</Text>
                    <Text style={styles.stationCountry}>
                      {currentStation.country || 'Radio'}
                    </Text>
                  </View>
                )}

                {/* Info Text */}
                <Text style={styles.infoText}>
                  Aynı hesapla giriş yapılmış TV'nizde bu radyoyu çalın
                </Text>

                {/* Error Message */}
                {error && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={20} color="#FF6B6B" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Cast Button */}
                <TouchableOpacity
                  style={[styles.castButton, isCasting && styles.castButtonDisabled]}
                  onPress={handleCastToTV}
                  disabled={isCasting || !currentStation}
                >
                  {isCasting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="play" size={24} color="#FFFFFF" />
                      <Text style={styles.castButtonText}>TV'de Çal</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Control Buttons */}
                <View style={styles.controlButtons}>
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={handlePauseTV}
                    disabled={isCasting}
                  >
                    <Ionicons name="pause" size={20} color={colors.textMuted} />
                    <Text style={styles.controlButtonText}>Duraklat</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={handleStopTV}
                    disabled={isCasting}
                  >
                    <Ionicons name="stop" size={20} color={colors.textMuted} />
                    <Text style={styles.controlButtonText}>Durdur</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              TV'nizde aynı hesapla giriş yapılmış olmalı
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
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  
  // TV Icon
  tvIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  
  // Station Info
  stationInfo: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  stationName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  stationCountry: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: 4,
  },
  
  // Info Text
  infoText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  
  // Error Banner
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
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  
  // Control Buttons
  controlButtons: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  controlButton: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  controlButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  
  // Success State
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  successIcon: {
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  successSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
    textAlign: 'center',
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
  },
});

export default CastModal;

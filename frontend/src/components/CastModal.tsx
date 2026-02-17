// Cast Modal - TV Cast pairing UI
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useCastStore } from '../store/castStore';
import { useAuthStore } from '../store/authStore';
import { colors, typography, spacing } from '../theme';

const { width } = Dimensions.get('window');

interface CastModalProps {
  visible: boolean;
  onClose: () => void;
  currentStationId?: string;
}

export const CastModal: React.FC<CastModalProps> = ({
  visible,
  onClose,
  currentStationId,
}) => {
  const { token } = useAuthStore();
  const {
    isLoading,
    isPaired,
    isConnected,
    pairingCode,
    error,
    startCastSession,
    endCastSession,
    castToTV,
  } = useCastStore();

  // Start session when modal opens
  useEffect(() => {
    if (visible && token && !pairingCode) {
      startCastSession(token);
    }
  }, [visible, token]);

  // Handle close
  const handleClose = () => {
    if (!isPaired) {
      endCastSession();
    }
    onClose();
  };

  // Cast current station when paired
  const handleCastNow = async () => {
    if (currentStationId) {
      await castToTV(currentStationId);
      onClose();
    }
  };

  // Format pairing code with spaces
  const formatCode = (code: string) => {
    return code.split('').join(' ');
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
            <Text style={styles.title}>TV'ye Bağlan</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Bağlantı oluşturuluyor...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={48} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => token && startCastSession(token)}
                >
                  <Text style={styles.retryButtonText}>Tekrar Dene</Text>
                </TouchableOpacity>
              </View>
            ) : isPaired ? (
              <View style={styles.pairedContainer}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
                </View>
                <Text style={styles.pairedTitle}>TV Bağlandı!</Text>
                <Text style={styles.pairedSubtitle}>
                  Artık radyoları TV'nize gönderebilirsiniz
                </Text>
                {currentStationId && (
                  <TouchableOpacity
                    style={styles.castButton}
                    onPress={handleCastNow}
                  >
                    <Ionicons name="tv" size={20} color="#FFFFFF" />
                    <Text style={styles.castButtonText}>TV'de Çal</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : pairingCode ? (
              <View style={styles.pairingContainer}>
                {/* TV Icon */}
                <View style={styles.tvIconContainer}>
                  <Ionicons name="tv-outline" size={64} color={colors.primary} />
                </View>

                {/* Instructions */}
                <Text style={styles.instructionTitle}>
                  TV'nizde bu kodu girin
                </Text>
                <Text style={styles.instructionText}>
                  Mega Radio TV uygulamasını açın ve "Mobil ile Bağlan" seçeneğinden aşağıdaki kodu girin
                </Text>

                {/* Pairing Code */}
                <View style={styles.codeContainer}>
                  <Text style={styles.pairingCode}>
                    {formatCode(pairingCode)}
                  </Text>
                </View>

                {/* Waiting indicator */}
                <View style={styles.waitingContainer}>
                  <ActivityIndicator size="small" color={colors.textMuted} />
                  <Text style={styles.waitingText}>TV bağlantısı bekleniyor...</Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* Footer */}
          {!isPaired && !isLoading && (
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Samsung ve LG Smart TV'lerde desteklenir
              </Text>
            </View>
          )}
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
    minHeight: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
  },
  errorContainer: {
    alignItems: 'center',
    gap: spacing.md,
  },
  errorText: {
    fontSize: typography.sizes.md,
    color: colors.error,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  retryButtonText: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  pairingContainer: {
    alignItems: 'center',
    width: '100%',
  },
  tvIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  instructionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  codeContainer: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: spacing.lg,
  },
  pairingCode: {
    fontSize: 36,
    fontWeight: typography.weights.bold,
    color: colors.text,
    letterSpacing: 4,
    fontFamily: 'monospace',
  },
  waitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  waitingText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  pairedContainer: {
    alignItems: 'center',
    width: '100%',
  },
  successIcon: {
    marginBottom: spacing.lg,
  },
  pairedTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  pairedSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  castButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 25,
  },
  castButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
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

// Cast Modal - Simple TV Cast pairing UI (without WebSocket)
import React, { useEffect, useState, useRef } from 'react';
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
import { useAuthStore } from '../store/authStore';
import { colors, typography, spacing } from '../constants/theme';

const { width } = Dimensions.get('window');
const BASE_URL = 'https://themegaradio.com';

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
  const [isLoading, setIsLoading] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPaired, setIsPaired] = useState(false);
  const hasStartedRef = useRef(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Create session when modal opens
  useEffect(() => {
    if (visible && token && !hasStartedRef.current) {
      hasStartedRef.current = true;
      createSession();
    }
    
    if (!visible) {
      // Cleanup when modal closes
      hasStartedRef.current = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [visible, token]);

  const createSession = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${BASE_URL}/api/cast/session/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ mobileDeviceId: 'expo-mobile' }),
      });

      const data = await response.json();
      
      if (data.success) {
        setPairingCode(data.pairingCode);
        setSessionId(data.sessionId);
        setIsLoading(false);
        
        // Start polling for pairing status
        startPolling(data.sessionId);
      } else {
        throw new Error(data.error || 'Session oluşturulamadı');
      }
    } catch (err: any) {
      console.log('[CastModal] Error:', err);
      setError(err.message || 'Bağlantı hatası');
      setIsLoading(false);
    }
  };

  const startPolling = (sid: string) => {
    // Poll every 3 seconds to check if TV paired
    pollingRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/cast/session/${sid}/status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        const data = await response.json();
        
        if (data.success && (data.status === 'paired' || data.status === 'active' || data.tvConnected)) {
          setIsPaired(true);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      } catch (err) {
        console.log('[CastModal] Polling error:', err);
      }
    }, 3000);
  };

  const handleCastNow = async () => {
    if (!sessionId || !currentStationId) {
      console.log('[CastModal] Missing sessionId or stationId', { sessionId, currentStationId });
      setError('Oturum veya istasyon bilgisi eksik');
      return;
    }
    
    try {
      console.log('[CastModal] Sending play command to TV...', { sessionId, stationId: currentStationId });
      const response = await fetch(`${BASE_URL}/api/cast/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId,
          command: 'play',
          data: { stationId: currentStationId },
        }),
      });
      
      console.log('[CastModal] Response status:', response.status);
      
      // Get response text first to debug
      const responseText = await response.text();
      console.log('[CastModal] Raw response:', responseText);
      
      if (!response.ok) {
        console.log('[CastModal] Cast error - HTTP', response.status);
        setError(`TV'ye gönderilemedi (${response.status})`);
        return;
      }
      
      // Try to parse JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.log('[CastModal] JSON parse error:', parseErr);
        setError('Sunucu yanıtı okunamadı');
        return;
      }
      
      console.log('[CastModal] Cast response:', data);
      
      if (data.success) {
        console.log('[CastModal] Cast successful!');
        onClose();
      } else {
        setError(data.error || data.message || 'TV\'ye gönderilemedi');
      }
    } catch (err: any) {
      console.log('[CastModal] Cast error:', err);
      setError(err.message || 'Bağlantı hatası');
    }
  };

  const handleClose = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    hasStartedRef.current = false;
    setPairingCode(null);
    setSessionId(null);
    setIsPaired(false);
    setError(null);
    onClose();
  };

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
                  onPress={() => {
                    hasStartedRef.current = false;
                    createSession();
                  }}
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

// Cast Modal - Direct Cast to registered TVs (no pairing code needed!)
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '../store/authStore';
import { colors, typography, spacing } from '../constants/theme';

const { width } = Dimensions.get('window');
const BASE_URL = 'https://themegaradio.com';

interface CastDevice {
  deviceId: string;
  deviceName: string;
  platform: 'tizen' | 'webos';
  lastSeenAt?: string;
  pairedAt?: string;
}

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
  const [devices, setDevices] = useState<CastDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [castingTo, setCastingTo] = useState<string | null>(null);
  const [showPairingMode, setShowPairingMode] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Load registered devices when modal opens
  useEffect(() => {
    if (visible && token) {
      loadDevices();
    }
    if (!visible) {
      // Reset state when modal closes
      setError(null);
      setCastingTo(null);
      setShowPairingMode(false);
      setPairingCode(null);
      setSessionId(null);
    }
  }, [visible, token]);

  // Load user's registered TV devices
  const loadDevices = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${BASE_URL}/api/user/devices`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      
      if (data.success && data.devices) {
        // Sort by lastSeenAt (most recent first) and deduplicate by deviceId
        const uniqueDevices = data.devices
          .sort((a: CastDevice, b: CastDevice) => 
            new Date(b.lastSeenAt || 0).getTime() - new Date(a.lastSeenAt || 0).getTime()
          )
          .slice(0, 5); // Show max 5 most recent devices
        
        setDevices(uniqueDevices);
      } else {
        setDevices([]);
      }
    } catch (err: any) {
      console.log('[CastModal] Error loading devices:', err);
      setError('TV listesi yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  };

  // Direct cast to a registered TV
  const handleDirectCast = async (device: CastDevice) => {
    if (!currentStationId) {
      showAlert('Hata', 'Önce bir radyo istasyonu seçin');
      return;
    }
    
    setCastingTo(device.deviceId);
    setError(null);
    
    try {
      console.log('[CastModal] Direct casting to device:', device.deviceId);
      
      const response = await fetch(`${BASE_URL}/api/cast/direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          deviceId: device.deviceId,
          stationId: currentStationId,
        }),
      });
      
      const data = await response.json();
      console.log('[CastModal] Direct cast response:', data);
      
      if (data.success) {
        showAlert('Başarılı', `${device.deviceName} üzerinde çalıyor!`);
        onClose();
      } else {
        // Device might be offline, show helpful message
        setError(data.error || 'TV\'ye bağlanılamadı. TV açık ve aynı hesapla giriş yapılmış olmalı.');
      }
    } catch (err: any) {
      console.log('[CastModal] Direct cast error:', err);
      setError('Bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setCastingTo(null);
    }
  };

  // Create new pairing session for new TVs
  const createPairingSession = async () => {
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
        setShowPairingMode(true);
      } else {
        setError(data.error || 'Eşleşme kodu oluşturulamadı');
      }
    } catch (err: any) {
      console.log('[CastModal] Error creating session:', err);
      setError('Bağlantı hatası');
    } finally {
      setIsLoading(false);
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const formatLastSeen = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Şimdi aktif';
    if (diffMins < 60) return `${diffMins} dk önce`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} saat önce`;
    return `${Math.floor(diffMins / 1440)} gün önce`;
  };

  const getPlatformIcon = (platform: string) => {
    return platform === 'tizen' ? 'tv' : 'tv-outline';
  };

  const handleClose = () => {
    setShowPairingMode(false);
    setPairingCode(null);
    setSessionId(null);
    setError(null);
    onClose();
  };

  // Render device item
  const renderDevice = ({ item }: { item: CastDevice }) => {
    const isCasting = castingTo === item.deviceId;
    const lastSeen = formatLastSeen(item.lastSeenAt);
    
    return (
      <TouchableOpacity
        style={styles.deviceItem}
        onPress={() => handleDirectCast(item)}
        disabled={isCasting}
        activeOpacity={0.7}
      >
        <View style={styles.deviceIcon}>
          <Ionicons 
            name={getPlatformIcon(item.platform)} 
            size={28} 
            color={colors.primary} 
          />
        </View>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{item.deviceName}</Text>
          <Text style={styles.deviceMeta}>
            {item.platform === 'tizen' ? 'Samsung TV' : 'LG TV'}
            {lastSeen ? ` • ${lastSeen}` : ''}
          </Text>
        </View>
        <View style={styles.deviceAction}>
          {isCasting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="play-circle" size={32} color={colors.primary} />
          )}
        </View>
      </TouchableOpacity>
    );
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
            <Text style={styles.title}>
              {showPairingMode ? 'Yeni TV Ekle' : 'TV\'de Çal'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Yükleniyor...</Text>
              </View>
            ) : showPairingMode && pairingCode ? (
              // Pairing Mode - Show code for new TV
              <View style={styles.pairingContainer}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => setShowPairingMode(false)}
                >
                  <Ionicons name="arrow-back" size={20} color={colors.textMuted} />
                  <Text style={styles.backButtonText}>Geri</Text>
                </TouchableOpacity>
                
                <View style={styles.tvIconContainer}>
                  <Ionicons name="tv-outline" size={48} color={colors.primary} />
                </View>
                
                <Text style={styles.instructionTitle}>
                  TV'nizde bu kodu girin
                </Text>
                <Text style={styles.instructionText}>
                  Mega Radio TV uygulamasında "Mobil ile Bağlan" seçeneğinden kodu girin
                </Text>
                
                <View style={styles.codeContainer}>
                  <Text style={styles.pairingCode}>
                    {pairingCode.split('').join(' ')}
                  </Text>
                </View>
                
                <View style={styles.waitingContainer}>
                  <ActivityIndicator size="small" color={colors.textMuted} />
                  <Text style={styles.waitingText}>TV bağlantısı bekleniyor...</Text>
                </View>
              </View>
            ) : (
              // Device List Mode
              <View style={styles.devicesContainer}>
                {error && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={20} color="#FF6B6B" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}
                
                {devices.length > 0 ? (
                  <>
                    <Text style={styles.sectionTitle}>Kayıtlı TV'leriniz</Text>
                    <FlatList
                      data={devices}
                      renderItem={renderDevice}
                      keyExtractor={(item) => item.deviceId}
                      style={styles.deviceList}
                      scrollEnabled={false}
                    />
                  </>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="tv-outline" size={48} color={colors.textMuted} />
                    <Text style={styles.emptyTitle}>Kayıtlı TV Yok</Text>
                    <Text style={styles.emptyText}>
                      Aynı hesapla giriş yapılmış TV'niz bulunmuyor
                    </Text>
                  </View>
                )}
                
                {/* Add New TV Button */}
                <TouchableOpacity
                  style={styles.addNewButton}
                  onPress={createPairingSession}
                >
                  <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                  <Text style={styles.addNewButtonText}>Yeni TV Ekle</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Samsung ve LG Smart TV'lerde desteklenir
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
    maxHeight: '80%',
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
    padding: spacing.lg,
    minHeight: 200,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
  },
  
  // Devices List
  devicesContainer: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textMuted,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  deviceList: {
    marginBottom: spacing.lg,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  deviceName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  deviceMeta: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  deviceAction: {
    marginLeft: spacing.sm,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  
  // Add New Button
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addNewButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  
  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: '#FF6B6B',
  },
  
  // Pairing Mode
  pairingContainer: {
    alignItems: 'center',
    width: '100%',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  backButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  tvIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    fontSize: 32,
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

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { usePremiumStore } from '../store/premiumStore';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const S = SCREEN_WIDTH / 375;

// Conditionally import IAP service (only on native)
const getIAPService = () => {
  if (Platform.OS === 'web') return null;
  try {
    return require('../services/iapService').iapService;
  } catch (e) {
    return null;
  }
};

const getProductIds = () => {
  if (Platform.OS === 'web') return {};
  try {
    return require('../services/iapService').PRODUCT_IDS;
  } catch (e) {
    return {};
  }
};

interface PremiumPaywallProps {
  visible: boolean;
  onClose: () => void;
  mode?: 'premium' | 'remove_ads';
}

const PREMIUM_FEATURES = [
  { key: 'remove_ads', icon: 'ban-outline' as const },
  { key: 'song_info', icon: 'musical-notes-outline' as const },
  { key: 'spotify_youtube', icon: 'logo-youtube' as const },
  { key: 'hd_stream', icon: 'radio-outline' as const },
  { key: 'song_history', icon: 'time-outline' as const },
  { key: 'and_more', icon: 'sparkles-outline' as const },
];

type PricingOption = 'monthly' | 'yearly' | 'lifetime';

export const PremiumPaywall: React.FC<PremiumPaywallProps> = ({ visible, onClose, mode = 'premium' }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<PricingOption>('yearly');
  const [isLoading, setIsLoading] = useState(false);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [iapReady, setIapReady] = useState(false);

  // Initialize IAP and load real prices
  useEffect(() => {
    if (!visible || Platform.OS === 'web') return;
    
    const initIAP = async () => {
      const iap = getIAPService();
      if (!iap) return;
      
      try {
        await iap.initialize();
        const products = iap.getProducts();
        const PIDS = getProductIds();
        
        const priceMap: Record<string, string> = {};
        products.forEach((p: any) => {
          if (p.productId === PIDS.REMOVE_ADS_YEARLY) priceMap.remove_ads = p.localizedPrice;
          if (p.productId === PIDS.PREMIUM_MONTHLY) priceMap.monthly = p.localizedPrice;
          if (p.productId === PIDS.PREMIUM_YEARLY) priceMap.yearly = p.localizedPrice;
          if (p.productId === PIDS.PREMIUM_LIFETIME) priceMap.lifetime = p.localizedPrice;
        });
        
        setPrices(priceMap);
        setIapReady(products.length > 0);
        console.log('[Paywall] Loaded prices:', priceMap, 'products:', products.length);
      } catch (e) {
        console.log('[Paywall] IAP init error (expected on simulator):', e);
      }
    };
    
    initIAP();
  }, [visible]);

  const handleSubscribe = useCallback(async () => {
    const iap = getIAPService();
    const PIDS = getProductIds();
    
    if (!iap || !PIDS.PREMIUM_MONTHLY) {
      Alert.alert(
        t('not_available', 'Not Available'),
        t('iap_not_available', 'In-App Purchases are not available on this device.'),
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);

    try {
      let productId: string;
      
      if (mode === 'remove_ads') {
        productId = PIDS.REMOVE_ADS_YEARLY;
      } else {
        switch (selectedPlan) {
          case 'monthly':
            productId = PIDS.PREMIUM_MONTHLY;
            break;
          case 'yearly':
            productId = PIDS.PREMIUM_YEARLY;
            break;
          case 'lifetime':
            productId = PIDS.PREMIUM_LIFETIME;
            break;
          default:
            productId = PIDS.PREMIUM_YEARLY;
        }
      }

      console.log('[Paywall] Purchasing:', productId);
      
      // Lifetime is a one-time purchase, others are subscriptions
      if (selectedPlan === 'lifetime' && mode !== 'remove_ads') {
        await iap.purchaseProduct(productId);
      } else {
        await iap.purchaseSubscription(productId);
      }
      // purchaseUpdatedListener in iapService handles success
      onClose();
    } catch (error: any) {
      if (error.code !== 'E_USER_CANCELLED') {
        Alert.alert(
          t('purchase_error', 'Purchase Error'),
          error.message || t('purchase_failed', 'Purchase could not be completed. Please try again.'),
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [mode, selectedPlan, t, onClose]);

  const handleRestore = useCallback(async () => {
    const iap = getIAPService();
    if (!iap) return;
    
    setIsLoading(true);
    try {
      const restored = await iap.restorePurchases();
      if (restored) {
        Alert.alert(
          t('restored', 'Restored!'),
          t('purchase_restored', 'Your purchase has been restored successfully.'),
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        Alert.alert(
          t('no_purchase', 'No Purchase Found'),
          t('no_purchase_desc', 'No previous purchases were found for this account.'),
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert(t('error', 'Error'), error.message);
    } finally {
      setIsLoading(false);
    }
  }, [t, onClose]);

  if (!visible) return null;

  // ─── Remove Ads Paywall (Simple) ───
  if (mode === 'remove_ads') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
        <View style={styles.container}>
          <LinearGradient colors={['#1a0a2e', '#16082a', '#0D0D0F']} style={StyleSheet.absoluteFill} />
          
          <TouchableOpacity style={[styles.closeBtn, { top: insets.top + 10 }]} onPress={onClose} data-testid="remove-ads-close-btn">
            <View style={styles.closeBtnCircle}>
              <Ionicons name="close" size={20} color="#FFF" />
            </View>
          </TouchableOpacity>

          <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]} showsVerticalScrollIndicator={false}>
            <View style={styles.heroSection}>
              <View style={styles.heroImagePlaceholder}>
                <Ionicons name="headset" size={80 * S} color="#FF4199" />
              </View>
            </View>

            <View style={styles.titleSection}>
              <Text style={styles.brandName}>MegaRadio</Text>
              <Text style={styles.removeAdsTitle}>{t('remove_ads_title', 'Remove Ads')}</Text>
            </View>

            <Text style={styles.removeAdsDesc}>{t('tired_of_ads', 'Tired of seeing ads?')}</Text>
            <Text style={styles.removeAdsSubDesc}>{t('remove_all_ads', 'Now remove all annoying ads')}</Text>

            <View style={styles.removeAdsPriceBox}>
              <Text style={styles.removeAdsPriceText}>
                {prices.remove_ads || '€ 5.99'}/{t('yearly_lc', 'yearly')}, {t('cancel_anytime', 'cancel anytime')}
              </Text>
            </View>

            <TouchableOpacity style={styles.ctaButton} onPress={handleSubscribe} disabled={isLoading} data-testid="remove-ads-subscribe-btn">
              {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.ctaText}>{t('remove_ads_btn', 'Remove Ads')}</Text>}
            </TouchableOpacity>

            <View style={styles.footerLinks}>
              <TouchableOpacity onPress={handleRestore}>
                <Text style={styles.footerLink}>{t('already_paid', 'Already paid?')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { onClose(); router.push('/static-page?type=terms'); }}>
                <Text style={styles.footerLink}>{t('terms_conditions', 'Terms & Conditions')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // ─── Full Premium Paywall ───
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.container}>
        <LinearGradient colors={['#1a0a2e', '#16082a', '#0D0D0F']} style={StyleSheet.absoluteFill} />
        
        <TouchableOpacity style={[styles.closeBtn, { top: insets.top + 10 }]} onPress={onClose} data-testid="premium-close-btn">
          <View style={styles.closeBtnCircle}>
            <Ionicons name="close" size={20} color="#FFF" />
          </View>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]} showsVerticalScrollIndicator={false}>
          {/* Crown + Title */}
          <View style={styles.crownSection}>
            <View style={styles.crownBox}>
              <Ionicons name="diamond" size={28} color="#FFD700" />
            </View>
          </View>

          <Text style={styles.premiumTitle}>{t('go_premium', 'Go Premium')}</Text>
          <Text style={styles.premiumSubtitle}>{t('unlock_features', 'To unlock amazing features')}</Text>

          {/* Features */}
          <View style={styles.featuresList}>
            {PREMIUM_FEATURES.map((feature) => (
              <View key={feature.key} style={styles.featureRow}>
                <View style={styles.featureCheck}>
                  <Ionicons name="checkmark" size={16} color="#FFF" />
                </View>
                <Text style={styles.featureText}>
                  {feature.key === 'remove_ads' && t('feat_remove_ads', 'Remove Ads')}
                  {feature.key === 'song_info' && t('feat_song_info', 'Now Playing Song Info')}
                  {feature.key === 'spotify_youtube' && t('feat_spotify_youtube', 'Spotify & YouTube Music Support')}
                  {feature.key === 'hd_stream' && t('feat_hd_stream', 'HD Stream')}
                  {feature.key === 'song_history' && t('feat_song_history', 'Song History')}
                  {feature.key === 'and_more' && t('feat_and_more', 'And More...')}
                </Text>
              </View>
            ))}
          </View>

          {/* Pricing Options */}
          <View style={styles.pricingSection}>
            <TouchableOpacity
              style={[styles.priceOption, selectedPlan === 'yearly' && styles.priceOptionSelected]}
              onPress={() => setSelectedPlan('yearly')}
              data-testid="premium-yearly-option"
            >
              <View style={styles.radioOuter}>
                {selectedPlan === 'yearly' && <View style={styles.radioInner} />}
              </View>
              <View style={styles.priceInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.priceLabel}>{t('yearly', 'Yearly')}</Text>
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>{t('recommended', 'Recommended')}</Text>
                  </View>
                </View>
                <Text style={styles.priceSub}>{t('cancel_anytime', 'cancel anytime')}</Text>
              </View>
              <Text style={styles.priceAmount}>{prices.yearly || '€29.99'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.priceOption, selectedPlan === 'lifetime' && styles.priceOptionSelected]}
              onPress={() => setSelectedPlan('lifetime')}
              data-testid="premium-lifetime-option"
            >
              <View style={styles.radioOuter}>
                {selectedPlan === 'lifetime' && <View style={styles.radioInner} />}
              </View>
              <View style={styles.priceInfo}>
                <Text style={styles.priceLabel}>{t('lifetime', 'Lifetime')}</Text>
                <Text style={styles.priceSub}>{t('one_time_payment', 'one-time payment')}</Text>
              </View>
              <Text style={styles.priceAmount}>{prices.lifetime || '€59.99'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.priceOption, selectedPlan === 'monthly' && styles.priceOptionSelected]}
              onPress={() => setSelectedPlan('monthly')}
              data-testid="premium-monthly-option"
            >
              <View style={styles.radioOuter}>
                {selectedPlan === 'monthly' && <View style={styles.radioInner} />}
              </View>
              <View style={styles.priceInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.priceLabel}>{t('monthly', 'Monthly')}</Text>
                  <View style={styles.trialBadge}>
                    <Text style={styles.trialBadgeText}>{t('free_trial_badge', '7 Days Free')}</Text>
                  </View>
                </View>
                <Text style={styles.priceSub}>{t('trial_then_price', '7 days free, then €3.99/mo')}</Text>
              </View>
              <Text style={styles.priceAmount}>{prices.monthly || '€3.99'}</Text>
            </TouchableOpacity>
          </View>

          {/* CTA */}
          <TouchableOpacity style={styles.ctaButton} onPress={handleSubscribe} disabled={isLoading} data-testid="premium-subscribe-btn">
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.ctaText}>
                {selectedPlan === 'monthly' 
                  ? t('start_free_trial', 'Start Free Trial')
                  : t('subscribe_now', 'Subscribe Now')
                }
              </Text>
            )}
          </TouchableOpacity>

          {/* Trial Info Text */}
          {selectedPlan === 'monthly' && (
            <Text style={styles.trialInfoText}>
              {t('trial_info', '7 days free, then auto-renews at €3.99/month. Cancel anytime.')}
            </Text>
          )}

          {/* Footer */}
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={handleRestore}>
              <Text style={styles.footerLink}>{t('already_paid', 'Already paid?')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { onClose(); router.push('/static-page?type=terms'); }}>
              <Text style={styles.footerLink}>{t('terms_conditions', 'Terms & Conditions')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0F' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  closeBtn: { position: 'absolute', right: 20, zIndex: 100 },
  closeBtnCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  crownSection: { alignItems: 'flex-start', marginBottom: 20 },
  crownBox: {
    width: 52, height: 52, borderRadius: 12,
    backgroundColor: 'rgba(255,215,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  premiumTitle: { fontSize: 28 * S, fontFamily: 'Ubuntu-Bold', color: '#FFD700', marginBottom: 4 },
  premiumSubtitle: { fontSize: 16 * S, fontFamily: 'Ubuntu-Regular', color: 'rgba(255,255,255,0.7)', marginBottom: 28 },
  featuresList: { marginBottom: 32 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  featureCheck: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  featureText: { fontSize: 16 * S, fontFamily: 'Ubuntu-Medium', color: '#FFF', flex: 1 },
  pricingSection: { marginBottom: 24, gap: 12 },
  priceOption: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 16,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  priceOptionSelected: { borderColor: '#FF4199', backgroundColor: 'rgba(255,65,153,0.08)' },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#FF4199',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF4199' },
  priceInfo: { flex: 1 },
  priceLabel: { fontSize: 16 * S, fontFamily: 'Ubuntu-Bold', color: '#FFF' },
  priceSub: { fontSize: 12 * S, fontFamily: 'Ubuntu-Regular', color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  priceAmount: { fontSize: 20 * S, fontFamily: 'Ubuntu-Bold', color: '#FFF' },
  recommendedBadge: {
    backgroundColor: '#FF4199', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  recommendedText: { fontSize: 10 * S, fontFamily: 'Ubuntu-Bold', color: '#FFF' },
  trialBadge: {
    backgroundColor: '#4CAF50', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  trialBadgeText: { fontSize: 10 * S, fontFamily: 'Ubuntu-Bold', color: '#FFF' },
  trialInfoText: {
    fontSize: 12 * S, fontFamily: 'Ubuntu-Regular',
    color: 'rgba(255,255,255,0.4)', textAlign: 'center',
    marginTop: -12, marginBottom: 16, paddingHorizontal: 16,
  },
  ctaButton: {
    height: 56, borderRadius: 28, backgroundColor: '#FF4199',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  ctaText: { fontSize: 17 * S, fontFamily: 'Ubuntu-Bold', color: '#FFF' },
  footerLinks: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 8, marginBottom: 20,
  },
  footerLink: { fontSize: 13 * S, fontFamily: 'Ubuntu-Regular', color: 'rgba(255,255,255,0.4)', textDecorationLine: 'underline' },
  heroSection: { alignItems: 'center', marginBottom: 24 },
  heroImagePlaceholder: {
    width: SCREEN_WIDTH - 48, height: 200 * S, borderRadius: 20,
    backgroundColor: 'rgba(255,65,153,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  titleSection: { alignItems: 'center', marginBottom: 20 },
  brandName: { fontSize: 22 * S, fontFamily: 'Ubuntu-Bold', color: '#FF4199', marginBottom: 4 },
  removeAdsTitle: { fontSize: 18 * S, fontFamily: 'Ubuntu-Medium', color: 'rgba(255,255,255,0.6)' },
  removeAdsDesc: { fontSize: 22 * S, fontFamily: 'Ubuntu-Bold', color: '#FFF', textAlign: 'center', marginBottom: 6 },
  removeAdsSubDesc: { fontSize: 15 * S, fontFamily: 'Ubuntu-Regular', color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 32 },
  removeAdsPriceBox: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center', marginBottom: 20,
  },
  removeAdsPriceText: { fontSize: 15 * S, fontFamily: 'Ubuntu-Medium', color: 'rgba(255,255,255,0.7)' },
});

export default PremiumPaywall;

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePremiumStore, PremiumPlan } from '../store/premiumStore';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const S = SCREEN_WIDTH / 375;

interface PremiumPaywallProps {
  visible: boolean;
  onClose: () => void;
  // 'premium' = full premium paywall, 'remove_ads' = simple remove ads
  mode?: 'premium' | 'remove_ads';
}

const PREMIUM_FEATURES = [
  { key: 'remove_ads', icon: 'ban-outline' },
  { key: 'song_info', icon: 'musical-notes-outline' },
  { key: 'spotify_youtube', icon: 'logo-youtube' },
  { key: 'hd_stream', icon: 'radio-outline' },
  { key: 'song_history', icon: 'time-outline' },
  { key: 'and_more', icon: 'sparkles-outline' },
];

type PricingOption = 'monthly' | 'yearly' | 'lifetime';

export const PremiumPaywall: React.FC<PremiumPaywallProps> = ({ visible, onClose, mode = 'premium' }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { setPremiumStatus } = usePremiumStore();
  const [selectedPlan, setSelectedPlan] = useState<PricingOption>('yearly');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = useCallback(async () => {
    setIsLoading(true);
    
    try {
      if (mode === 'remove_ads') {
        // TODO: Integrate with StoreKit/Google Play Billing for real IAP
        // For now, show placeholder
        Alert.alert(
          t('coming_soon', 'Coming Soon'),
          t('iap_coming_soon', 'In-App Purchase will be available soon. Stay tuned!'),
          [{ text: 'OK' }]
        );
      } else {
        let plan: PremiumPlan = 'none';
        let expiryDate: string | null = null;
        
        switch (selectedPlan) {
          case 'monthly':
            plan = 'premium_monthly';
            break;
          case 'yearly':
            plan = 'premium_yearly';
            break;
          case 'lifetime':
            plan = 'premium_lifetime';
            break;
        }
        
        // TODO: Integrate with StoreKit/Google Play Billing for real IAP
        Alert.alert(
          t('coming_soon', 'Coming Soon'),
          t('iap_coming_soon', 'In-App Purchase will be available soon. Stay tuned!'),
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('[PremiumPaywall] Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [mode, selectedPlan, setPremiumStatus, t]);

  if (!visible) return null;

  // ─── Remove Ads Paywall (Simple) ───
  if (mode === 'remove_ads') {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <LinearGradient
            colors={['#1a0a2e', '#16082a', '#0D0D0F']}
            style={StyleSheet.absoluteFill}
          />
          
          {/* Close */}
          <TouchableOpacity
            style={[styles.closeBtn, { top: insets.top + 10 }]}
            onPress={onClose}
            data-testid="remove-ads-close-btn"
          >
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Image Placeholder */}
            <View style={styles.heroSection}>
              <View style={styles.heroImagePlaceholder}>
                <Ionicons name="headset" size={80 * S} color="#FF4199" />
              </View>
            </View>

            {/* Logo + Title */}
            <View style={styles.titleSection}>
              <Text style={styles.brandName}>MegaRadio</Text>
              <Text style={styles.removeAdsTitle}>{t('remove_ads_title', 'Remove Ads')}</Text>
            </View>

            {/* Description */}
            <Text style={styles.removeAdsDesc}>
              {t('tired_of_ads', 'Tired of seeing ads?')}
            </Text>
            <Text style={styles.removeAdsSubDesc}>
              {t('remove_all_ads', 'Now remove all annoying ads')}
            </Text>

            {/* Price */}
            <View style={styles.removeAdsPriceBox}>
              <Text style={styles.removeAdsPriceText}>
                {t('remove_ads_price', '€ 5.99/yearly, cancel anytime')}
              </Text>
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handleSubscribe}
              disabled={isLoading}
              data-testid="remove-ads-subscribe-btn"
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.ctaText}>{t('remove_ads_btn', 'Remove Ads')}</Text>
              )}
            </TouchableOpacity>

            {/* Footer Links */}
            <View style={styles.footerLinks}>
              <TouchableOpacity>
                <Text style={styles.footerLink}>{t('already_paid', 'Already paid?')}</Text>
              </TouchableOpacity>
              <TouchableOpacity>
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <LinearGradient
          colors={['#1a0a2e', '#16082a', '#0D0D0F']}
          style={StyleSheet.absoluteFill}
        />
        
        {/* Close */}
        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + 10 }]}
          onPress={onClose}
          data-testid="premium-close-btn"
        >
          <View style={styles.closeBtnCircle}>
            <Ionicons name="close" size={20} color="#FFF" />
          </View>
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
          showsVerticalScrollIndicator={false}
        >
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
            {/* Yearly - Recommended */}
            <TouchableOpacity
              style={[
                styles.priceOption,
                selectedPlan === 'yearly' && styles.priceOptionSelected,
              ]}
              onPress={() => setSelectedPlan('yearly')}
              data-testid="premium-yearly-option"
            >
              <View style={styles.radioOuter}>
                {selectedPlan === 'yearly' && <View style={styles.radioInner} />}
              </View>
              <View style={styles.priceInfo}>
                <Text style={styles.priceLabel}>{t('yearly', 'Yearly')}</Text>
                <Text style={styles.priceSub}>{t('cancel_anytime', 'cancel anytime')}</Text>
              </View>
              <Text style={styles.priceAmount}>€29.99</Text>
            </TouchableOpacity>

            {/* Lifetime */}
            <TouchableOpacity
              style={[
                styles.priceOption,
                selectedPlan === 'lifetime' && styles.priceOptionSelected,
              ]}
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
              <Text style={styles.priceAmount}>€59.99</Text>
            </TouchableOpacity>

            {/* Monthly */}
            <TouchableOpacity
              style={[
                styles.priceOption,
                selectedPlan === 'monthly' && styles.priceOptionSelected,
              ]}
              onPress={() => setSelectedPlan('monthly')}
              data-testid="premium-monthly-option"
            >
              <View style={styles.radioOuter}>
                {selectedPlan === 'monthly' && <View style={styles.radioInner} />}
              </View>
              <View style={styles.priceInfo}>
                <Text style={styles.priceLabel}>{t('monthly', 'Monthly')}</Text>
                <Text style={styles.priceSub}>{t('cancel_anytime', 'cancel anytime')}</Text>
              </View>
              <Text style={styles.priceAmount}>€3.99</Text>
            </TouchableOpacity>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleSubscribe}
            disabled={isLoading}
            data-testid="premium-subscribe-btn"
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.ctaText}>{t('subscribe_now', 'Subscribe Now')}</Text>
            )}
          </TouchableOpacity>

          {/* Footer Links */}
          <View style={styles.footerLinks}>
            <TouchableOpacity>
              <Text style={styles.footerLink}>{t('already_paid', 'Already paid?')}</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.footerLink}>{t('terms_conditions', 'Terms & Conditions')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0F',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 100,
  },
  closeBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Crown + Title ──
  crownSection: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  crownBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumTitle: {
    fontSize: 28 * S,
    fontFamily: 'Ubuntu-Bold',
    color: '#FFD700',
    marginBottom: 4,
  },
  premiumSubtitle: {
    fontSize: 16 * S,
    fontFamily: 'Ubuntu-Regular',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 28,
  },

  // ── Features ──
  featuresList: {
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureCheck: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureText: {
    fontSize: 16 * S,
    fontFamily: 'Ubuntu-Medium',
    color: '#FFF',
    flex: 1,
  },

  // ── Pricing ──
  pricingSection: {
    marginBottom: 24,
    gap: 12,
  },
  priceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  priceOptionSelected: {
    borderColor: '#FF4199',
    backgroundColor: 'rgba(255,65,153,0.08)',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FF4199',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF4199',
  },
  priceInfo: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 16 * S,
    fontFamily: 'Ubuntu-Bold',
    color: '#FFF',
  },
  priceSub: {
    fontSize: 12 * S,
    fontFamily: 'Ubuntu-Regular',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  priceAmount: {
    fontSize: 20 * S,
    fontFamily: 'Ubuntu-Bold',
    color: '#FFF',
  },

  // ── CTA Button ──
  ctaButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF4199',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  ctaText: {
    fontSize: 17 * S,
    fontFamily: 'Ubuntu-Bold',
    color: '#FFF',
  },

  // ── Footer ──
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  footerLink: {
    fontSize: 13 * S,
    fontFamily: 'Ubuntu-Regular',
    color: 'rgba(255,255,255,0.4)',
    textDecorationLine: 'underline',
  },

  // ── Remove Ads Mode ──
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heroImagePlaceholder: {
    width: SCREEN_WIDTH - 48,
    height: 200 * S,
    borderRadius: 20,
    backgroundColor: 'rgba(255,65,153,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  brandName: {
    fontSize: 22 * S,
    fontFamily: 'Ubuntu-Bold',
    color: '#FF4199',
    marginBottom: 4,
  },
  removeAdsTitle: {
    fontSize: 18 * S,
    fontFamily: 'Ubuntu-Medium',
    color: 'rgba(255,255,255,0.6)',
  },
  removeAdsDesc: {
    fontSize: 22 * S,
    fontFamily: 'Ubuntu-Bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  removeAdsSubDesc: {
    fontSize: 15 * S,
    fontFamily: 'Ubuntu-Regular',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 32,
  },
  removeAdsPriceBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  removeAdsPriceText: {
    fontSize: 15 * S,
    fontFamily: 'Ubuntu-Medium',
    color: 'rgba(255,255,255,0.7)',
  },
});

export default PremiumPaywall;

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography } from '../src/constants/theme';
import appService, { AppPage, AppPages } from '../src/services/appService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Assets
const ABOUT_HERO = require('../assets/images/about-hero.png');
const MEGA_LOGO = require('../assets/images/mega-logo-arc.png');

type PageType = 'about' | 'terms' | 'privacy';

const PAGE_TITLES: Record<PageType, string> = {
  about: 'MegaRadio',
  terms: 'Terms & Conditions',
  privacy: 'Privacy Policy',
};

// Fallback content when API returns empty - required for Apple App Store Review (Guideline 3.1.2c)
const FALLBACK_CONTENT: Record<string, string> = {
  terms: `Terms of Use (EULA)

Last updated: March 2026

1. Acceptance of Terms
By downloading, installing, or using MegaRadio ("the App"), you agree to be bound by these Terms of Use. If you do not agree, do not use the App.

2. Description of Service
MegaRadio provides access to internet radio stations worldwide. The App offers both free and premium subscription tiers.

3. Subscriptions & Auto-Renewal
MegaRadio offers the following auto-renewable subscriptions:

- MegaRadio Premium (Monthly): Provides ad-free listening, HD audio quality, and premium features. Includes a 7-day free trial for first-time subscribers. After the trial period, the subscription auto-renews at €3.99/month.
- Remove Ads (Yearly): Removes all advertisements. Auto-renews at €5.99/year.

Payment will be charged to your Apple ID account at the confirmation of purchase. Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage and cancel your subscriptions by going to your App Store account settings after purchase.

Any unused portion of a free trial period will be forfeited when you purchase a subscription.

4. Content
Radio station streams are provided by third-party broadcasters. MegaRadio does not control the content of these streams.

5. User Conduct
You agree not to misuse the App, interfere with its operation, or attempt to access it through unauthorized means.

6. Intellectual Property
All App content, design, and trademarks are owned by MegaRadio / VisionGo. You may not copy, modify, or distribute any part of the App.

7. Disclaimer of Warranties
The App is provided "as is" without warranties of any kind. We do not guarantee uninterrupted or error-free service.

8. Limitation of Liability
MegaRadio shall not be liable for any indirect, incidental, or consequential damages arising from your use of the App.

9. Changes to Terms
We reserve the right to modify these Terms at any time. Continued use of the App constitutes acceptance of updated Terms.

10. Contact
For questions about these Terms, contact us at: support@themegaradio.com`,

  privacy: `Privacy Policy

Last updated: March 2026

1. Introduction
MegaRadio ("we", "our", "us") respects your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our App.

2. Information We Collect

Account Information: When you create an account, we collect your email address, display name, and profile information.
Usage Data: We collect information about your listening habits, favorite stations, and app usage to improve your experience.
Device Information: We collect device type, operating system version, and unique device identifiers for analytics and push notifications.
Location Data: With your permission, we may collect your approximate location to suggest nearby radio stations.

3. How We Use Your Information

- To provide and maintain the App's functionality
- To personalize your experience and recommend stations
- To process subscriptions and payments (handled by Apple)
- To send push notifications (with your consent)
- To improve our services through analytics
- To display relevant advertisements (free tier only)

4. Third-Party Services

We use the following third-party services:
- Apple StoreKit for subscription management
- Google AdMob for advertisements (free tier)
- Analytics services to improve the App

5. Data Sharing
We do not sell your personal data. We may share anonymized, aggregated data with partners for analytics purposes.

6. Data Retention
We retain your data for as long as your account is active. You may request account deletion at any time through the App's settings (Profile > Delete Account).

7. Your Rights
You have the right to:
- Access your personal data
- Request correction of inaccurate data
- Request deletion of your account and data
- Opt out of marketing communications

8. Children's Privacy
The App is not intended for children under 13. We do not knowingly collect data from children.

9. Security
We implement appropriate security measures to protect your information. However, no method of transmission over the internet is 100% secure.

10. Changes to This Policy
We may update this Privacy Policy from time to time. We will notify you of significant changes through the App.

11. Contact Us
For privacy-related questions, contact us at: support@themegaradio.com`
};

export default function StaticPageScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type: PageType }>();
  const { t } = useTranslation();
  const [page, setPage] = useState<AppPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageType = (params.type || 'about') as keyof AppPages;

  useEffect(() => {
    const loadPage = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('[StaticPage] Loading page type:', pageType);
        const pages = await appService.getPages();
        console.log('[StaticPage] Pages response:', pages ? Object.keys(pages) : 'null');
        
        if (pages && pages[pageType]) {
          console.log('[StaticPage] Found page:', pages[pageType].title);
          setPage(pages[pageType]);
        } else {
          console.log('[StaticPage] Page not found for type:', pageType);
          // Don't set error - we'll show placeholder content
        }
      } catch (e) {
        console.error('[StaticPage] Error loading page:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadPage();
  }, [pageType]);

  const defaultTitle = PAGE_TITLES[pageType] || 'Page';

  // About Us page has special design
  if (pageType === 'about') {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.backButton}
              data-testid="about-back-btn"
            >
              <Ionicons name="chevron-back" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>MegaRadio</Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.aboutContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Image with Logo Overlay */}
          <View style={styles.heroContainer}>
            <Image 
              source={ABOUT_HERO} 
              style={styles.heroImage}
              resizeMode="cover"
            />
            <View style={styles.logoOverlay}>
              <Image 
                source={MEGA_LOGO} 
                style={styles.megaLogo}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Content */}
          <View style={styles.textContainer}>
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : page?.content ? (
              <Text style={styles.aboutText}>{page.content}</Text>
            ) : (
              <>
                <Text style={styles.aboutText}>
                  MegaRadio is your gateway to thousands of radio stations from around the world. 
                  Discover new music, stay updated with news, and enjoy your favorite genres - all in one app.
                </Text>
                <Text style={styles.aboutText}>
                  With MegaRadio, you can explore stations by genre, location, or popularity. 
                  Save your favorites, track your listening history, and connect with other music lovers.
                </Text>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Terms and Privacy pages - standard design
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
          data-testid="static-page-back-btn"
        >
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {page?.title || t(pageType, defaultTitle)}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {page?.content ? (
            <Text style={styles.content}>{page.content}</Text>
          ) : FALLBACK_CONTENT[pageType] ? (
            <Text style={styles.content}>{FALLBACK_CONTENT[pageType]}</Text>
          ) : (
            <View style={styles.emptyContent}>
              <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                {t('content_coming_soon', 'İçerik yakında eklenecek')}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  safeArea: {
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  
  // About Us specific styles
  aboutContent: {
    paddingBottom: 100,
  },
  heroContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.85,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  logoOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  megaLogo: {
    width: 200,
    height: 60,
  },
  textContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  aboutText: {
    fontSize: 15,
    fontFamily: 'Ubuntu-Medium',
    color: colors.text,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },

  // Standard page styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  errorText: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  content: {
    fontSize: typography.sizes.md,
    color: colors.text,
    lineHeight: 24,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

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

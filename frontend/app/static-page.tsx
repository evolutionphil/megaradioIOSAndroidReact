import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography } from '../src/constants/theme';
import appService, { AppPage } from '../src/services/appService';

type PageType = 'about' | 'terms' | 'privacy';

const PAGE_TITLES: Record<PageType, string> = {
  about: 'About Us',
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

  const pageType = params.type || 'about';

  useEffect(() => {
    const loadPage = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const pages = await appService.getPages();
        if (pages && pages[pageType]) {
          setPage(pages[pageType]);
        } else {
          setError('Page not found');
        }
      } catch (e) {
        setError('Failed to load page');
      } finally {
        setIsLoading(false);
      }
    };

    loadPage();
  }, [pageType]);

  const defaultTitle = PAGE_TITLES[pageType] || 'Page';

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
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
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
  scrollView: {
    flex: 1,
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
});

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { colors, gradients, spacing, borderRadius, typography } from '../src/constants/theme';
import api from '../src/services/api';
import { API_ENDPOINTS } from '../src/constants/api';

interface PublicProfile {
  _id: string;
  name: string;
  email?: string;
  profileImageUrl?: string;
  favorites_count: number;
  isPublicProfile: boolean;
  slug: string;
}

const ITEMS_PER_PAGE = 20;
const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=FF4199&color=fff&size=128&name=';

export default function PublicProfilesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [allProfiles, setAllProfiles] = useState<PublicProfile[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['public-profiles', page],
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.publicProfiles, {
        params: { page, limit: ITEMS_PER_PAGE }
      });
      return response.data;
    },
    onSuccess: (data) => {
      const profiles = data?.data || [];
      if (page === 1) {
        setAllProfiles(profiles);
      } else {
        setAllProfiles(prev => [...prev, ...profiles]);
      }
      setHasMore(profiles.length === ITEMS_PER_PAGE);
    },
  });

  const handleRefresh = useCallback(async () => {
    setPage(1);
    setAllProfiles([]);
    setHasMore(true);
    await refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (!isFetching && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [isFetching, hasMore]);

  const handleProfilePress = (profile: PublicProfile) => {
    router.push({
      pathname: '/user-profile',
      params: { userId: profile._id, userName: profile.name }
    });
  };

  const handleBackPress = () => {
    router.back();
  };

  const getAvatarUrl = (profile: PublicProfile) => {
    if (profile.profileImageUrl) {
      return profile.profileImageUrl;
    }
    return `${DEFAULT_AVATAR}${encodeURIComponent(profile.name)}`;
  };

  const renderProfile = ({ item }: { item: PublicProfile }) => (
    <TouchableOpacity
      style={styles.profileCard}
      onPress={() => handleProfilePress(item)}
      activeOpacity={0.7}
      data-testid={`public-profile-${item._id}`}
    >
      <Image
        source={{ uri: getAvatarUrl(item) }}
        style={styles.avatar}
        defaultSource={{ uri: `${DEFAULT_AVATAR}${encodeURIComponent(item.name)}` }}
      />
      <View style={styles.profileInfo}>
        <Text style={styles.profileName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.favoritesCount}>
          {item.favorites_count} {t('favorites', 'Favorites')}
        </Text>
      </View>
      <TouchableOpacity style={styles.chevronButton}>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!hasMore) return null;
    if (isFetching && page > 1) {
      return (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }
    if (hasMore && allProfiles.length > 0) {
      return (
        <TouchableOpacity
          style={styles.loadMoreButton}
          onPress={handleLoadMore}
          data-testid="load-more-profiles-btn"
        >
          <Text style={styles.loadMoreText}>{t('load_more', 'Load More')}</Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  return (
    <View style={styles.mainContainer}>
      <LinearGradient colors={gradients.background as any} style={styles.gradient}>
        <SafeAreaView style={styles.container} edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackPress}
              data-testid="public-profiles-back-btn"
            >
              <Ionicons name="chevron-back" size={28} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{t('favorites_from_users', 'Favorites from Users')}</Text>
              <Text style={styles.subtitle}>{t('discover_what_others_love', 'Discover what others love')}</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          {/* Content */}
          {isLoading && page === 1 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>{t('loading', 'Loading...')}</Text>
            </View>
          ) : allProfiles.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={colors.textMuted} />
              <Text style={styles.emptyText}>{t('no_public_profiles', 'No public profiles found')}</Text>
            </View>
          ) : (
            <FlatList
              data={allProfiles}
              renderItem={renderProfile}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isFetching && page === 1}
                  onRefresh={handleRefresh}
                  tintColor={colors.primary}
                />
              }
              ListFooterComponent={renderFooter}
            />
          )}
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  title: {
    fontFamily: 'Ubuntu-Bold',
    fontSize: typography.sizes.xl,
    color: colors.text,
  },
  subtitle: {
    fontFamily: 'Ubuntu-Regular',
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerSpacer: {
    width: 44,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1D',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2A2A2C',
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  profileName: {
    fontFamily: 'Ubuntu-Medium',
    fontSize: typography.sizes.md,
    color: colors.text,
    marginBottom: 4,
  },
  favoritesCount: {
    fontFamily: 'Ubuntu-Regular',
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  chevronButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Ubuntu-Regular',
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontFamily: 'Ubuntu-Regular',
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  loadingFooter: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  loadMoreButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  loadMoreText: {
    fontFamily: 'Ubuntu-Bold',
    fontSize: typography.sizes.md,
    color: colors.text,
  },
});

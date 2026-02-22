import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../src/services/api';
import { API_ENDPOINTS } from '../src/constants/api';
import { useAuthStore } from '../src/store/authStore';
import { useResponsive } from '../src/hooks/useResponsive';
import { UserItemSkeleton } from '../src/components/Skeleton';

interface PublicUser {
  _id: string;
  name: string;
  email?: string;
  profileImageUrl?: string;
  avatar?: string;
  favorites_count: number;
  isPublicProfile: boolean;
  slug?: string;
  isFollowing?: boolean;
}

export default function UsersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { isAuthenticated, user: currentUser } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [followingStatus, setFollowingStatus] = useState<Record<string, boolean>>({});
  const [loadingFollow, setLoadingFollow] = useState<Record<string, boolean>>({});
  
  // Responsive layout
  const responsive = useResponsive();
  const numColumns = responsive.isTablet ? 2 : 1;

  // Fetch public profiles
  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ['publicProfiles', 'all'],
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.publicProfiles, {
        params: { limit: 100 },
      });
      return response.data?.data || response.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  // Check follow status for all users
  const checkFollowStatus = useCallback(async (users: PublicUser[]) => {
    if (!isAuthenticated || !users.length) return;
    
    const statusMap: Record<string, boolean> = {};
    await Promise.all(
      users.map(async (user) => {
        if (user._id === currentUser?._id) return;
        try {
          const response = await api.get(`https://themegaradio.com/api/user/is-following/${user._id}`);
          statusMap[user._id] = response.data?.isFollowing || false;
        } catch {
          statusMap[user._id] = false;
        }
      })
    );
    setFollowingStatus(statusMap);
  }, [isAuthenticated, currentUser]);

  // Effect to check follow status when data loads
  React.useEffect(() => {
    if (usersData?.length) {
      checkFollowStatus(usersData);
    }
  }, [usersData, checkFollowStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleFollowToggle = async (userId: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Optimistic update - UI'ı hemen güncelle
    const wasFollowing = followingStatus[userId];
    setFollowingStatus(prev => ({ ...prev, [userId]: !wasFollowing }));
    setLoadingFollow(prev => ({ ...prev, [userId]: true }));

    try {
      if (wasFollowing) {
        await api.post(`https://themegaradio.com/api/user-engagement/unfollow/${userId}`);
      } else {
        await api.post(`https://themegaradio.com/api/user-engagement/follow/${userId}`);
      }
    } catch (error) {
      console.error('Follow/unfollow error:', error);
      // Hata durumunda geri al
      setFollowingStatus(prev => ({ ...prev, [userId]: wasFollowing }));
    } finally {
      setLoadingFollow(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleUserPress = (user: PublicUser) => {
    router.push({
      pathname: '/user-profile',
      params: {
        userId: user._id,
        userName: user.name,
        userAvatar: user.profileImageUrl || user.avatar || '',
      },
    });
  };

  const getAvatarUrl = (user: PublicUser): string => {
    const avatar = user.profileImageUrl || user.avatar;
    if (avatar) {
      return avatar.startsWith('http') ? avatar : `https://themegaradio.com${avatar}`;
    }
    return 'https://themegaradio.com/images/default-avatar.png';
  };

  // Filter users based on search
  const filteredUsers = React.useMemo(() => {
    if (!usersData) return [];
    if (!searchQuery.trim()) return usersData;
    
    const query = searchQuery.toLowerCase();
    return usersData.filter((user: PublicUser) => 
      user.name.toLowerCase().includes(query)
    );
  }, [usersData, searchQuery]);

  const renderUser = ({ item }: { item: PublicUser }) => {
    const isOwnProfile = currentUser?._id === item._id;
    const isFollowing = followingStatus[item._id];
    const isLoadingThisUser = loadingFollow[item._id];

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => handleUserPress(item)}
        data-testid={`user-item-${item._id}`}
      >
        {/* Avatar */}
        <Image source={{ uri: getAvatarUrl(item) }} style={styles.avatar} />

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userRadios}>{item.favorites_count} {t('radios', 'Radios')}</Text>
        </View>

        {/* Follow Button - Only show for other users */}
        {!isOwnProfile && (
          <TouchableOpacity
            style={[
              styles.followBtn,
              isFollowing && styles.followingBtn,
            ]}
            onPress={() => handleFollowToggle(item._id)}
            disabled={isLoadingThisUser}
            data-testid={`follow-btn-${item._id}`}
          >
            {isLoadingThisUser ? (
              <ActivityIndicator size="small" color={isFollowing ? '#FF4081' : '#FFFFFF'} />
            ) : (
              <Text style={[
                styles.followBtnText,
                isFollowing && styles.followingBtnText,
              ]}>
                {isFollowing ? t('unfollow') : t('follow')}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backBtn}
          data-testid="users-back-btn"
        >
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        
        {showSearch ? (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder={t('search_placeholder')}
              placeholderTextColor="#888888"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity onPress={() => { setShowSearch(false); setSearchQuery(''); }}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.headerTitle}>{t('users')}</Text>
            <TouchableOpacity 
              onPress={() => setShowSearch(true)} 
              style={styles.searchBtn}
              data-testid="users-search-btn"
            >
              <Ionicons name="search-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Content */}
      {isLoading ? (
        <View style={[styles.listContent, responsive.isTablet && { flexDirection: 'row', flexWrap: 'wrap' }]}>
          {Array.from({ length: responsive.isTablet ? 12 : 8 }).map((_, i) => (
            <View key={i} style={responsive.isTablet ? { width: '50%', paddingHorizontal: 4 } : undefined}>
              <UserItemSkeleton />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUser}
          keyExtractor={(item) => item._id}
          key={`users-${numColumns}`}
          numColumns={numColumns}
          contentContainerStyle={[styles.listContent, { paddingHorizontal: responsive.sidePadding }]}
          columnWrapperStyle={numColumns > 1 ? { gap: 12 } : undefined}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF4081"
            />
          }
          ItemSeparatorComponent={numColumns === 1 ? () => <View style={styles.separator} /> : undefined}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>{t('no_users') || 'No users found'}</Text>
              <Text style={styles.emptyText}>
                {searchQuery ? t('try_different_search') || 'Try a different search term' : t('no_public_profiles') || 'No public profiles available'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Ubuntu-Bold',
  },
  searchBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginLeft: 8,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Ubuntu-Regular',
  },
  divider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 90, // Space for MiniPlayer
    flexGrow: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2A2A2A',
    marginRight: 14,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Ubuntu-Medium',
    marginBottom: 2,
  },
  userRadios: {
    fontSize: 14,
    color: '#888888',
    fontFamily: 'Ubuntu-Regular',
  },
  followBtn: {
    backgroundColor: '#FF4081',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 90,
    alignItems: 'center',
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF4081',
  },
  followBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Ubuntu-Medium',
  },
  followingBtnText: {
    color: '#FF4081',
  },
  separator: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginLeft: 82, // Avatar width (52) + marginRight (14) + paddingHorizontal (16)
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Ubuntu-Medium',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#888888',
    fontFamily: 'Ubuntu-Regular',
    textAlign: 'center',
  },
});

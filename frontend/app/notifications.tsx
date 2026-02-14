import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import api from '../src/services/api';
import { API_ENDPOINTS } from '../src/constants/api';
import { useAuthStore } from '../src/store/authStore';
import { colors, spacing, borderRadius, typography } from '../src/constants/theme';

interface Notification {
  _id: string;
  type: 'follow' | 'new_station' | 'like' | 'comment' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: {
    userId?: string;
    userName?: string;
    userAvatar?: string;
    stationId?: string;
    stationName?: string;
    stationLogo?: string;
  };
}

interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  unreadCount: number;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch notifications
  const { data, isLoading, refetch } = useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.user.notifications);
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 60 * 1000, // 1 minute
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await api.patch(API_ENDPOINTS.user.markNotificationRead(notificationId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch(API_ENDPOINTS.user.markAllNotificationsRead);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification._id);
    }

    // Navigate based on notification type
    if (notification.type === 'follow' && notification.data?.userId) {
      router.push({
        pathname: '/user-profile',
        params: {
          userId: notification.data.userId,
          userName: notification.data.userName || 'User',
          userAvatar: notification.data.userAvatar || '',
        },
      });
    } else if (notification.type === 'new_station' && notification.data?.stationId) {
      router.push({
        pathname: '/player',
        params: { stationId: notification.data.stationId },
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return 'person-add';
      case 'new_station':
        return 'radio';
      case 'like':
        return 'heart';
      case 'comment':
        return 'chatbubble';
      default:
        return 'notifications';
    }
  };

  const getNotificationIconColor = (type: string) => {
    switch (type) {
      case 'follow':
        return '#4CAF50';
      case 'new_station':
        return '#FF4081';
      case 'like':
        return '#E91E63';
      case 'comment':
        return '#2196F3';
      default:
        return colors.textSecondary;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins}dk önce`;
    if (diffHours < 24) return `${diffHours}sa önce`;
    if (diffDays < 7) return `${diffDays}g önce`;
    return date.toLocaleDateString('tr-TR');
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.isRead && styles.unreadItem]}
      onPress={() => handleNotificationPress(item)}
      data-testid={`notification-item-${item._id}`}
    >
      {/* Icon or Avatar */}
      <View style={[styles.iconContainer, { backgroundColor: getNotificationIconColor(item.type) + '20' }]}>
        {item.type === 'follow' && item.data?.userAvatar ? (
          <Image 
            source={{ uri: item.data.userAvatar.startsWith('http') ? item.data.userAvatar : `https://themegaradio.com${item.data.userAvatar}` }} 
            style={styles.avatar} 
          />
        ) : (
          <Ionicons 
            name={getNotificationIcon(item.type) as any} 
            size={22} 
            color={getNotificationIconColor(item.type)} 
          />
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.time}>{formatTimeAgo(item.createdAt)}</Text>
      </View>

      {/* Unread indicator */}
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bildirimler</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Giriş Yapın</Text>
          <Text style={styles.emptyText}>Bildirimleri görmek için giriş yapmanız gerekiyor.</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
            <Text style={styles.loginBtnText}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} data-testid="notifications-back-btn">
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Bildirimler {unreadCount > 0 && `(${unreadCount})`}
        </Text>
        {unreadCount > 0 ? (
          <TouchableOpacity 
            style={styles.markAllBtn} 
            onPress={() => markAllReadMutation.mutate()}
            data-testid="mark-all-read-btn"
          >
            <Text style={styles.markAllText}>Tümünü Oku</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRight} />
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-outline" size={64} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Bildirim Yok</Text>
              <Text style={styles.emptyText}>
                Yeni takipçiler ve istasyonlar hakkında bildirimleri burada göreceksiniz.
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
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
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
  headerRight: {
    width: 80,
  },
  markAllBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  markAllText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: spacing.sm,
    flexGrow: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  unreadItem: {
    backgroundColor: 'rgba(255, 64, 129, 0.05)',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  message: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  time: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  loginBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    marginTop: spacing.lg,
  },
  loginBtnText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
});

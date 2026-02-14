import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Modal,
  Share,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import api from '../src/services/api';
import { useAuthStore } from '../src/store/authStore';
import { useUserFavorites, useUserProfile } from '../src/hooks/useQueries';
import { getPreloadedFavorites } from '../src/services/preloadService';

interface FavoriteStation {
  id: string;
  name: string;
  genre: string;
  logo: string;
}

export default function UserProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ userId: string; userName: string; userAvatar: string }>();
  const { user: currentUser, isAuthenticated } = useAuthStore();
  const [stations, setStations] = useState<FavoriteStation[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // User info from params - build full avatar URL
  const userName = params.userName || 'User';
  const rawAvatar = params.userAvatar || '';
  const userAvatar = rawAvatar 
    ? (rawAvatar.startsWith('http') ? rawAvatar : `https://themegaradio.com${rawAvatar}`)
    : 'https://themegaradio.com/images/default-avatar.png';
  const userId = params.userId || '';
  const isOwnProfile = currentUser?._id === userId;

  // Use React Query with preloaded data support
  const { data: favoritesData, isLoading: favoritesLoading } = useUserFavorites(userId);
  const { data: profileData } = useUserProfile(userId);

  // Check for preloaded data first
  useEffect(() => {
    if (userId) {
      const preloaded = getPreloadedFavorites(userId);
      if (preloaded) {
        console.log('[UserProfile] Using preloaded favorites');
        setStations(preloaded.map((s: any) => ({
          id: s._id || s.id,
          name: s.name,
          genre: s.genre || 'Radio',
          logo: s.logo || s.favicon || 'https://themegaradio.com/images/default-station.png',
        })));
      }
    }
  }, [userId]);

  // Update stations when React Query data arrives
  useEffect(() => {
    if (favoritesData && favoritesData.length > 0) {
      setStations(favoritesData.map((s: any) => ({
        id: s._id || s.id,
        name: s.name,
        genre: s.genre || 'Radio',
        logo: s.logo || s.favicon || 'https://themegaradio.com/images/default-station.png',
      })));
    }
  }, [favoritesData]);

  // Update profile counts from React Query
  useEffect(() => {
    if (profileData) {
      setFollowerCount(profileData.followersCount || 0);
      setFollowingCount(profileData.followingCount || 0);
    }
  }, [profileData]);

  // Load additional profile data (follow status)
  useEffect(() => {
    loadFollowStatus();
  }, [userId, isAuthenticated]);

  const loadFollowStatus = async () => {
    if (!userId) return;

    // Check if current user is following this user
    if (isAuthenticated && !isOwnProfile) {
      try {
        const isFollowingRes = await api.get(`https://themegaradio.com/api/user/is-following/${userId}`);
        setIsFollowing(isFollowingRes.data.isFollowing || false);
      } catch (e) {
        console.log('Could not check following status');
      }
    }
  };

  // Fallback: Load follower counts if not from React Query
  useEffect(() => {
    if (!profileData && userId) {
      loadFollowerCounts();
    }
  }, [userId, profileData]);

  const loadFollowerCounts = async () => {
    if (!userId) return;
    try {
      const [followersRes, followingRes] = await Promise.all([
        api.get(`https://themegaradio.com/api/users/${userId}/followers`),
        api.get(`https://themegaradio.com/api/users/${userId}/following`),
      ]);
      // API returns {followers: [], total: X} or {following: [], total: X}
      setFollowerCount(followersRes.data.total ?? (followersRes.data.followers || []).length);
      setFollowingCount(followingRes.data.total ?? (followingRes.data.following || []).length);
    } catch (e) {
      console.log('Could not fetch follower counts');
    }
  };

  const loading = favoritesLoading && stations.length === 0;

  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to follow users.');
      return;
    }

    if (!userId) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await api.post(`https://themegaradio.com/api/user-engagement/unfollow/${userId}`);
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
      } else {
        await api.post(`https://themegaradio.com/api/user-engagement/follow/${userId}`);
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      }
    } catch (error: any) {
      console.error('Follow/unfollow error:', error);
      Alert.alert('Error', 'Failed to update follow status. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handlePlayStation = (station: FavoriteStation) => {
    // TODO: Play station
    console.log('Play station:', station.name);
  };

  const handleShare = async (platform: string) => {
    const shareUrl = `https://themegaradio.com/user/${params.userId}`;
    const shareMessage = `Check out ${userName}'s profile on MegaRadio!`;

    switch (platform) {
      case 'facebook':
        Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`);
        break;
      case 'instagram':
        // Instagram doesn't support direct URL sharing, open app
        Linking.openURL('instagram://');
        break;
      case 'twitter':
        Linking.openURL(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${encodeURIComponent(shareUrl)}`);
        break;
      case 'whatsapp':
        Linking.openURL(`whatsapp://send?text=${encodeURIComponent(shareMessage + ' ' + shareUrl)}`);
        break;
      case 'copy':
        await Clipboard.setStringAsync(shareUrl);
        setShowShareModal(false);
        break;
      case 'more':
        setShowShareModal(false);
        Share.share({ message: shareMessage, url: shareUrl });
        break;
    }
  };

  const renderStation = ({ item }: { item: FavoriteStation }) => (
    <View style={styles.stationCard}>
      <Image source={{ uri: item.logo }} style={styles.stationLogo} />
      <View style={styles.stationInfo}>
        <Text style={styles.stationName}>{item.name}</Text>
        <Text style={styles.stationGenre}>{item.genre}</Text>
      </View>
      <TouchableOpacity 
        style={styles.playButton} 
        onPress={() => handlePlayStation(item)}
        data-testid={`play-station-${item.id}`}
      >
        <Ionicons name="play" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} data-testid="user-profile-back-btn">
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Image source={{ uri: userAvatar }} style={styles.headerAvatar} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{userName}</Text>
          <View style={styles.statsRow}>
            <Text style={styles.statText}>Followers <Text style={styles.statNumber}>{followerCount}</Text></Text>
            <Text style={styles.statText}>  Follows <Text style={styles.statNumber}>{followingCount}</Text></Text>
          </View>
        </View>
        {!isOwnProfile && (
          <TouchableOpacity 
            style={[styles.followBtn, isFollowing && styles.followingBtn]} 
            onPress={handleFollowToggle}
            disabled={followLoading}
            data-testid="user-profile-follow-btn"
          >
            {followLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.followBtnText}>{isFollowing ? 'Following' : 'Follow'}</Text>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={styles.shareBtn} 
          onPress={() => setShowShareModal(true)}
          data-testid="user-profile-share-btn"
        >
          <Ionicons name="share-social-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Stations List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4081" />
        </View>
      ) : (
        <FlatList
          data={stations}
          renderItem={renderStation}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No favorite stations yet</Text>
          }
        />
      )}

      {/* Share Modal */}
      <Modal visible={showShareModal} transparent animationType="slide" onRequestClose={() => setShowShareModal(false)}>
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowShareModal(false)}
        >
          <View style={{ flex: 1 }} />
        </TouchableOpacity>
        
        <View style={[styles.shareSheet, { paddingBottom: insets.bottom || 20 }]}>
          <View style={styles.sheetHandle} />
          
          {/* Social Icons Row */}
          <View style={styles.socialRow}>
            <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#3B5998' }]} onPress={() => handleShare('facebook')}>
              <FontAwesome5 name="facebook-f" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#E4405F' }]} onPress={() => handleShare('instagram')}>
              <FontAwesome5 name="instagram" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#1DA1F2' }]} onPress={() => handleShare('twitter')}>
              <FontAwesome5 name="twitter" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#25D366' }]} onPress={() => handleShare('whatsapp')}>
              <FontAwesome5 name="whatsapp" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Copy Link */}
          <TouchableOpacity style={styles.shareOption} onPress={() => handleShare('copy')}>
            <View style={styles.shareOptionIcon}>
              <Ionicons name="link-outline" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.shareOptionText}>Copy Link</Text>
          </TouchableOpacity>

          {/* More */}
          <TouchableOpacity style={styles.shareOption} onPress={() => handleShare('more')}>
            <View style={styles.shareOptionIcon}>
              <Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.shareOptionText}>More</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statText: {
    fontSize: 13,
    color: '#888888',
  },
  statNumber: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  shareBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followBtn: {
    backgroundColor: '#FF4081',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  followingBtn: {
    backgroundColor: '#3A3A3A',
  },
  followBtnText: {
    fontFamily: 'Ubuntu-Medium',
    fontSize: 14,
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  stationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  stationLogo: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
  },
  stationInfo: {
    flex: 1,
    marginLeft: 14,
  },
  stationName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  stationGenre: {
    fontSize: 14,
    color: '#888888',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  shareSheet: {
    backgroundColor: '#1B1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#555',
    alignSelf: 'center',
    marginBottom: 20,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  socialBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  shareOptionIcon: {
    marginRight: 16,
  },
  shareOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

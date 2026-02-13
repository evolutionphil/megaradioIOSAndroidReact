import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface Following {
  id: string;
  name: string;
  avatar: string;
}

// Mock data - will be replaced with API calls
const MOCK_FOLLOWING: Following[] = [
  { id: '1', name: 'Talha Çay', avatar: 'https://i.pravatar.cc/100?img=11' },
  { id: '2', name: 'Talha Çay', avatar: 'https://i.pravatar.cc/100?img=11' },
  { id: '3', name: 'Talha Çay', avatar: 'https://i.pravatar.cc/100?img=11' },
  { id: '4', name: 'Talha Çay', avatar: 'https://i.pravatar.cc/100?img=11' },
  { id: '5', name: 'Talha Çay', avatar: 'https://i.pravatar.cc/100?img=11' },
];

export default function FollowsScreen() {
  const router = useRouter();
  const [following, setFollowing] = useState<Following[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setFollowing(MOCK_FOLLOWING);
      setLoading(false);
    }, 500);
  }, []);

  const handleUnfollow = (id: string) => {
    setFollowing(prev => prev.filter(f => f.id !== id));
    // TODO: Call API to unfollow user
  };

  const filteredFollowing = searchQuery
    ? following.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : following;

  const renderItem = ({ item }: { item: Following }) => (
    <View style={styles.row}>
      <TouchableOpacity 
        style={styles.userInfo}
        onPress={() => router.push({ pathname: '/user-profile', params: { userId: item.id, userName: item.name, userAvatar: item.avatar } })}
      >
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        <Text style={styles.name}>{item.name}</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.unfollowButton}
        onPress={() => handleUnfollow(item.id)}
        data-testid={`unfollow-${item.id}`}
      >
        <Text style={styles.unfollowText}>Unfollow</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} data-testid="follows-back-btn">
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Follows</Text>
        <TouchableOpacity onPress={() => setSearchVisible(!searchVisible)} style={styles.searchBtn} data-testid="follows-search-btn">
          <Ionicons name="search-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      {searchVisible && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search following..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4081" />
        </View>
      ) : (
        <FlatList
          data={filteredFollowing}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Not following anyone</Text>
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
    paddingVertical: 14,
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
  },
  searchBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  unfollowButton: {
    backgroundColor: '#FF4081',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  unfollowText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  divider: {
    height: 0.5,
    backgroundColor: '#333333',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
  },
});

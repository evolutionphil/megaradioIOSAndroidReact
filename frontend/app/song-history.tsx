import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSongHistoryStore, SongHistoryEntry } from '../src/store/songHistoryStore';
import { usePremiumStore } from '../src/store/premiumStore';
import { PremiumPaywall } from '../src/components/PremiumPaywall';

// Format timestamp to relative time
const formatTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  const date = new Date(timestamp);
  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
};

// Open song in Spotify
const openInSpotify = (title: string, artist: string) => {
  const query = encodeURIComponent(`${artist} ${title}`);
  const spotifyUri = `spotify:search:${query}`;
  const spotifyWeb = `https://open.spotify.com/search/${query}`;
  
  Linking.canOpenURL(spotifyUri).then((canOpen) => {
    if (canOpen) {
      Linking.openURL(spotifyUri);
    } else {
      Linking.openURL(spotifyWeb);
    }
  }).catch(() => {
    Linking.openURL(spotifyWeb);
  });
};

// Open song in YouTube
const openInYouTube = (title: string, artist: string) => {
  const query = encodeURIComponent(`${artist} ${title}`);
  const youtubeUri = `youtube://results?search_query=${query}`;
  const youtubeWeb = `https://www.youtube.com/results?search_query=${query}`;
  
  Linking.canOpenURL(youtubeUri).then((canOpen) => {
    if (canOpen) {
      Linking.openURL(youtubeUri);
    } else {
      Linking.openURL(youtubeWeb);
    }
  }).catch(() => {
    Linking.openURL(youtubeWeb);
  });
};

const SongHistoryItem: React.FC<{
  item: SongHistoryEntry;
  isPremium: boolean;
  onUpgrade: () => void;
}> = ({ item, isPremium, onUpgrade }) => {
  return (
    <View style={styles.historyItem} data-testid={`song-history-item-${item.id}`}>
      {/* Song info */}
      <View style={styles.songInfo}>
        <View style={styles.songIcon}>
          <Ionicons name="musical-notes" size={20} color="#FF4199" />
        </View>
        <View style={styles.songDetails}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {isPremium ? item.title : '****'}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>
            {isPremium ? item.artist : '****'}
          </Text>
          <View style={styles.stationRow}>
            <Ionicons name="radio-outline" size={12} color="#666" />
            <Text style={styles.stationName} numberOfLines={1}>{item.stationName}</Text>
            <Text style={styles.timeAgo}>{formatTime(item.timestamp)}</Text>
          </View>
        </View>
      </View>

      {/* Action buttons */}
      {isPremium ? (
        <View style={styles.actionBtns}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openInSpotify(item.title, item.artist)}
            data-testid={`spotify-btn-${item.id}`}
          >
            <Ionicons name="logo-apple" size={18} color="#1DB954" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openInYouTube(item.title, item.artist)}
            data-testid={`youtube-btn-${item.id}`}
          >
            <Ionicons name="logo-youtube" size={18} color="#FF0000" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.lockBtn}
          onPress={onUpgrade}
          data-testid="song-history-lock-btn"
        >
          <Ionicons name="lock-closed" size={16} color="#FFD700" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function SongHistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { entries, loadHistory, clearHistory } = useSongHistoryStore();
  const { isPremium, hasFeature } = usePremiumStore();
  const [showPaywall, setShowPaywall] = useState(false);

  const hasSongHistoryAccess = hasFeature('song_history');

  useEffect(() => {
    loadHistory();
  }, []);

  const handleClearHistory = useCallback(() => {
    Alert.alert(
      t('clear_history', 'Clear History'),
      t('clear_history_confirm', 'Are you sure you want to clear all song history?'),
      [
        { text: t('cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('clear', 'Clear'),
          style: 'destructive',
          onPress: () => clearHistory(),
        },
      ]
    );
  }, [t, clearHistory]);

  const renderItem = useCallback(({ item }: { item: SongHistoryEntry }) => (
    <SongHistoryItem
      item={item}
      isPremium={hasSongHistoryAccess}
      onUpgrade={() => setShowPaywall(true)}
    />
  ), [hasSongHistoryAccess]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="time-outline" size={64} color="#333" />
      <Text style={styles.emptyTitle}>{t('no_song_history', 'No Song History')}</Text>
      <Text style={styles.emptySubtitle}>
        {t('song_history_empty_desc', 'Songs you listen to will appear here')}
      </Text>
    </View>
  ), [t]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} data-testid="song-history-back-btn">
          <Ionicons name="chevron-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('song_history', 'Song History')}</Text>
        {entries.length > 0 ? (
          <TouchableOpacity onPress={handleClearHistory} data-testid="song-history-clear-btn">
            <Ionicons name="trash-outline" size={22} color="#666" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 28 }} />
        )}
      </View>

      {/* Premium banner for non-premium users */}
      {!hasSongHistoryAccess && entries.length > 0 && (
        <TouchableOpacity
          style={styles.premiumBanner}
          onPress={() => setShowPaywall(true)}
          data-testid="song-history-premium-banner"
        >
          <Ionicons name="diamond" size={18} color="#FFD700" />
          <Text style={styles.premiumBannerText}>
            {t('premium_unlock_songs', 'Upgrade to Premium to see song names & open in Spotify/YouTube')}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#FFD700" />
        </TouchableOpacity>
      )}

      {/* Song list */}
      <FlatList
        data={entries}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={entries.length === 0 ? styles.emptyListContainer : styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Premium Paywall */}
      <PremiumPaywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        mode="premium"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0F',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Ubuntu-Bold',
    color: '#FFF',
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  premiumBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Ubuntu-Medium',
    color: '#FFD700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Ubuntu-Bold',
    color: '#FFF',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Ubuntu-Regular',
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1C',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  songInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  songIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,65,153,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  songDetails: {
    flex: 1,
  },
  songTitle: {
    fontSize: 15,
    fontFamily: 'Ubuntu-Bold',
    color: '#FFF',
  },
  songArtist: {
    fontSize: 13,
    fontFamily: 'Ubuntu-Regular',
    color: '#AAA',
    marginTop: 1,
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  stationName: {
    fontSize: 12,
    fontFamily: 'Ubuntu-Regular',
    color: '#666',
    flex: 1,
  },
  timeAgo: {
    fontSize: 11,
    fontFamily: 'Ubuntu-Regular',
    color: '#555',
  },
  actionBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,215,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

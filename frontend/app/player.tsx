import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
  Platform,
  PanResponder,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAudioPlayer } from '../src/hooks/useAudioPlayer';
import { usePlayerStore } from '../src/store/playerStore';
import { useRecentlyPlayedStore } from '../src/store/recentlyPlayedStore';
import { useSimilarStations, usePopularStations } from '../src/hooks/useQueries';
import { useAuthStore } from '../src/store/authStore';
import { useFavoritesStore } from '../src/store/favoritesStore';
import { CarModeScreen } from '../src/components/CarModeScreen';
import { ShareModal } from '../src/components/ShareModal';
import { SleepTimerModal, SleepCounterModal } from '../src/components/SleepTimerModal';
import { GlowEffect } from '../src/components/GlowEffect';
import { PlayerOptionsSheet } from '../src/components/PlayerOptionsSheet';
import CastModal from '../src/components/CastModal';
import type { Station } from '../src/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FALLBACK_LOGO = require('../assets/megaradio-icon.png');
const DISMISS_THRESHOLD = 150; // Minimum swipe distance to dismiss
// 3 column grid calculation
const LOGO_SIZE = 190;
const GRID_PADDING = 16;
const GRID_GAP = 12;
const GRID_ITEM_WIDTH = Math.floor((SCREEN_WIDTH - (GRID_PADDING * 2) - (GRID_GAP * 2)) / 3);

// Custom Icon Components
const ShareIcon = ({ size = 24, color = '#888888' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ 
      width: size * 0.35, 
      height: size * 0.35, 
      backgroundColor: color, 
      borderRadius: size,
      position: 'absolute',
      left: 0,
      top: '50%',
      marginTop: -size * 0.175,
    }} />
    <View style={{ 
      width: size * 0.3, 
      height: size * 0.3, 
      backgroundColor: color, 
      borderRadius: size,
      position: 'absolute',
      right: 0,
      top: size * 0.1,
    }} />
    <View style={{ 
      width: size * 0.3, 
      height: size * 0.3, 
      backgroundColor: color, 
      borderRadius: size,
      position: 'absolute',
      right: 0,
      bottom: size * 0.1,
    }} />
    <View style={{ 
      width: size * 0.4, 
      height: 2, 
      backgroundColor: color, 
      position: 'absolute',
      transform: [{ rotate: '-35deg' }],
      left: size * 0.2,
      top: size * 0.3,
    }} />
    <View style={{ 
      width: size * 0.4, 
      height: 2, 
      backgroundColor: color, 
      position: 'absolute',
      transform: [{ rotate: '35deg' }],
      left: size * 0.2,
      bottom: size * 0.3,
    }} />
  </View>
);

const LockRadioIcon = ({ size = 24, color = '#888888' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    {/* Lock shackle */}
    <View style={{ 
      width: size * 0.5, 
      height: size * 0.35, 
      borderWidth: 2.5, 
      borderBottomWidth: 0,
      borderColor: color, 
      borderRadius: size * 0.25,
      position: 'absolute',
      top: 0,
    }} />
    {/* Lock body */}
    <View style={{ 
      width: size * 0.7, 
      height: size * 0.5, 
      backgroundColor: color, 
      borderRadius: 4,
      position: 'absolute',
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      {/* Lock hole */}
      <View style={{ 
        width: size * 0.15, 
        height: size * 0.15, 
        backgroundColor: '#0D1B1E', 
        borderRadius: size,
      }} />
    </View>
  </View>
);

const BroadcastIcon = ({ size = 24, color = '#888888' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    {/* Outer arc */}
    <View style={{ 
      width: size * 0.9, 
      height: size * 0.5, 
      borderWidth: 2, 
      borderBottomWidth: 0,
      borderColor: color, 
      borderRadius: size * 0.45,
      position: 'absolute',
      top: size * 0.05,
    }} />
    {/* Middle arc */}
    <View style={{ 
      width: size * 0.6, 
      height: size * 0.35, 
      borderWidth: 2, 
      borderBottomWidth: 0,
      borderColor: color, 
      borderRadius: size * 0.3,
      position: 'absolute',
      top: size * 0.2,
    }} />
    {/* Center dot */}
    <View style={{ 
      width: size * 0.2, 
      height: size * 0.2, 
      backgroundColor: color, 
      borderRadius: size,
      position: 'absolute',
      top: size * 0.4,
    }} />
    {/* Base */}
    <View style={{ 
      width: size * 0.35, 
      height: size * 0.25, 
      backgroundColor: color, 
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
      position: 'absolute',
      bottom: 0,
    }} />
  </View>
);

// Animated Equalizer Bars component
const EqualizerBars = React.memo(() => {
  const bar1 = useRef(new Animated.Value(6)).current;
  const bar2 = useRef(new Animated.Value(12)).current;
  const bar3 = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    const animate = (val: Animated.Value, min: number, max: number, dur: number) => {
      const loop = () => {
        Animated.sequence([
          Animated.timing(val, { toValue: max, duration: dur, useNativeDriver: false }),
          Animated.timing(val, { toValue: min, duration: dur * 0.8, useNativeDriver: false }),
        ]).start(loop);
      };
      loop();
    };
    animate(bar1, 4, 16, 400);
    animate(bar2, 6, 20, 350);
    animate(bar3, 3, 14, 450);
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 20, marginBottom: 6 }}>
      <Animated.View style={{ width: 4, backgroundColor: '#FF4199', borderRadius: 2, height: bar1 }} />
      <Animated.View style={{ width: 4, backgroundColor: '#FF4199', borderRadius: 2, height: bar2 }} />
      <Animated.View style={{ width: 4, backgroundColor: '#FF4199', borderRadius: 2, height: bar3 }} />
    </View>
  );
});

// GridItem extracted OUTSIDE PlayerScreen to prevent unmount/remount on re-render
const GridItem = React.memo(({
  station,
  onPress,
  getLogoUrl,
  itemWidth,
}: {
  station: Station;
  onPress: (station: Station) => void;
  getLogoUrl: (station: Station) => string | null;
  itemWidth: number;
}) => {
  const stationLogo = getLogoUrl(station);

  return (
    <TouchableOpacity
      style={[styles.gridItem, { width: itemWidth }]}
      onPress={() => onPress(station)}
      activeOpacity={0.7}
      delayPressIn={0}
      data-testid={`grid-item-${station._id}`}
    >
      <View style={[styles.gridImageWrapper, { width: itemWidth, height: itemWidth }]}>
        {stationLogo ? (
          <Image
            source={{ uri: stationLogo }}
            style={styles.gridImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.gridImage, styles.gridPlaceholder]}>
            <Ionicons name="radio" size={24} color="#666" />
          </View>
        )}
      </View>
      <Text style={styles.gridStationName} numberOfLines={1}>
        {station.name}
      </Text>
      <Text style={styles.gridStationLocation} numberOfLines={1}>
        {station.country || 'Radio'}
      </Text>
    </TouchableOpacity>
  );
});

export default function PlayerScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, token } = useAuthStore();
  const [showCarMode, setShowCarMode] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [showSleepCounter, setShowSleepCounter] = useState(false);
  const [showCastModal, setShowCastModal] = useState(false);
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  const sleepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const insets = useSafeAreaInsets();
  
  const {
    currentStation,
    playbackState,
    nowPlaying,
    sleepTimerActive,
    sleepTimerRemaining,
    startSleepTimer,
    cancelSleepTimer,
  } = usePlayerStore();

  const { stations: recentStations, addStation: addRecentStation, loadFromStorage: loadRecent } = useRecentlyPlayedStore();

  // Load recent stations on mount
  useEffect(() => { loadRecent(); }, []);

  const { playStation, togglePlayPause, stopPlayback } = useAudioPlayer();
  
  // Fetch data with refetchOnWindowFocus disabled to prevent flickering
  const { data: similarData } = useSimilarStations(currentStation?._id || '', 9);
  const { data: popularData } = usePopularStations(undefined, 12);

  // Handle cast button - requires login
  const handleCastPress = () => {
    if (!isAuthenticated) {
      // Player modal'ı kapat ve full-screen login'e git
      router.dismiss(); // Modal'ı kapat
      setTimeout(() => {
        router.push('/auth-options');
      }, 100);
      return;
    }
    setShowCastModal(true);
  };

  // Use favoritesStore for guest/authenticated favorites
  const { isFavorite: checkIsFavorite, toggleFavorite } = useFavoritesStore();
  const [checkingFavorite, setCheckingFavorite] = useState(false);
  
  // Check if current station is favorited
  const isFavorite = currentStation ? checkIsFavorite(currentStation._id) : false;

  // Play next station from similar stations
  const handleNextStation = useCallback(() => {
    const similarStations = similarData?.data || similarData || [];
    if (similarStations.length > 0) {
      // Pick a random station from similar stations
      const randomIndex = Math.floor(Math.random() * similarStations.length);
      const nextStation = similarStations[randomIndex];
      console.log('[Player] Playing next station:', nextStation?.name);
      if (nextStation) {
        playStation(nextStation);
        addRecentStation(nextStation);
      }
    }
  }, [similarData, playStation, addRecentStation]);

  // Play previous station from recently played
  const handlePreviousStation = useCallback(() => {
    // Find the station before the current one in recent history
    const currentIndex = recentStations.findIndex(s => s._id === currentStation?._id);
    if (currentIndex > 0) {
      // Play the previous station in history
      const prevStation = recentStations[currentIndex - 1];
      console.log('[Player] Playing previous station:', prevStation?.name);
      playStation(prevStation);
    } else {
      // No previous station, play random from similar
      const similarStations = similarData?.data || similarData || [];
      if (similarStations.length > 0) {
        const randomIndex = Math.floor(Math.random() * similarStations.length);
        const randomStation = similarStations[randomIndex];
        console.log('[Player] No previous, playing random similar:', randomStation?.name);
        if (randomStation) {
          playStation(randomStation);
          addRecentStation(randomStation);
        }
      }
    }
  }, [recentStations, currentStation, similarData, playStation, addRecentStation]);

  const handleClose = () => {
    router.back();
  };

  const handleToggleFavorite = async () => {
    if (!currentStation) return;
    
    setCheckingFavorite(true);
    try {
      await toggleFavorite(currentStation);
    } catch (error) {
      console.error('Toggle favorite error:', error);
    } finally {
      setCheckingFavorite(false);
    }
  };

  // Handle station press - ALWAYS stops current and plays new
  // Add to recently played when a station starts playing
  useEffect(() => {
    if (currentStation && playbackState === 'playing') {
      addRecentStation(currentStation);
    }
  }, [currentStation?._id, playbackState]);

  const handleStationPress = useCallback(async (station: Station) => {
    console.log('[Player] Station pressed:', station.name, 'ID:', station._id);
    try {
      // Always call playStation - it handles stopping internally
      await playStation(station);
      console.log('[Player] playStation completed for:', station.name);
    } catch (error) {
      console.error('[Player] Failed to play station:', error);
    }
  }, [playStation]);

  // Sleep timer handler using global store
  const handleSleepTimerStart = useCallback((totalMinutes: number) => {
    startSleepTimer(totalMinutes, () => stopPlayback());
  }, [startSleepTimer, stopPlayback]);

  const isLoading = playbackState === 'loading' || playbackState === 'buffering';
  const isPlaying = playbackState === 'playing';

  const getLogoUrl = useCallback((station: Station) => {
    if (station.logoAssets?.webp192) {
      return `https://themegaradio.com/station-logos/${station.logoAssets.folder}/${station.logoAssets.webp192}`;
    }
    const raw = station.favicon || station.logo || null;
    if (raw && raw.startsWith('/')) return `https://themegaradio.com${raw}`;
    return raw;
  }, []);

  const logoUrl = currentStation ? getLogoUrl(currentStation) : null;
  
  // Memoize stations to prevent re-renders
  const popularStations = useMemo(() => {
    return popularData?.stations || (Array.isArray(popularData) ? popularData : []);
  }, [popularData]);
  
  const similarStations = useMemo(() => {
    const similar = similarData?.stations || (Array.isArray(similarData) ? similarData : []);
    return similar.filter((s: Station) => s._id !== currentStation?._id);
  }, [similarData, currentStation?._id]);
  
  const displaySimilarStations = useMemo(() => {
    if (similarStations.length > 0) return similarStations;
    return popularStations.filter((s: Station) => s._id !== currentStation?._id);
  }, [similarStations, popularStations, currentStation?._id]);

  // Get current song name - from nowPlaying metadata
  const getCurrentSongInfo = () => {
    // First try nowPlaying data
    if (nowPlaying?.title) {
      return nowPlaying.title;
    }
    if (nowPlaying?.song) {
      if (nowPlaying?.artist) {
        return `${nowPlaying.artist} - ${nowPlaying.song}`;
      }
      return nowPlaying.song;
    }
    if (nowPlaying?.artist) {
      return nowPlaying.artist;
    }
    // Fallback to genre/country
    if (currentStation?.genres?.[0]) {
      return currentStation.genres[0];
    }
    if (currentStation?.country) {
      return currentStation.country;
    }
    return t('live_radio', 'Live Radio');
  };

  if (!currentStation) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.emptyState}>
            <Ionicons name="radio-outline" size={64} color="#666" />
            <Text style={styles.emptyTitle}>No station playing</Text>
            <Text style={styles.emptyText}>Select a station to start listening</Text>
            <TouchableOpacity style={styles.goBackButton} onPress={handleClose}>
              <Text style={styles.goBackButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
                <Ionicons name="chevron-down" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.headerCenter}>
                <View style={styles.hdBadge}>
                  <Text style={styles.hdText}>HD</Text>
                </View>
                <Text style={styles.headerTitle} numberOfLines={1}>{currentStation.name}</Text>
              </View>
              <View style={styles.headerRight}>
                <TouchableOpacity 
                  style={styles.headerIcon} 
                  onPress={() => {
                    console.log('[Player] Car Mode button pressed');
                    setShowCarMode(true);
                  }}
                  accessibilityLabel="Car Mode"
                  accessibilityRole="button"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="car-outline" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.headerIcon}
                  onPress={() => setShowOptionsSheet(true)}
                >
                  <Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Album Art */}
          <View style={styles.artworkContainer}>
            <View style={{ width: LOGO_SIZE, height: LOGO_SIZE }}>
              <GlowEffect size={LOGO_SIZE + 120} top={-60} left={-60} opacity={0.45} />
              <View style={styles.artworkWrapper}>
              {logoUrl ? (
                <Image
                  source={{ uri: logoUrl }}
                  style={styles.artwork}
                  resizeMode="cover"
                />
              ) : (
                <Image
                  source={FALLBACK_LOGO}
                  style={styles.artwork}
                  resizeMode="cover"
                />
              )}
              {/* Live indicator bar */}
              <View style={styles.liveIndicator}>
                <View style={styles.liveIndicatorBar} />
              </View>
              {/* Country Flag */}
              {currentStation?.countryCode && (
                <View style={styles.countryFlagContainer}>
                  <Image
                    source={{ uri: `https://flagcdn.com/w40/${currentStation.countryCode.toLowerCase()}.png` }}
                    style={styles.countryFlag}
                    resizeMode="cover"
                  />
                </View>
              )}
            </View>
            </View>
          </View>

          {/* Now Playing Info */}
          <View style={styles.nowPlayingSection}>
            {/* Animated Equalizer Bars */}
            {isPlaying && <EqualizerBars />}
            <Text style={styles.stationName}>{currentStation.name}</Text>
            <Text style={styles.artistName}>{getCurrentSongInfo()}</Text>
            
            {/* Spotify & YouTube icons */}
            <View style={styles.socialIcons}>
              <TouchableOpacity style={[styles.socialButton, styles.spotifyButton]}>
                <Ionicons name="musical-notes" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.socialButton, styles.youtubeButton]}>
                <Ionicons name="play-circle" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Controls */}
          <View style={styles.mainControls}>
            {/* Timer - different behavior based on timer state */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => {
                if (sleepTimerActive) {
                  setShowSleepCounter(true);
                } else {
                  setShowSleepTimer(true);
                }
              }}
              data-testid="player-sleep-timer-btn"
            >
              <View>
                <Ionicons
                  name="time-outline"
                  size={28}
                  color={sleepTimerActive ? '#FFFFFF' : '#888888'}
                />
                {sleepTimerActive && (
                  <View style={styles.timerOnBadge}>
                    <Text style={styles.timerOnText}>ON</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            
            {/* Previous */}
            <TouchableOpacity 
              style={styles.skipButton}
              onPress={handlePreviousStation}
            >
              <Ionicons name="play-skip-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            
            {/* Play/Pause */}
            <TouchableOpacity
              style={styles.playPauseButton}
              onPress={() => {
                console.log('[Player] Play/Pause pressed, playbackState:', playbackState);
                togglePlayPause();
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="large" color="#FFFFFF" />
              ) : isPlaying ? (
                <Ionicons name="pause" size={40} color="#FFFFFF" />
              ) : (
                <Ionicons name="play" size={40} color="#FFFFFF" style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>
            
            {/* Next */}
            <TouchableOpacity 
              style={styles.skipButton}
              onPress={handleNextStation}
            >
              <Ionicons name="play-skip-forward" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            
            {/* Heart */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleToggleFavorite}
              disabled={checkingFavorite}
            >
              <Ionicons 
                name={isFavorite ? 'heart' : 'heart-outline'} 
                size={28} 
                color={isFavorite ? '#FF4757' : '#888888'} 
              />
            </TouchableOpacity>
          </View>

          {/* Secondary Controls */}
          <View style={styles.secondaryControls}>
            <View style={styles.leftSecondaryControls}>
              {/* Share */}
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setShowShareModal(true)}
                data-testid="player-share-btn"
              >
                <Image 
                  source={require('../assets/icons/share-icon.png')} 
                  style={{ width: 24, height: 24, tintColor: '#888888' }} 
                  resizeMode="contain"
                />
              </TouchableOpacity>
              {/* Cast/Airplay */}
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={handleCastPress}
              >
                <Image 
                  source={require('../assets/icons/airplay-icon.png')} 
                  style={{ width: 24, height: 24, tintColor: '#888888' }} 
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Recently Played Section */}
          {recentStations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('recently_played', 'Recently Played')}
            </Text>
            <View style={styles.stationGrid}>
              {recentStations.slice(0, 6).map((station: Station, index: number) => (
                <GridItem
                  key={`recent-${station._id}-${index}`}
                  station={station}
                  onPress={handleStationPress}
                  getLogoUrl={getLogoUrl}
                  itemWidth={GRID_ITEM_WIDTH}
                />
              ))}
            </View>
          </View>
          )}

          {/* Similar Radios Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('similar_radios', 'Similar Radios')}
            </Text>
            <View style={styles.stationGrid}>
              {displaySimilarStations.slice(0, 9).map((station: Station, index: number) => (
                <GridItem
                  key={`similar-${station._id}-${index}`}
                  station={station}
                  onPress={handleStationPress}
                  getLogoUrl={getLogoUrl}
                  itemWidth={GRID_ITEM_WIDTH}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
      
      {/* Car Mode Modal */}
      <CarModeScreen
        visible={showCarMode}
        onClose={() => setShowCarMode(false)}
        stations={displaySimilarStations.length > 0 ? displaySimilarStations : popularStations}
      />

      {/* Share Modal */}
      <ShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        station={currentStation}
        nowPlayingTitle={getCurrentSongInfo()}
        getLogoUrl={getLogoUrl}
      />

      {/* Sleep Timer Modal */}
      <SleepTimerModal
        visible={showSleepTimer}
        onClose={() => setShowSleepTimer(false)}
        onStart={handleSleepTimerStart}
        isTimerActive={sleepTimerActive}
        remainingSeconds={sleepTimerRemaining}
        onCancel={cancelSleepTimer}
      />

      {/* Sleep Counter Modal (when timer is active) */}
      <SleepCounterModal
        visible={showSleepCounter}
        onClose={() => setShowSleepCounter(false)}
        remainingSeconds={sleepTimerRemaining}
        onStop={cancelSleepTimer}
      />
      
      {/* Cast Modal */}
      <CastModal
        visible={showCastModal}
        onClose={() => setShowCastModal(false)}
        currentStation={currentStation}
      />

      {/* Player Options Sheet */}
      <PlayerOptionsSheet
        visible={showOptionsSheet}
        onClose={() => setShowOptionsSheet(false)}
        station={currentStation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1B1E',
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Header
  headerContainer: {
    width: '100%',
    height: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  header: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  hdBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hdText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIcon: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Artwork
  artworkContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  artworkWrapper: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
    position: 'relative',
  },
  artwork: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  artworkPlaceholder: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  liveIndicatorBar: {
    width: 40,
    height: 6,
    backgroundColor: '#FF3B30',
    borderRadius: 3,
  },
  countryFlagContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  countryFlag: {
    width: '100%',
    height: '100%',
  },

  // Now Playing
  nowPlayingSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  animatedDots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotPink: {
    backgroundColor: '#FF4D8D',
  },
  stationName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  artistName: {
    fontSize: 16,
    color: '#888888',
    marginBottom: 16,
    textAlign: 'center',
  },
  socialIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  socialButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotifyButton: {
    backgroundColor: '#1DB954',
  },
  youtubeButton: {
    backgroundColor: '#FF0000',
  },

  // Main Controls
  mainControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  controlButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerOnBadge: {
    position: 'absolute',
    bottom: -4,
    right: -8,
    backgroundColor: '#4CD964',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timerOnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skipButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },

  // Secondary Controls
  secondaryControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  leftSecondaryControls: {
    flexDirection: 'row',
    gap: 24,
  },
  secondaryButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recDotOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recDotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF6B6B',
  },
  recText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Sections
  section: {
    paddingHorizontal: GRID_PADDING,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  stationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  // Grid Items
  gridItem: {
    width: GRID_ITEM_WIDTH,
    marginBottom: 16,
  },
  gridImageWrapper: {
    width: GRID_ITEM_WIDTH,
    height: GRID_ITEM_WIDTH,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
    marginBottom: 8,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
  },
  gridStationName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  gridStationLocation: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#888888',
    marginBottom: 24,
  },
  goBackButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  goBackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

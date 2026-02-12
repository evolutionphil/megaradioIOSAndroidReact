import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../store/playerStore';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { usePopularStations } from '../hooks/useQueries';
import type { Station } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.45;
const CARD_HEIGHT = CARD_WIDTH * 0.8;

interface CarModeScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const CarModeScreen: React.FC<CarModeScreenProps> = ({ visible, onClose }) => {
  const { currentStation, playbackState, nowPlaying } = usePlayerStore();
  const { playStation, togglePlayPause, setVolume } = useAudioPlayer();
  const { data: popularData } = usePopularStations(undefined, 10);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const isPlaying = playbackState === 'playing';
  const isLoading = playbackState === 'loading' || playbackState === 'buffering';

  const stations = popularData?.stations || (Array.isArray(popularData) ? popularData : []);

  const getLogoUrl = useCallback((station: Station) => {
    if (station.logoAssets?.webp192) {
      return `https://themegaradio.com/station-logos/${station.logoAssets.folder}/${station.logoAssets.webp192}`;
    }
    return station.favicon || station.logo || null;
  }, []);

  const handleVolumeChange = async (value: number) => {
    setVolumeState(value);
    if (!isMuted) {
      await setVolume(value);
    }
  };

  const handleMuteToggle = async () => {
    if (isMuted) {
      setIsMuted(false);
      await setVolume(volume);
    } else {
      setIsMuted(true);
      await setVolume(0);
    }
  };

  const handleStationSelect = async (station: Station) => {
    try {
      await playStation(station);
    } catch (error) {
      console.error('[CarMode] Failed to play station:', error);
    }
  };

  const getCurrentSongInfo = () => {
    if (nowPlaying?.title && nowPlaying?.artist) {
      return `${nowPlaying.artist} - ${nowPlaying.title}`;
    }
    if (nowPlaying?.title) return nowPlaying.title;
    if (nowPlaying?.song) return nowPlaying.song;
    if (currentStation?.genres?.[0]) return currentStation.genres[0];
    return 'Live Radio';
  };

  // Don't render if not visible
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Car Mode</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Station Carousel */}
        <View style={styles.carouselContainer}>
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
            snapToInterval={CARD_WIDTH + 12}
            decelerationRate="fast"
          >
            {stations.map((station: Station) => {
              const logo = getLogoUrl(station);
              const isActive = currentStation?._id === station._id;
              
              return (
                <TouchableOpacity
                  key={station._id}
                  style={[
                    styles.stationCard,
                    isActive && styles.stationCardActive,
                  ]}
                  onPress={() => handleStationSelect(station)}
                  activeOpacity={0.8}
                >
                  {logo ? (
                    <Image source={{ uri: logo }} style={styles.stationLogo} resizeMode="cover" />
                  ) : (
                    <View style={styles.stationLogoPlaceholder}>
                      <Text style={styles.placeholderText}>{station.name.charAt(0)}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Now Playing Info */}
        <View style={styles.nowPlayingInfo}>
          {/* Animated dots */}
          <View style={styles.animatedDots}>
            <View style={[styles.dot, styles.dotPink]} />
            <View style={[styles.dot, styles.dotPink]} />
            <View style={[styles.dot, styles.dotPink]} />
          </View>
          <Text style={styles.stationName}>{currentStation?.name || 'No Station'}</Text>
          <Text style={styles.songInfo}>{getCurrentSongInfo()}</Text>
        </View>

        {/* Main Controls */}
        <View style={styles.mainControls}>
          {/* Previous */}
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="play-skip-back" size={32} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Play/Pause */}
          <TouchableOpacity
            style={styles.playPauseButton}
            onPress={togglePlayPause}
            disabled={isLoading}
          >
            {isLoading ? (
              <Ionicons name="hourglass" size={36} color="#FFFFFF" />
            ) : isPlaying ? (
              <Ionicons name="pause" size={36} color="#FFFFFF" />
            ) : (
              <Ionicons name="play" size={36} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          {/* Next */}
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="play-skip-forward" size={32} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Volume Controls */}
        <View style={styles.volumeControls}>
          {/* Mute Button */}
          <TouchableOpacity style={styles.muteButton} onPress={handleMuteToggle}>
            <Ionicons 
              name={isMuted ? "volume-mute" : "volume-high"} 
              size={28} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>

          {/* Volume Slider */}
          <View style={styles.volumeSliderContainer}>
            <Ionicons name="volume-low" size={20} color="#888888" />
            <Slider
              style={styles.volumeSlider}
              minimumValue={0}
              maximumValue={1}
              value={isMuted ? 0 : volume}
              onValueChange={handleVolumeChange}
              minimumTrackTintColor="#FF4D8D"
              maximumTrackTintColor="#333333"
              thumbTintColor="#FF4D8D"
            />
            <Ionicons name="volume-high" size={20} color="#888888" />
          </View>
        </View>

        {/* REC Button */}
        <View style={styles.recContainer}>
          <TouchableOpacity style={styles.recButton}>
            <View style={styles.recDotOuter}>
              <View style={styles.recDotInner} />
            </View>
            <Text style={styles.recText}>REC</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0D0D0D',
    zIndex: 1000,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    backgroundColor: '#2A2A2A',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Carousel
  carouselContainer: {
    marginTop: 20,
    height: CARD_HEIGHT + 20,
  },
  carouselContent: {
    paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2 - 20,
    gap: 12,
  },
  stationCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  stationCardActive: {
    borderWidth: 2,
    borderColor: '#FF4D8D',
  },
  stationLogo: {
    width: '100%',
    height: '100%',
  },
  stationLogoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
  },
  placeholderText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#666',
  },

  // Now Playing
  nowPlayingInfo: {
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
  },
  animatedDots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotPink: {
    backgroundColor: '#FF4D8D',
  },
  stationName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  songInfo: {
    fontSize: 16,
    color: '#888888',
    marginTop: 4,
    textAlign: 'center',
  },

  // Main Controls
  mainControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    gap: 20,
  },
  controlButton: {
    width: 100,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    width: 100,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Volume Controls
  volumeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
    gap: 12,
  },
  muteButton: {
    width: 80,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  volumeSliderContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  volumeSlider: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
  },

  // REC Button
  recContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  recButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recDotOuter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recDotInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF6B6B',
  },
  recText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default CarModeScreen;

import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { usePlayerStore } from '../store/playerStore';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { usePopularStations } from '../hooks/useQueries';
import type { Station } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.45;
const CARD_HEIGHT = CARD_WIDTH * 0.8;

// Custom SVG-like Icons as components
const ShareIcon = ({ size = 24, color = '#888888' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={[styles.shareNode, { backgroundColor: color, width: size * 0.35, height: size * 0.35 }]} />
    <View style={[styles.shareLine1, { backgroundColor: color, width: size * 0.4, height: 2 }]} />
    <View style={[styles.shareNode2, { backgroundColor: color, width: size * 0.3, height: size * 0.3, top: -size * 0.15, right: -size * 0.1 }]} />
    <View style={[styles.shareLine2, { backgroundColor: color, width: size * 0.4, height: 2 }]} />
    <View style={[styles.shareNode3, { backgroundColor: color, width: size * 0.3, height: size * 0.3, bottom: -size * 0.15, right: -size * 0.1 }]} />
  </View>
);

const BroadcastIcon = ({ size = 24, color = '#888888' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={[styles.broadcastOuter, { borderColor: color, width: size * 0.9, height: size * 0.5 }]} />
    <View style={[styles.broadcastMiddle, { borderColor: color, width: size * 0.65, height: size * 0.35 }]} />
    <View style={[styles.broadcastDot, { backgroundColor: color, width: size * 0.25, height: size * 0.25 }]} />
    <View style={[styles.broadcastBase, { backgroundColor: color, width: size * 0.35, height: size * 0.25 }]} />
  </View>
);

const LockIcon = ({ size = 24, color = '#888888' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={[styles.lockShackle, { borderColor: color, width: size * 0.6, height: size * 0.4 }]} />
    <View style={[styles.lockBody, { backgroundColor: color, width: size * 0.75, height: size * 0.55 }]}>
      <View style={[styles.lockHole, { width: size * 0.2, height: size * 0.2 }]} />
    </View>
  </View>
);

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

  const currentLogo = currentStation ? getLogoUrl(currentStation) : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Car Mode</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
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
              {stations.map((station, index) => {
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
              <View style={styles.prevNextIcon}>
                <View style={styles.prevBar} />
                <View style={styles.prevTriangle} />
              </View>
            </TouchableOpacity>

            {/* Play/Pause */}
            <TouchableOpacity
              style={styles.playPauseButton}
              onPress={togglePlayPause}
              disabled={isLoading}
            >
              {isPlaying ? (
                <View style={styles.pauseIcon}>
                  <View style={styles.pauseBar} />
                  <View style={styles.pauseBar} />
                </View>
              ) : (
                <View style={styles.playIcon} />
              )}
            </TouchableOpacity>

            {/* Next */}
            <TouchableOpacity style={styles.controlButton}>
              <View style={styles.prevNextIcon}>
                <View style={styles.nextTriangle} />
                <View style={styles.nextBar} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Volume Controls */}
          <View style={styles.volumeControls}>
            {/* Mute Button */}
            <TouchableOpacity style={styles.muteButton} onPress={handleMuteToggle}>
              <View style={styles.muteIcon}>
                <View style={styles.speakerBody} />
                <View style={styles.speakerCone} />
                {isMuted && <View style={styles.muteX} />}
              </View>
            </TouchableOpacity>

            {/* Volume Slider */}
            <View style={styles.volumeSliderContainer}>
              <View style={styles.volumeIconSmall}>
                <View style={styles.speakerBodySmall} />
                <View style={styles.speakerConeSmall} />
              </View>
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
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
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
    transform: [{ scale: 1.05 }],
    shadowColor: '#FF4D8D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
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
  prevNextIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  prevBar: {
    width: 4,
    height: 24,
    backgroundColor: '#FFFFFF',
  },
  prevTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderRightWidth: 20,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#FFFFFF',
  },
  nextTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftWidth: 20,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
  },
  nextBar: {
    width: 4,
    height: 24,
    backgroundColor: '#FFFFFF',
  },
  pauseIcon: {
    flexDirection: 'row',
    gap: 8,
  },
  pauseBar: {
    width: 8,
    height: 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  playIcon: {
    width: 0,
    height: 0,
    borderTopWidth: 14,
    borderBottomWidth: 14,
    borderLeftWidth: 24,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
    marginLeft: 4,
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
    width: 100,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speakerBody: {
    width: 12,
    height: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  speakerCone: {
    width: 0,
    height: 0,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
  },
  muteX: {
    position: 'absolute',
    width: 24,
    height: 2,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
    right: -8,
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
  volumeIconSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  speakerBodySmall: {
    width: 8,
    height: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  speakerConeSmall: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
  },
  volumeSlider: {
    flex: 1,
    height: 40,
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

  // Custom Icon Styles
  shareNode: {
    borderRadius: 100,
    position: 'absolute',
    left: 0,
  },
  shareLine1: {
    position: 'absolute',
    transform: [{ rotate: '-45deg' }],
  },
  shareNode2: {
    borderRadius: 100,
    position: 'absolute',
  },
  shareLine2: {
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
  },
  shareNode3: {
    borderRadius: 100,
    position: 'absolute',
  },
  broadcastOuter: {
    borderWidth: 2,
    borderRadius: 100,
    borderBottomWidth: 0,
    position: 'absolute',
    top: 0,
  },
  broadcastMiddle: {
    borderWidth: 2,
    borderRadius: 100,
    borderBottomWidth: 0,
    position: 'absolute',
    top: '15%',
  },
  broadcastDot: {
    borderRadius: 100,
    position: 'absolute',
  },
  broadcastBase: {
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  lockShackle: {
    borderWidth: 3,
    borderBottomWidth: 0,
    borderRadius: 100,
    position: 'absolute',
    top: 0,
  },
  lockBody: {
    position: 'absolute',
    bottom: 0,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockHole: {
    backgroundColor: '#0D0D0D',
    borderRadius: 100,
  },
});

export default CarModeScreen;

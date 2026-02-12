import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { usePlayerStore } from '../store/playerStore';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { usePopularStations } from '../hooks/useQueries';
import type { Station } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Card sizes based on Figma specs
const CENTER_CARD_SIZE = 177;
const SIDE_CARD_SIZE = 140;
const CARD_GAP = 12;

// Control button size
const CONTROL_BUTTON_SIZE = 100;

interface CarModeScreenProps {
  visible: boolean;
  onClose: () => void;
}

// Custom Play Icon with bar
const PrevIcon = () => (
  <View style={iconStyles.container}>
    <View style={iconStyles.prevBar} />
    <View style={iconStyles.prevTriangle} />
  </View>
);

// Custom Pause Icon
const PauseIcon = () => (
  <View style={iconStyles.pauseContainer}>
    <View style={iconStyles.pauseBar} />
    <View style={iconStyles.pauseBar} />
  </View>
);

// Custom Play Icon
const PlayIcon = () => (
  <View style={iconStyles.playTriangle} />
);

// Custom Next Icon with bar
const NextIcon = () => (
  <View style={iconStyles.container}>
    <View style={iconStyles.nextTriangle} />
    <View style={iconStyles.nextBar} />
  </View>
);

// Mute Icon
const MuteIcon = () => (
  <View style={iconStyles.muteContainer}>
    <View style={iconStyles.speakerBody} />
    <View style={iconStyles.speakerCone} />
    <Text style={iconStyles.muteX}>×</Text>
  </View>
);

// Volume Icon
const VolumeIcon = () => (
  <View style={iconStyles.volumeContainer}>
    <View style={iconStyles.speakerBodySmall} />
    <View style={iconStyles.speakerConeSmall} />
    <View style={iconStyles.soundWaves}>
      <View style={iconStyles.soundWave1} />
      <View style={iconStyles.soundWave2} />
    </View>
  </View>
);

const iconStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevBar: {
    width: 6,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    marginRight: 8,
  },
  prevTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 22,
    borderBottomWidth: 22,
    borderRightWidth: 36,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#FFFFFF',
  },
  pauseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pauseBar: {
    width: 14,
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 25,
    borderBottomWidth: 25,
    borderLeftWidth: 42,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
    marginLeft: 8,
  },
  nextTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 22,
    borderBottomWidth: 22,
    borderLeftWidth: 36,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
  },
  nextBar: {
    width: 6,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    marginLeft: 8,
  },
  muteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speakerBody: {
    width: 14,
    height: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  speakerCone: {
    width: 0,
    height: 0,
    borderTopWidth: 14,
    borderBottomWidth: 14,
    borderLeftWidth: 14,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
  },
  muteX: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '300',
    marginLeft: 4,
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speakerBodySmall: {
    width: 10,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  speakerConeSmall: {
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
  },
  soundWaves: {
    marginLeft: 4,
  },
  soundWave1: {
    width: 6,
    height: 14,
    borderWidth: 2,
    borderLeftWidth: 0,
    borderColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 2,
  },
  soundWave2: {
    width: 10,
    height: 20,
    borderWidth: 2,
    borderLeftWidth: 0,
    borderColor: '#FFFFFF',
    borderRadius: 12,
    position: 'absolute',
    left: 2,
    top: -3,
  },
});

export const CarModeScreen: React.FC<CarModeScreenProps> = ({ visible, onClose }) => {
  const { currentStation, playbackState, nowPlaying } = usePlayerStore();
  const { playStation, togglePlayPause, setVolume } = useAudioPlayer();
  const { data: popularData } = usePopularStations(undefined, 10);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const isPlaying = playbackState === 'playing';
  const isLoading = playbackState === 'loading' || playbackState === 'buffering';

  const stations = useMemo(() => {
    const data = popularData?.stations || (Array.isArray(popularData) ? popularData : []);
    return data.slice(0, 10);
  }, [popularData]);

  // Find current station index in list
  useEffect(() => {
    if (currentStation && stations.length > 0) {
      const idx = stations.findIndex(s => s._id === currentStation._id);
      if (idx !== -1) {
        setCurrentIndex(idx);
      }
    }
  }, [currentStation, stations]);

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

  const handleStationSelect = async (station: Station, index: number) => {
    try {
      setCurrentIndex(index);
      await playStation(station);
    } catch (error) {
      console.error('[CarMode] Failed to play station:', error);
    }
  };

  const handlePrev = async () => {
    if (stations.length === 0) return;
    const newIndex = currentIndex > 0 ? currentIndex - 1 : stations.length - 1;
    await handleStationSelect(stations[newIndex], newIndex);
  };

  const handleNext = async () => {
    if (stations.length === 0) return;
    const newIndex = currentIndex < stations.length - 1 ? currentIndex + 1 : 0;
    await handleStationSelect(stations[newIndex], newIndex);
  };

  const getCurrentSongInfo = () => {
    if (nowPlaying?.artist && nowPlaying?.title) {
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

  // Get visible stations (prev, current, next)
  const getVisibleStations = () => {
    if (stations.length === 0) return [];
    
    const result = [];
    const prevIdx = currentIndex > 0 ? currentIndex - 1 : stations.length - 1;
    const nextIdx = currentIndex < stations.length - 1 ? currentIndex + 1 : 0;
    
    // Add more stations for scrolling effect
    const prevPrevIdx = prevIdx > 0 ? prevIdx - 1 : stations.length - 1;
    const nextNextIdx = nextIdx < stations.length - 1 ? nextIdx + 1 : 0;
    
    result.push({ station: stations[prevPrevIdx], position: 'far-left', index: prevPrevIdx });
    result.push({ station: stations[prevIdx], position: 'left', index: prevIdx });
    result.push({ station: stations[currentIndex], position: 'center', index: currentIndex });
    result.push({ station: stations[nextIdx], position: 'right', index: nextIdx });
    result.push({ station: stations[nextNextIdx], position: 'far-right', index: nextNextIdx });
    
    return result;
  };

  const visibleStations = getVisibleStations();

  return (
    <View style={styles.overlay}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Car Mode</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>

        {/* Station Carousel - Center current with prev/next visible */}
        <View style={styles.carouselContainer}>
          <View style={styles.carouselInner}>
            {visibleStations.map((item, idx) => {
              const logo = getLogoUrl(item.station);
              const isCenter = item.position === 'center';
              const isSide = item.position === 'left' || item.position === 'right';
              const isFar = item.position === 'far-left' || item.position === 'far-right';
              
              const cardSize = isCenter ? CENTER_CARD_SIZE : SIDE_CARD_SIZE;
              const opacity = isFar ? 0.3 : isSide ? 0.7 : 1;
              const scale = isCenter ? 1 : isSide ? 0.85 : 0.7;
              
              return (
                <TouchableOpacity
                  key={`${item.station._id}-${idx}`}
                  style={[
                    styles.stationCard,
                    {
                      width: cardSize,
                      height: cardSize,
                      opacity,
                      transform: [{ scale }],
                      zIndex: isCenter ? 10 : isSide ? 5 : 1,
                    },
                    isCenter && styles.centerCard,
                  ]}
                  onPress={() => handleStationSelect(item.station, item.index)}
                  activeOpacity={0.9}
                >
                  {logo ? (
                    <Image source={{ uri: logo }} style={styles.stationLogo} resizeMode="cover" />
                  ) : (
                    <View style={styles.stationLogoPlaceholder}>
                      <Text style={styles.placeholderText}>{item.station.name.charAt(0)}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Animated Playing Indicator */}
        <View style={styles.playingIndicator}>
          <View style={[styles.indicatorBar, styles.bar1]} />
          <View style={[styles.indicatorBar, styles.bar2]} />
          <View style={[styles.indicatorBar, styles.bar3]} />
        </View>

        {/* Now Playing Info */}
        <View style={styles.nowPlayingInfo}>
          <Text style={styles.stationName}>{currentStation?.name || 'No Station'}</Text>
          <Text style={styles.songInfo}>{getCurrentSongInfo()}</Text>
        </View>

        {/* Main Controls */}
        <View style={styles.mainControls}>
          {/* Previous */}
          <TouchableOpacity style={styles.controlButton} onPress={handlePrev}>
            <PrevIcon />
          </TouchableOpacity>

          {/* Play/Pause */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={togglePlayPause}
            disabled={isLoading}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </TouchableOpacity>

          {/* Next */}
          <TouchableOpacity style={styles.controlButton} onPress={handleNext}>
            <NextIcon />
          </TouchableOpacity>
        </View>

        {/* Volume Controls */}
        <View style={styles.volumeControls}>
          {/* Mute Button */}
          <TouchableOpacity style={styles.muteButton} onPress={handleMuteToggle}>
            <MuteIcon />
          </TouchableOpacity>

          {/* Volume Slider */}
          <View style={styles.volumeSliderContainer}>
            <VolumeIcon />
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
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },

  // Carousel with centered current station
  carouselContainer: {
    marginTop: 30,
    height: CENTER_CARD_SIZE + 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    marginHorizontal: 6,
  },
  centerCard: {
    // Purple glow shadow - Figma: box-shadow: 0px 21.71px 81.43px 14.11px #7B61FF4D
    ...Platform.select({
      ios: {
        shadowColor: '#7B61FF',
        shadowOffset: { width: 0, height: 22 },
        shadowOpacity: 0.3,
        shadowRadius: 40,
      },
      android: {
        elevation: 20,
      },
    }),
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
    fontSize: 48,
    fontWeight: '700',
    color: '#666',
  },

  // Playing indicator bars
  playingIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginTop: 24,
    height: 24,
    gap: 4,
  },
  indicatorBar: {
    width: 6,
    backgroundColor: '#FF4D8D',
    borderRadius: 3,
  },
  bar1: {
    height: 12,
  },
  bar2: {
    height: 20,
  },
  bar3: {
    height: 14,
  },

  // Now Playing
  nowPlayingInfo: {
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 24,
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
    marginTop: 6,
    textAlign: 'center',
  },

  // Main Controls
  mainControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 36,
    gap: 16,
    paddingHorizontal: 20,
  },
  controlButton: {
    width: CONTROL_BUTTON_SIZE,
    height: 85,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Volume Controls
  volumeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    paddingHorizontal: 24,
    gap: 12,
  },
  muteButton: {
    width: 100,
    height: 65,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  volumeSliderContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 65,
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    paddingHorizontal: 20,
  },
  volumeSlider: {
    flex: 1,
    height: 40,
    marginLeft: 12,
  },

  // REC Button
  recContainer: {
    alignItems: 'center',
    marginTop: 36,
  },
  recButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recDotOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recDotInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF6B6B',
  },
  recText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default CarModeScreen;

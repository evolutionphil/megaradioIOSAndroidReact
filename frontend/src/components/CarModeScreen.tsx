import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Carousel from 'react-native-reanimated-carousel';
import Animated, {
  interpolate,
  useAnimatedStyle,
  Extrapolation,
} from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import { useFonts } from 'expo-font';
import { usePlayerStore } from '../store/playerStore';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { usePopularStations } from '../hooks/useQueries';
import type { Station } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Carousel layout constants (from Figma: center card 150px, adjacent 126px, far 96px)
const CAROUSEL_ITEM_WIDTH = 80;
const CARD_SIZE = 150;
const CARD_RADIUS = 15;

interface CarModeScreenProps {
  visible: boolean;
  onClose: () => void;
}

// Animated carousel item - each item gets an animationValue from the carousel
const CarouselStationItem = React.memo(({
  station,
  animationValue,
  getLogoUrl,
}: {
  station: Station;
  animationValue: any;
  getLogoUrl: (s: Station) => string | null;
}) => {
  const logo = getLogoUrl(station);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      animationValue.value,
      [-2, -1, 0, 1, 2],
      [0.64, 0.84, 1.0, 0.84, 0.64],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      animationValue.value,
      [-2, -1, 0, 1, 2],
      [0.8, 1.0, 1.0, 1.0, 0.8],
      Extrapolation.CLAMP
    );
    const zIdx = interpolate(
      animationValue.value,
      [-2, -1, 0, 1, 2],
      [1, 5, 10, 5, 1],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ scale }],
      opacity,
      zIndex: Math.round(zIdx),
    };
  });

  return (
    <View style={itemStyles.container}>
      <Animated.View style={[itemStyles.card, animatedStyle]}>
        {logo ? (
          <Image source={{ uri: logo }} style={itemStyles.logo} resizeMode="cover" />
        ) : (
          <View style={itemStyles.placeholder}>
            <Text style={itemStyles.placeholderText}>
              {station.name?.charAt(0) || '?'}
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
});

const itemStyles = StyleSheet.create({
  container: {
    width: CAROUSEL_ITEM_WIDTH,
    height: CARD_SIZE + 40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#7B61FF',
        shadowOffset: { width: 0, height: 22 },
        shadowOpacity: 0.3,
        shadowRadius: 40,
      },
      android: {
        elevation: 15,
      },
    }),
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
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
});

export const CarModeScreen: React.FC<CarModeScreenProps> = ({ visible, onClose }) => {
  const { currentStation, playbackState, nowPlaying } = usePlayerStore();
  const { playStation, togglePlayPause, setVolume } = useAudioPlayer();
  const { data: popularData } = usePopularStations(undefined, 15);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const carouselRef = useRef<any>(null);

  const [fontsLoaded] = useFonts({
    'Ubuntu-Bold': require('../../assets/fonts/Ubuntu-Bold.ttf'),
  });

  const isPlaying = playbackState === 'playing';
  const isLoading = playbackState === 'loading' || playbackState === 'buffering';

  const stations = useMemo(() => {
    const data = popularData?.stations || (Array.isArray(popularData) ? popularData : []);
    return data.slice(0, 15);
  }, [popularData]);

  // Scroll carousel to current station when data loads
  useEffect(() => {
    if (visible && currentStation && stations.length > 0 && carouselRef.current) {
      const idx = stations.findIndex((s: Station) => s._id === currentStation._id);
      if (idx !== -1) {
        setTimeout(() => {
          carouselRef.current?.scrollTo({ index: idx, animated: false });
        }, 100);
      }
    }
  }, [visible, stations, currentStation]);

  const getLogoUrl = useCallback((station: Station) => {
    if (station.logoAssets?.webp192) {
      return `https://themegaradio.com/station-logos/${(station.logoAssets as any).folder}/${station.logoAssets.webp192}`;
    }
    return station.favicon || station.logo || null;
  }, []);

  const handleSnapToItem = useCallback((index: number) => {
    const station = stations[index];
    if (station && station._id !== currentStation?._id) {
      playStation(station);
    }
  }, [stations, currentStation, playStation]);

  const handlePrev = useCallback(() => {
    carouselRef.current?.prev();
  }, []);

  const handleNext = useCallback(() => {
    carouselRef.current?.next();
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

  const getCurrentSongInfo = () => {
    if (nowPlaying?.title && nowPlaying?.station) {
      return `${nowPlaying.title}`;
    }
    if (nowPlaying?.title) return nowPlaying.title;
    if (currentStation?.genres?.[0]) return currentStation.genres[0];
    return 'Live Radio';
  };

  if (!visible) return null;

  const initialIndex = (() => {
    if (currentStation && stations.length > 0) {
      const idx = stations.findIndex((s: Station) => s._id === currentStation._id);
      return idx !== -1 ? idx : 0;
    }
    return 0;
  })();

  return (
    <View style={styles.overlay} data-testid="car-mode-screen">
      <StatusBar barStyle="light-content" backgroundColor="#1B1C1E" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, fontsLoaded && { fontFamily: 'Ubuntu-Bold' }]}>
            Car Mode
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            data-testid="car-mode-close-btn"
          >
            <Text style={[styles.closeText, fontsLoaded && { fontFamily: 'Ubuntu-Bold' }]}>
              Close
            </Text>
          </TouchableOpacity>
        </View>

        {/* Station Carousel */}
        {stations.length > 0 ? (
          <View style={styles.carouselWrapper}>
            <Carousel
              ref={carouselRef}
              width={CAROUSEL_ITEM_WIDTH}
              height={CARD_SIZE + 40}
              data={stations}
              loop
              defaultIndex={initialIndex}
              style={styles.carousel}
              onSnapToItem={handleSnapToItem}
              renderItem={({ item, animationValue }: any) => (
                <CarouselStationItem
                  station={item}
                  animationValue={animationValue}
                  getLogoUrl={getLogoUrl}
                />
              )}
            />
          </View>
        ) : (
          <View style={styles.carouselPlaceholder}>
            <Text style={styles.loadingText}>Loading stations...</Text>
          </View>
        )}

        {/* Equalizer bars */}
        <View style={styles.equalizer}>
          <View style={[styles.eqBar, { height: 20 }]} />
          <View style={[styles.eqBar, { height: 14 }]} />
          <View style={[styles.eqBar, { height: 17 }]} />
        </View>

        {/* Station name + Song info */}
        <View style={styles.nowPlaying}>
          <Text
            style={[styles.stationName, fontsLoaded && { fontFamily: 'Ubuntu-Bold' }]}
            numberOfLines={1}
            data-testid="car-mode-station-name"
          >
            {currentStation?.name || 'No Station'}
          </Text>
          <Text style={styles.songInfo} numberOfLines={1}>
            {getCurrentSongInfo()}
          </Text>
        </View>

        {/* Main Controls: Prev | Play/Pause | Next */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={handlePrev}
            data-testid="car-mode-prev-btn"
          >
            <View style={styles.iconRow}>
              <View style={styles.prevBar} />
              <View style={styles.prevTriangle} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={togglePlayPause}
            disabled={isLoading}
            data-testid="car-mode-playpause-btn"
          >
            {isPlaying ? (
              <View style={styles.pauseIconRow}>
                <View style={styles.pauseBar} />
                <View style={styles.pauseBar} />
              </View>
            ) : (
              <View style={styles.playTriangle} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={handleNext}
            data-testid="car-mode-next-btn"
          >
            <View style={styles.iconRow}>
              <View style={styles.nextTriangle} />
              <View style={styles.nextBar} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Volume: Mute | Slider */}
        <View style={styles.volumeRow}>
          <TouchableOpacity
            style={styles.muteBtn}
            onPress={handleMuteToggle}
            data-testid="car-mode-mute-btn"
          >
            <View style={styles.speakerIcon}>
              <View style={styles.speakerBody} />
              <View style={styles.speakerCone} />
              {isMuted && <Text style={styles.muteX}>x</Text>}
            </View>
          </TouchableOpacity>

          <View style={styles.volumeSliderBox}>
            <View style={styles.speakerIconSmall}>
              <View style={styles.speakerBodySmall} />
              <View style={styles.speakerConeSmall} />
              <View style={styles.soundWave} />
            </View>
            <Slider
              style={styles.volumeSlider}
              minimumValue={0}
              maximumValue={1}
              value={isMuted ? 0 : volume}
              onValueChange={handleVolumeChange}
              minimumTrackTintColor="#FF4199"
              maximumTrackTintColor="#373737"
              thumbTintColor="#FF4199"
            />
          </View>
        </View>

        {/* REC Button */}
        <View style={styles.recContainer}>
          <TouchableOpacity style={styles.recButton} data-testid="car-mode-rec-btn">
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
    backgroundColor: '#1B1C1E',
    zIndex: 1000,
  },
  safeArea: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    backgroundColor: '#2F2F2F',
    paddingHorizontal: 21,
    paddingVertical: 14,
    borderRadius: 25,
  },
  closeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // Carousel
  carouselWrapper: {
    marginTop: 20,
    height: CARD_SIZE + 40,
    alignItems: 'center',
    overflow: 'visible',
  },
  carousel: {
    width: SCREEN_WIDTH,
    overflow: 'visible',
  },
  carouselPlaceholder: {
    height: CARD_SIZE + 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#888',
  },

  // Equalizer
  equalizer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginTop: 16,
    height: 20,
    gap: 2,
  },
  eqBar: {
    width: 5,
    backgroundColor: '#FF4199',
    borderRadius: 10,
  },

  // Now Playing
  nowPlaying: {
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
  },
  stationName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  songInfo: {
    fontSize: 15,
    fontWeight: '400',
    color: '#FFFFFF',
    marginTop: 3,
    textAlign: 'center',
  },

  // Main Controls
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    paddingHorizontal: 15,
    gap: 19,
  },
  controlBtn: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: '#282828',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Prev/Next icons (60x60 inner area)
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevBar: {
    width: 6,
    height: 35,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    marginRight: 6,
  },
  prevTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 18,
    borderBottomWidth: 18,
    borderRightWidth: 30,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#FFFFFF',
  },
  nextTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 18,
    borderBottomWidth: 18,
    borderLeftWidth: 30,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
  },
  nextBar: {
    width: 6,
    height: 35,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    marginLeft: 6,
  },

  // Pause icon
  pauseIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pauseBar: {
    width: 12,
    height: 42,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },

  // Play icon
  playTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 22,
    borderBottomWidth: 22,
    borderLeftWidth: 36,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
    marginLeft: 6,
  },

  // Volume Row
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    paddingHorizontal: 15,
    gap: 19,
  },
  muteBtn: {
    width: 100,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#282828',
    justifyContent: 'center',
    alignItems: 'center',
  },
  volumeSliderBox: {
    flex: 1,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#282828',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  volumeSlider: {
    flex: 1,
    height: 40,
    marginLeft: 6,
  },

  // Speaker icons
  speakerIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speakerBody: {
    width: 12,
    height: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  speakerCone: {
    width: 0,
    height: 0,
    borderTopWidth: 11,
    borderBottomWidth: 11,
    borderLeftWidth: 11,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
  },
  muteX: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 2,
  },
  speakerIconSmall: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speakerBodySmall: {
    width: 9,
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
  soundWave: {
    width: 6,
    height: 12,
    borderWidth: 2,
    borderLeftWidth: 0,
    borderColor: '#FFFFFF',
    borderRadius: 8,
    marginLeft: 3,
  },

  // REC
  recContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  recButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recDotOuter: {
    width: 25,
    height: 25,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#FF6161',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recDotInner: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#FF6161',
  },
  recText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#FFFFFF',
  },
});

export default CarModeScreen;

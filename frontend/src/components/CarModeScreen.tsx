import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  PanResponder,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { useFonts } from 'expo-font';
import { usePlayerStore } from '../store/playerStore';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { usePopularStations } from '../hooks/useQueries';
import type { Station } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Scale factor relative to 375px Figma design
const S = SCREEN_WIDTH / 375;

// Card positions from Figma CSS (center X, size, opacity, zIndex, borderRadius, shadowOpacity)
const CARD_CONFIGS = [
  { centerX: 63 * S, size: 96 * S, opacity: 0.8, zIndex: 1, radius: 12 * S, shadowOpa: 0.05 },
  { centerX: 113 * S, size: 126 * S, opacity: 1.0, zIndex: 5, radius: 12 * S, shadowOpa: 0.2 },
  { centerX: 188 * S, size: 150 * S, opacity: 1.0, zIndex: 10, radius: 15 * S, shadowOpa: 0.3 },
  { centerX: 263 * S, size: 126 * S, opacity: 1.0, zIndex: 5, radius: 12 * S, shadowOpa: 0.2 },
  { centerX: 312 * S, size: 96 * S, opacity: 0.8, zIndex: 1, radius: 12 * S, shadowOpa: 0.05 },
];

const CAROUSEL_HEIGHT = 200 * S;

interface CarModeScreenProps {
  visible: boolean;
  onClose: () => void;
}

// ─── Custom Carousel ────────────────────────────────────
const StationCarousel = React.memo(({
  stations,
  currentIndex,
  onIndexChange,
  getLogoUrl,
}: {
  stations: Station[];
  currentIndex: number;
  onIndexChange: (idx: number) => void;
  getLogoUrl: (s: Station) => string | null;
}) => {
  const currentIndexRef = useRef(currentIndex);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  const stationsRef = useRef(stations);
  useEffect(() => { stationsRef.current = stations; }, [stations]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx }) => Math.abs(dx) > 15,
      onPanResponderRelease: (_, { dx, vx }) => {
        const idx = currentIndexRef.current;
        const len = stationsRef.current.length;
        if (len === 0) return;
        if (dx < -40 || vx < -0.5) {
          onIndexChange((idx + 1) % len);
        } else if (dx > 40 || vx > 0.5) {
          onIndexChange((idx - 1 + len) % len);
        }
      },
    })
  ).current;

  if (stations.length === 0) {
    return (
      <View style={carouselStyles.container}>
        <Text style={carouselStyles.loadingText}>Loading stations...</Text>
      </View>
    );
  }

  return (
    <View style={carouselStyles.container} {...panResponder.panHandlers}>
      {CARD_CONFIGS.map((cfg, posIdx) => {
        const offset = posIdx - 2; // -2, -1, 0, 1, 2
        const stIdx = ((currentIndex + offset) % stations.length + stations.length) % stations.length;
        const station = stations[stIdx];
        if (!station) return null;

        const logo = getLogoUrl(station);
        const isCenter = posIdx === 2;

        return (
          <View
            key={`pos-${posIdx}`}
            style={[
              carouselStyles.cardWrapper,
              {
                left: cfg.centerX - cfg.size / 2,
                top: (CAROUSEL_HEIGHT - cfg.size) / 2,
                width: cfg.size,
                height: cfg.size,
                zIndex: cfg.zIndex,
                opacity: cfg.opacity,
                borderRadius: cfg.radius,
              },
              // Purple glow shadow
              Platform.select({
                ios: {
                  shadowColor: '#7B61FF',
                  shadowOffset: { width: 0, height: isCenter ? 22 : 18 },
                  shadowOpacity: cfg.shadowOpa,
                  shadowRadius: isCenter ? 42 : 34,
                },
                android: {
                  elevation: cfg.zIndex * 2,
                },
                default: {},
              }),
            ]}
          >
            {/* Web box-shadow for purple glow */}
            {Platform.OS === 'web' && (
              <View
                style={[
                  carouselStyles.webGlow,
                  {
                    borderRadius: cfg.radius,
                    // @ts-ignore
                    boxShadow: isCenter
                      ? '0px 22px 82px 14px rgba(123, 97, 255, 0.3)'
                      : posIdx === 1 || posIdx === 3
                        ? '0px 18px 68px 12px rgba(123, 97, 255, 0.2)'
                        : '0px 18px 68px 12px rgba(123, 97, 255, 0.05)',
                  },
                ]}
              />
            )}
            <View style={[carouselStyles.cardInner, { borderRadius: cfg.radius }]}>
              {logo ? (
                <Image
                  source={{ uri: logo }}
                  style={carouselStyles.cardImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={carouselStyles.cardPlaceholder}>
                  <Text style={carouselStyles.placeholderText}>
                    {station.name?.charAt(0) || '?'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
});

const carouselStyles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: CAROUSEL_HEIGHT,
    overflow: 'visible',
  },
  loadingText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: CAROUSEL_HEIGHT / 2 - 10,
  },
  cardWrapper: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  webGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardInner: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
  },
  placeholderText: {
    fontSize: 40 * S,
    fontWeight: '700',
    color: '#555',
  },
});

// ─── Equalizer bars (animated) ──────────────────────────
const EqualizerBars = () => {
  const anim1 = useRef(new Animated.Value(20)).current;
  const anim2 = useRef(new Animated.Value(14)).current;
  const anim3 = useRef(new Animated.Value(17)).current;

  useEffect(() => {
    const createLoop = (anim: Animated.Value, min: number, max: number, dur: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: max, duration: dur, useNativeDriver: false }),
          Animated.timing(anim, { toValue: min, duration: dur, useNativeDriver: false }),
        ])
      );
    createLoop(anim1, 8, 22, 400).start();
    createLoop(anim2, 6, 18, 350).start();
    createLoop(anim3, 10, 20, 450).start();
  }, []);

  return (
    <View style={eqStyles.container}>
      <Animated.View style={[eqStyles.bar, { height: anim1 }]} />
      <Animated.View style={[eqStyles.bar, { height: anim2 }]} />
      <Animated.View style={[eqStyles.bar, { height: anim3 }]} />
    </View>
  );
};

const eqStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    height: 22,
    gap: 2 * S,
    marginTop: 12 * S,
  },
  bar: {
    width: 5 * S,
    backgroundColor: '#FF4199',
    borderRadius: 10,
  },
});

// ─── Main CarModeScreen ─────────────────────────────────
export const CarModeScreen: React.FC<CarModeScreenProps> = ({ visible, onClose }) => {
  const { currentStation, playbackState, nowPlaying } = usePlayerStore();
  const { playStation, togglePlayPause, setVolume } = useAudioPlayer();
  const { data: popularData } = usePopularStations(undefined, 15);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const [fontsLoaded] = useFonts({
    'Ubuntu-Bold': require('../../assets/fonts/Ubuntu-Bold.ttf'),
  });

  const isPlaying = playbackState === 'playing';
  const isLoading = playbackState === 'loading' || playbackState === 'buffering';

  const stations = useMemo(() => {
    const data = popularData?.stations || (Array.isArray(popularData) ? popularData : []);
    return data.slice(0, 15);
  }, [popularData]);

  const initialIndex = useMemo(() => {
    if (currentStation && stations.length > 0) {
      const idx = stations.findIndex((s: Station) => s._id === currentStation._id);
      return idx !== -1 ? idx : 0;
    }
    return 0;
  }, [currentStation?._id, stations]);

  const [carouselIndex, setCarouselIndex] = useState(initialIndex);

  // Sync carousel index when station or data changes
  useEffect(() => {
    if (visible && currentStation && stations.length > 0) {
      const idx = stations.findIndex((s: Station) => s._id === currentStation._id);
      if (idx !== -1 && idx !== carouselIndex) {
        setCarouselIndex(idx);
      }
    }
  }, [visible, currentStation?._id, stations]);

  const getLogoUrl = useCallback((station: Station) => {
    if (station.logoAssets?.webp192) {
      return `https://themegaradio.com/station-logos/${(station.logoAssets as any).folder}/${station.logoAssets.webp192}`;
    }
    return station.favicon || station.logo || null;
  }, []);

  const handleIndexChange = useCallback((newIndex: number) => {
    setCarouselIndex(newIndex);
    const station = stations[newIndex];
    if (station && station._id !== currentStation?._id) {
      playStation(station);
    }
  }, [stations, currentStation?._id, playStation]);

  const handlePrev = useCallback(() => {
    if (stations.length === 0) return;
    const newIdx = (carouselIndex - 1 + stations.length) % stations.length;
    handleIndexChange(newIdx);
  }, [carouselIndex, stations.length, handleIndexChange]);

  const handleNext = useCallback(() => {
    if (stations.length === 0) return;
    const newIdx = (carouselIndex + 1) % stations.length;
    handleIndexChange(newIdx);
  }, [carouselIndex, stations.length, handleIndexChange]);

  const handleVolumeChange = async (value: number) => {
    setVolumeState(value);
    if (!isMuted) await setVolume(value);
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
    if (nowPlaying?.title) return nowPlaying.title;
    if (currentStation?.genres?.[0]) return currentStation.genres[0];
    return 'Live Radio';
  };

  if (!visible) return null;

  const ubuntuBold = fontsLoaded ? { fontFamily: 'Ubuntu-Bold' } : { fontWeight: '700' as const };

  return (
    <View style={styles.overlay} data-testid="car-mode-screen">
      <StatusBar barStyle="light-content" backgroundColor="#1B1C1E" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* ── Header ─────────────────── */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, ubuntuBold]}>Car Mode</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            data-testid="car-mode-close-btn"
          >
            <Text style={[styles.closeBtnText, ubuntuBold]}>Close</Text>
          </TouchableOpacity>
        </View>

        {/* ── Station Carousel ────────── */}
        <View style={styles.carouselSection}>
          <StationCarousel
            stations={stations}
            currentIndex={carouselIndex}
            onIndexChange={handleIndexChange}
            getLogoUrl={getLogoUrl}
          />
        </View>

        {/* ── Equalizer ──────────────── */}
        <EqualizerBars />

        {/* ── Station Name + Song ─────── */}
        <View style={styles.infoSection}>
          <Text
            style={[styles.stationName, ubuntuBold]}
            numberOfLines={1}
            data-testid="car-mode-station-name"
          >
            {currentStation?.name || 'No Station'}
          </Text>
          <Text style={styles.songInfo} numberOfLines={1}>
            {getCurrentSongInfo()}
          </Text>
        </View>

        {/* ── Controls: Prev | Pause | Next ─── */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={handlePrev}
            data-testid="car-mode-prev-btn"
          >
            {/* Previous icon: |◀ */}
            <View style={styles.iconContainer}>
              <View style={styles.prevBarLine} />
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
              /* Pause icon: ▮▮ */
              <View style={styles.iconContainer}>
                <View style={styles.pauseBar} />
                <View style={[styles.pauseBar, { marginLeft: 12 * S }]} />
              </View>
            ) : (
              /* Play icon: ▶ */
              <View style={styles.playTriangle} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={handleNext}
            data-testid="car-mode-next-btn"
          >
            {/* Next icon: ▶| */}
            <View style={styles.iconContainer}>
              <View style={styles.nextTriangle} />
              <View style={styles.nextBarLine} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Volume: Mute | Slider ────── */}
        <View style={styles.volumeRow}>
          <TouchableOpacity
            style={styles.muteBtn}
            onPress={handleMuteToggle}
            data-testid="car-mode-mute-btn"
          >
            {/* Speaker + X icon */}
            <View style={styles.speakerGroup}>
              <View style={styles.speakerRect} />
              <View style={styles.speakerCone} />
              {isMuted && <Text style={styles.muteXMark}>x</Text>}
            </View>
          </TouchableOpacity>

          <View style={styles.volumeBox}>
            {/* Speaker icon */}
            <View style={styles.speakerGroupSmall}>
              <View style={styles.speakerRectSm} />
              <View style={styles.speakerConeSm} />
              <View style={styles.soundWave} />
            </View>
            <Slider
              style={styles.slider}
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

        {/* ── REC Button ─────────────── */}
        <View style={styles.recRow}>
          <TouchableOpacity style={styles.recBtn} data-testid="car-mode-rec-btn">
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

// ─── Styles ─────────────────────────────────────────────
const BTN_SIZE = 100 * S;
const BTN_GAP = 19 * S;
const BTN_RADIUS = 10 * S;

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#1B1C1E',
    zIndex: 1000,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15 * S,
    paddingTop: 10 * S,
  },
  headerTitle: {
    fontSize: 18 * S,
    color: '#FFFFFF',
  },
  closeBtn: {
    backgroundColor: '#2F2F2F',
    paddingHorizontal: 21 * S,
    paddingVertical: 14 * S,
    borderRadius: 25 * S,
  },
  closeBtnText: {
    fontSize: 15 * S,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // Carousel section
  carouselSection: {
    alignItems: 'center',
    overflow: 'visible',
  },

  // Station info
  infoSection: {
    alignItems: 'center',
    paddingHorizontal: 20 * S,
  },
  stationName: {
    fontSize: 20 * S,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 6 * S,
  },
  songInfo: {
    fontSize: 15 * S,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 3 * S,
  },

  // Controls row
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: BTN_GAP,
    paddingHorizontal: 15 * S,
  },
  controlBtn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_RADIUS,
    backgroundColor: '#282828',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Previous icon: vertical bar + left triangle
  prevBarLine: {
    width: 6 * S,
    height: 36 * S,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    marginRight: 4 * S,
  },
  prevTriangle: {
    width: 0, height: 0,
    borderTopWidth: 20 * S,
    borderBottomWidth: 20 * S,
    borderRightWidth: 32 * S,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#FFFFFF',
  },

  // Pause icon
  pauseBar: {
    width: 14 * S,
    height: 42 * S,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },

  // Play icon
  playTriangle: {
    width: 0, height: 0,
    borderTopWidth: 22 * S,
    borderBottomWidth: 22 * S,
    borderLeftWidth: 36 * S,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
    marginLeft: 4 * S,
  },

  // Next icon: right triangle + vertical bar
  nextTriangle: {
    width: 0, height: 0,
    borderTopWidth: 20 * S,
    borderBottomWidth: 20 * S,
    borderLeftWidth: 32 * S,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
  },
  nextBarLine: {
    width: 6 * S,
    height: 36 * S,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    marginLeft: 4 * S,
  },

  // Volume row
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15 * S,
    gap: BTN_GAP,
  },
  muteBtn: {
    width: BTN_SIZE,
    height: 56 * S,
    borderRadius: BTN_RADIUS,
    backgroundColor: '#282828',
    justifyContent: 'center',
    alignItems: 'center',
  },
  volumeBox: {
    flex: 1,
    height: 56 * S,
    borderRadius: BTN_RADIUS,
    backgroundColor: '#282828',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10 * S,
    paddingRight: 6 * S,
  },
  slider: {
    flex: 1,
    height: 40 * S,
    marginLeft: 4 * S,
  },

  // Speaker icons
  speakerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speakerRect: {
    width: 10 * S,
    height: 12 * S,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  speakerCone: {
    width: 0, height: 0,
    borderTopWidth: 10 * S,
    borderBottomWidth: 10 * S,
    borderLeftWidth: 10 * S,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
  },
  muteXMark: {
    color: '#FFFFFF',
    fontSize: 14 * S,
    fontWeight: '700',
    marginLeft: 2,
  },
  speakerGroupSmall: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speakerRectSm: {
    width: 8 * S,
    height: 10 * S,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  speakerConeSm: {
    width: 0, height: 0,
    borderTopWidth: 7 * S,
    borderBottomWidth: 7 * S,
    borderLeftWidth: 7 * S,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
  },
  soundWave: {
    width: 5 * S,
    height: 10 * S,
    borderWidth: 2,
    borderLeftWidth: 0,
    borderColor: '#FFFFFF',
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    marginLeft: 2 * S,
  },

  // REC
  recRow: {
    alignItems: 'center',
    paddingBottom: 8 * S,
  },
  recBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10 * S,
  },
  recDotOuter: {
    width: 25 * S,
    height: 25 * S,
    borderRadius: 13 * S,
    borderWidth: 2 * S,
    borderColor: '#FF6161',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recDotInner: {
    width: 17 * S,
    height: 17 * S,
    borderRadius: 9 * S,
    backgroundColor: '#FF6161',
  },
  recText: {
    fontSize: 13 * S,
    fontWeight: '400',
    color: '#FFFFFF',
  },
});

export default CarModeScreen;

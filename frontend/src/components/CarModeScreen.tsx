import React, { useState, useCallback, useMemo, useEffect, useRef, memo } from 'react';
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
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { usePlayerStore } from '../store/playerStore';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import type { Station } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Scale factor relative to 375px Figma design
const S = SCREEN_WIDTH / 375;

// EXACT card positions from Figma CSS
// top values are relative: center=0, adjacent=12, far=27 (from Figma top: 187, 199, 214)
const CARD_CONFIGS = [
  { left: 15 * S, top: 27 * S, size: 96 * S, opacity: 0.8, zIndex: 1, radius: 12.12 * S, shadowOpa: 0.05 },
  { left: 50 * S, top: 12 * S, size: 126 * S, opacity: 1.0, zIndex: 5, radius: 12.12 * S, shadowOpa: 0.2 },
  { left: 113 * S, top: 0, size: 150 * S, opacity: 1.0, zIndex: 10, radius: 14.62 * S, shadowOpa: 0.3 },
  { left: 200 * S, top: 12 * S, size: 126 * S, opacity: 1.0, zIndex: 5, radius: 12.12 * S, shadowOpa: 0.2 },
  { left: 264 * S, top: 27 * S, size: 96 * S, opacity: 0.8, zIndex: 1, radius: 12.12 * S, shadowOpa: 0.05 },
];

const CAROUSEL_HEIGHT = 150 * S;

interface CarModeScreenProps {
  visible: boolean;
  onClose: () => void;
  stations: Station[];  // Receive stations from player (no separate fetch)
}

// ─── Custom Carousel ────────────────────────────────────
const StationCarousel = ({
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
  // Use refs to access latest values in PanResponder callbacks
  const currentIndexRef = useRef(currentIndex);
  const stationsRef = useRef(stations);
  const onIndexChangeRef = useRef(onIndexChange);
  
  // Update refs when props change
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { stationsRef.current = stations; }, [stations]);
  useEffect(() => { onIndexChangeRef.current = onIndexChange; }, [onIndexChange]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, { dx }) => Math.abs(dx) > 15,
    onPanResponderRelease: (_, { dx, vx }) => {
      const idx = currentIndexRef.current;
      const len = stationsRef.current.length;
      if (len === 0) return;
      if (dx < -40 || vx < -0.5) {
        onIndexChangeRef.current((idx + 1) % len);
      } else if (dx > 40 || vx > 0.5) {
        onIndexChangeRef.current((idx - 1 + len) % len);
      }
    },
  }), []);

  if (stations.length === 0) return null;

  // Calculate which stations to show at each position
  const getStationAtPosition = (positionIndex: number): Station | null => {
    const offset = positionIndex - 2; // -2, -1, 0, 1, 2 for 5 positions
    const stationIndex = ((currentIndex + offset) % stations.length + stations.length) % stations.length;
    return stations[stationIndex] || null;
  };

  return (
    <View style={carouselStyles.container} {...panResponder.panHandlers}>
      {CARD_CONFIGS.map((cfg, posIdx) => {
        const station = getStationAtPosition(posIdx);
        if (!station) return null;

        // Get the logo URL for THIS specific station
        const logoUrl = getLogoUrl(station);
        const isCenter = posIdx === 2;
        
        // Debug log to verify each position gets different station
        // console.log(`[Carousel] Position ${posIdx}: ${station.name} - Logo: ${logoUrl?.substring(0, 50)}`);

        return (
          <View
            key={`carousel-pos-${posIdx}-station-${station._id}`}
            style={[
              carouselStyles.cardOuter,
              {
                left: cfg.left,
                top: cfg.top,
                width: cfg.size,
                height: cfg.size,
                zIndex: cfg.zIndex,
                opacity: cfg.opacity,
                borderRadius: cfg.radius,
              },
              Platform.select({
                ios: {
                  shadowColor: '#7B61FF',
                  shadowOffset: { width: 0, height: isCenter ? 22 * S : 18 * S },
                  shadowOpacity: cfg.shadowOpa,
                  shadowRadius: isCenter ? 42 * S : 34 * S,
                },
                android: {
                  elevation: cfg.zIndex * 2,
                },
                default: {},
              }),
              // Web glow
              Platform.OS === 'web' ? {
                // @ts-ignore
                boxShadow: isCenter
                  ? `0px ${22 * S}px ${82 * S}px ${14 * S}px rgba(123, 97, 255, 0.3)`
                  : posIdx === 1 || posIdx === 3
                    ? `0px ${18 * S}px ${68 * S}px ${12 * S}px rgba(123, 97, 255, 0.2)`
                    : `0px ${18 * S}px ${68 * S}px ${12 * S}px rgba(123, 97, 255, 0.05)`,
              } : {},
            ]}
          >
            {logoUrl ? (
              <Image
                key={`img-${station._id}`}
                source={{ uri: logoUrl }}
                style={[carouselStyles.cardImage, { borderRadius: cfg.radius }]}
                resizeMode="cover"
              />
            ) : (
              <View style={[carouselStyles.cardPlaceholder, { borderRadius: cfg.radius }]}>
                <Text style={carouselStyles.placeholderText}>
                  {station.name?.charAt(0) || '?'}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const carouselStyles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: CAROUSEL_HEIGHT,
  },
  cardOuter: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
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
    const loop = (anim: Animated.Value, min: number, max: number, dur: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: max, duration: dur, useNativeDriver: false }),
          Animated.timing(anim, { toValue: min, duration: dur, useNativeDriver: false }),
        ])
      );
    loop(anim1, 8, 22, 400).start();
    loop(anim2, 6, 18, 350).start();
    loop(anim3, 10, 20, 450).start();
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
    marginTop: 16 * S,
  },
  bar: {
    width: 5 * S,
    backgroundColor: '#FF4199',
    borderRadius: 10,
  },
});

// ─── Main CarModeScreen ─────────────────────────────────
export const CarModeScreen: React.FC<CarModeScreenProps> = ({ visible, onClose, stations: propStations }) => {
  const { currentStation, playbackState, nowPlaying } = usePlayerStore();
  const { playStation, togglePlayPause, setVolume } = useAudioPlayer();
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const [fontsLoaded] = useFonts({
    'Ubuntu-Bold': require('../../assets/fonts/Ubuntu-Bold.ttf'),
  });

  const isPlaying = playbackState === 'playing';
  const isLoading = playbackState === 'loading' || playbackState === 'buffering';

  // CRITICAL: Freeze station list when Car Mode opens.
  // This prevents the list from re-ordering when a new station is played (which
  // triggers a similar-stations refetch in player.tsx, changing the prop).
  const [stations, setStations] = useState<Station[]>([]);
  const stationsInitRef = useRef(false);

  useEffect(() => {
    if (visible && propStations.length > 0 && !stationsInitRef.current) {
      stationsInitRef.current = true;
      setStations([...propStations]);
    }
    if (!visible) {
      stationsInitRef.current = false;
      setStations([]);
    }
  }, [visible, propStations]);

  const [carouselIndex, setCarouselIndex] = useState(0);

  // Set carousel to current station when opened
  useEffect(() => {
    if (visible && currentStation && stations.length > 0) {
      const idx = stations.findIndex((s: Station) => s._id === currentStation._id);
      if (idx !== -1) {
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
    handleIndexChange((carouselIndex - 1 + stations.length) % stations.length);
  }, [carouselIndex, stations.length, handleIndexChange]);

  const handleNext = useCallback(() => {
    if (stations.length === 0) return;
    handleIndexChange((carouselIndex + 1) % stations.length);
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

  // Use carousel index to determine displayed station (matches the visual carousel card)
  const displayedStation = stations.length > 0 ? stations[carouselIndex] : currentStation;

  const ub = fontsLoaded ? { fontFamily: 'Ubuntu-Bold' } : { fontWeight: '700' as const };

  // Get iOS status bar height for proper safe area
  const statusBarHeight = Platform.OS === 'ios' ? 54 : StatusBar.currentHeight || 0;

  return (
    <View style={styles.overlay} data-testid="car-mode-screen">
      <StatusBar barStyle="light-content" backgroundColor="#1B1C1E" />
      
      {/* Main content with manual safe area padding */}
      <View style={[styles.contentContainer, { paddingTop: statusBarHeight }]}>
        {/* ── Header ─────────────────── */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, ub]}>Car Mode</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            data-testid="car-mode-close-btn"
          >
            <Text style={[styles.closeBtnText, ub]}>Close</Text>
          </TouchableOpacity>
        </View>

        {/* ── Station Carousel ────────── */}
        <View style={styles.carouselSection}>
          {/* Purple glow behind center card */}
          <View style={styles.centerGlow} />
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
            style={[styles.stationName, ub]}
            numberOfLines={1}
            data-testid="car-mode-station-name"
          >
            {displayedStation?.name || 'No Station'}
          </Text>
          <Text style={styles.songInfo} numberOfLines={1}>
            {getCurrentSongInfo()}
          </Text>
        </View>

        {/* ── Controls: Prev | Pause | Next ─── */}
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.controlBtn} onPress={handlePrev} data-testid="car-mode-prev-btn">
            <View style={styles.iconRow}>
              <View style={styles.prevBarLine} />
              <View style={styles.prevTriangle} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlBtn} onPress={togglePlayPause} disabled={isLoading} data-testid="car-mode-playpause-btn">
            {isPlaying ? (
              <View style={styles.iconRow}>
                <View style={styles.pauseBar} />
                <View style={[styles.pauseBar, { marginLeft: 12 * S }]} />
              </View>
            ) : (
              <View style={styles.playTriangle} />
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlBtn} onPress={handleNext} data-testid="car-mode-next-btn">
            <View style={styles.iconRow}>
              <View style={styles.nextTriangle} />
              <View style={styles.nextBarLine} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Volume: Mute | Slider ────── */}
        <View style={styles.volumeRow}>
          <TouchableOpacity style={styles.muteBtn} onPress={handleMuteToggle} data-testid="car-mode-mute-btn">
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-off'}
              size={28 * S}
              color="#FFF"
            />
          </TouchableOpacity>
          <View style={styles.volumeBox}>
            <Ionicons name="volume-high" size={20 * S} color="#FFF" />
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
      </View>
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────
const BTN = 100 * S;
const GAP = 19 * S;
const BR = 10 * S;

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#1B1C1E',
    zIndex: 1000,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20, // Home indicator safe area
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15 * S,
    paddingTop: 10 * S,
  },
  headerTitle: { fontSize: 18 * S, color: '#FFF' },
  closeBtn: {
    backgroundColor: '#2F2F2F',
    paddingHorizontal: 21 * S,
    paddingVertical: 14 * S,
    borderRadius: 25 * S,
  },
  closeBtnText: { fontSize: 15 * S, color: '#FFF', textAlign: 'center' },

  carouselSection: { 
    alignItems: 'center',
    position: 'relative',
  },
  
  // Purple glow effect behind center card
  centerGlow: {
    position: 'absolute',
    top: -20 * S,
    left: SCREEN_WIDTH / 2 - 100 * S,
    width: 200 * S,
    height: 200 * S,
    borderRadius: 100 * S,
    backgroundColor: '#7B61FF',
    opacity: 0.4,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      filter: 'blur(60px)',
    } : {
      // iOS/Android: Use shadow for glow effect
    }),
  },

  infoSection: { alignItems: 'center', paddingHorizontal: 20 * S },
  stationName: { fontSize: 20 * S, color: '#FFF', textAlign: 'center' },
  songInfo: { fontSize: 15 * S, fontWeight: '400', color: '#FFF', textAlign: 'center', marginTop: 3 * S },

  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: GAP,
    paddingHorizontal: 15 * S,
  },
  controlBtn: {
    width: BTN, height: BTN, borderRadius: BR,
    backgroundColor: '#282828',
    justifyContent: 'center', alignItems: 'center',
  },
  iconRow: { flexDirection: 'row', alignItems: 'center' },

  prevBarLine: { width: 6 * S, height: 36 * S, backgroundColor: '#FFF', borderRadius: 2, marginRight: 4 * S },
  prevTriangle: {
    width: 0, height: 0,
    borderTopWidth: 20 * S, borderBottomWidth: 20 * S, borderRightWidth: 32 * S,
    borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: '#FFF',
  },
  pauseBar: { width: 14 * S, height: 42 * S, backgroundColor: '#FFF', borderRadius: 3 },
  playTriangle: {
    width: 0, height: 0,
    borderTopWidth: 22 * S, borderBottomWidth: 22 * S, borderLeftWidth: 36 * S,
    borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: '#FFF',
    marginLeft: 4 * S,
  },
  nextTriangle: {
    width: 0, height: 0,
    borderTopWidth: 20 * S, borderBottomWidth: 20 * S, borderLeftWidth: 32 * S,
    borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: '#FFF',
  },
  nextBarLine: { width: 6 * S, height: 36 * S, backgroundColor: '#FFF', borderRadius: 2, marginLeft: 4 * S },

  volumeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 * S, gap: GAP },
  muteBtn: { width: BTN, height: 56 * S, borderRadius: BR, backgroundColor: '#282828', justifyContent: 'center', alignItems: 'center' },
  volumeBox: { flex: 1, height: 56 * S, borderRadius: BR, backgroundColor: '#282828', flexDirection: 'row', alignItems: 'center', paddingLeft: 10 * S, paddingRight: 6 * S },
  slider: { flex: 1, height: 40 * S, marginLeft: 4 * S },

  // Speaker icon styles removed - using Ionicons instead

  recRow: { alignItems: 'center', paddingBottom: 8 * S },
  recBtn: { flexDirection: 'row', alignItems: 'center', gap: 10 * S },
  recDotOuter: { width: 25 * S, height: 25 * S, borderRadius: 13 * S, borderWidth: 2 * S, borderColor: '#FF6161', justifyContent: 'center', alignItems: 'center' },
  recDotInner: { width: 17 * S, height: 17 * S, borderRadius: 9 * S, backgroundColor: '#FF6161' },
  recText: { fontSize: 13 * S, fontWeight: '400', color: '#FFF' },
});

export default CarModeScreen;

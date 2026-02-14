import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import statsService, { ListeningStats } from '../src/services/statsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Wave graph component matching Figma design
const WaveGraph = () => {
  const width = 180;
  const height = 60;
  
  // Create a smooth wave path
  const wavePath = `
    M 0 40 
    Q 15 30, 30 35 
    Q 45 40, 60 25 
    Q 75 10, 90 30 
    Q 105 50, 120 35 
    Q 135 20, 150 30 
    Q 165 40, 180 35
  `;
  
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <LinearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#FF4199" stopOpacity="0.8" />
          <Stop offset="50%" stopColor="#FF4199" stopOpacity="1" />
          <Stop offset="100%" stopColor="#FF4199" stopOpacity="0.8" />
        </LinearGradient>
      </Defs>
      <Path
        d={wavePath}
        fill="none"
        stroke="url(#waveGradient)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

interface LocalStats extends ListeningStats {
  uniqueStations: number;
}

export default function StatisticsScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<LocalStats>({
    totalMinutes: 0,
    totalStations: 136000,
    musicPlayed: 0,
    lastUpdated: '',
    uniqueStations: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const [storedStats, uniqueCount] = await Promise.all([
        statsService.getStats(),
        statsService.getUniqueStationsCount(),
      ]);
      setStats({
        ...storedStats,
        uniqueStations: uniqueCount,
      });
    } catch (e) {
      console.log('Failed to load stats:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Format minutes to hours and minutes
  const formatListeningTime = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}hr ${minutes}m`;
  };

  // Format large numbers with k suffix
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${Math.round(num / 1000)}k`;
    }
    return num.toString();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
          data-testid="statistics-back-btn"
        >
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Statistics</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Total Listening Card */}
      <View style={styles.totalListeningCard} data-testid="total-listening-card">
        <View style={styles.totalListeningContent}>
          <Text style={styles.cardLabel}>Total Listening</Text>
          <Text style={styles.totalListeningValue}>
            {formatListeningTime(stats.totalMinutes)}
          </Text>
        </View>
        <View style={styles.waveContainer}>
          <WaveGraph />
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {/* Total Radio Station Card */}
        <View style={styles.statCard} data-testid="total-stations-card">
          <Text style={styles.cardLabel}>Total Radio Station</Text>
          <Text style={styles.statValue}>{formatNumber(stats.totalStations)}</Text>
        </View>

        {/* Music Played Card */}
        <View style={styles.statCard} data-testid="music-played-card">
          <Text style={styles.cardLabel}>Music Played</Text>
          <Text style={styles.statValue}>{formatNumber(stats.musicPlayed)}</Text>
        </View>
      </View>
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
  backButton: {
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
  headerSpacer: {
    width: 40,
  },

  // Total Listening Card
  totalListeningCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  totalListeningContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '400',
    color: '#A9A9A9',
    marginBottom: 8,
  },
  totalListeningValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  waveContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

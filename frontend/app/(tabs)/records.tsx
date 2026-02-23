import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../src/constants/theme';
import { useRecentlyPlayed } from '../../src/hooks/useQueries';
import { useAudioPlayer } from '../../src/hooks/useAudioPlayer';
import { useResponsive } from '../../src/hooks/useResponsive';
import type { Station } from '../../src/types';

export default function RecordsScreen() {
  const { data: recentlyPlayed, isLoading } = useRecentlyPlayed();
  const { playStation } = useAudioPlayer();
  
  // Responsive layout
  const responsive = useResponsive();

  const getLogoUrl = (station: Station) => {
    if (station.logoAssets?.webp96) {
      return `https://themegaradio.com/station-logos/${station.logoAssets.folder}/${station.logoAssets.webp96}`;
    }
    return station.favicon || station.logo || null;
  };

  const handleStationPress = (station: Station) => {
    playStation(station);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { fontSize: responsive.scale(24) }]}>Records</Text>
          <Text style={styles.headerSubtitle}>Your listening history</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: responsive.sidePadding }]}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : recentlyPlayed && recentlyPlayed.length > 0 ? (
            <View style={responsive.isTablet ? { flexDirection: 'row', flexWrap: 'wrap' } : undefined}>
              {recentlyPlayed.map((station: Station) => (
                <TouchableOpacity
                  key={station._id}
                  style={[styles.stationItem, responsive.isTablet && { width: '50%' }]}
                  onPress={() => handleStationPress(station)}
                >
                  <View style={styles.stationLogo}>
                    {getLogoUrl(station) ? (
                      <Image
                        source={{ uri: getLogoUrl(station)! }}
                        style={styles.logoImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name="radio" size={24} color="#5B5B5B" />
                    )}
                  </View>
                  <View style={styles.stationInfo}>
                    <Text style={styles.stationName} numberOfLines={1}>
                      {station.name}
                    </Text>
                    <Text style={styles.stationCountry} numberOfLines={1}>
                      {station.country || 'Radio'}
                    </Text>
                  </View>
                  <Ionicons name="play" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="disc-outline" size={64} color="#5B5B5B" />
              <Text style={styles.emptyTitle}>No Records Yet</Text>
              <Text style={styles.emptyText}>
                Start listening to radio stations and they'll appear here
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B1C1E',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 15,
    paddingTop: 20,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Ubuntu-Bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#AAAAAA',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingBottom: 180,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  loadingText: {
    fontSize: 16,
    color: '#AAAAAA',
  },
  stationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#282828',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  stationLogo: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  stationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  stationName: {
    fontSize: 15,
    fontFamily: 'Ubuntu-Medium',
    color: '#FFFFFF',
  },
  stationCountry: {
    fontSize: 13,
    color: '#AAAAAA',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Ubuntu-Medium',
    color: '#FFFFFF',
  },
  emptyText: {
    fontSize: 14,
    color: '#5B5B5B',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

// UniversalCastButton - Opens NativeCastModal for Chromecast/AirPlay
import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeCastModal } from './NativeCastModal';
import { usePlayerStore } from '../store/playerStore';

interface UniversalCastButtonProps {
  size?: number;
  color?: string;
  activeColor?: string;
  station?: any;
  streamUrl?: string | null;
  nowPlaying?: { title?: string; artist?: string } | null;
  onStopLocalAudio?: () => void;
}

export const UniversalCastButton: React.FC<UniversalCastButtonProps> = ({
  size = 24,
  color = '#FFFFFF',
  station,
  streamUrl,
  nowPlaying,
  onStopLocalAudio,
}) => {
  const [showCastModal, setShowCastModal] = useState(false);
  
  // Get current station from player store if not provided
  const { currentStation, streamUrl: storeStreamUrl, nowPlaying: storeNowPlaying } = usePlayerStore();
  
  const activeStation = station || currentStation;
  const activeStreamUrl = streamUrl || storeStreamUrl;
  const activeNowPlaying = nowPlaying || storeNowPlaying;

  const handlePress = () => {
    setShowCastModal(true);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Ionicons name="tv-outline" size={size} color={color} />
      </TouchableOpacity>
      
      <NativeCastModal
        visible={showCastModal}
        onClose={() => setShowCastModal(false)}
        station={activeStation}
        streamUrl={activeStreamUrl}
        nowPlaying={activeNowPlaying}
        onStopLocalAudio={onStopLocalAudio}
      />
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default UniversalCastButton;

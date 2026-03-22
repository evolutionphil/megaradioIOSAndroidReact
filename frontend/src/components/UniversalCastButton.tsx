// UniversalCastButton.tsx - Top-level cast button wrapper
// Used in the player UI to show Chromecast/AirPlay controls

import React, { useState } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import NativeCastButton from './NativeCastButton';
import { NativeCastModal } from './NativeCastModal';
import type { Station } from '../types';

interface UniversalCastButtonProps {
  size?: number;
  color?: string;
  activeColor?: string;
  station?: Station | null;
  streamUrl?: string | null;
  nowPlaying?: { title?: string; artist?: string } | null;
  onStopLocalAudio?: () => void;
}

export const UniversalCastButton: React.FC<UniversalCastButtonProps> = ({
  size = 22,
  color = '#FFFFFF',
  activeColor = '#4CAF50',
  station,
  streamUrl,
  nowPlaying,
  onStopLocalAudio,
}) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <View style={styles.container}>
      <NativeCastButton
        size={size}
        color={color}
        activeColor={activeColor}
        station={station}
        streamUrl={streamUrl}
        nowPlaying={nowPlaying}
        onStopLocalAudio={onStopLocalAudio}
      />
      <NativeCastModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        station={station as Station}
        streamUrl={streamUrl || null}
        nowPlaying={nowPlaying}
        onStopLocalAudio={onStopLocalAudio}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default UniversalCastButton;

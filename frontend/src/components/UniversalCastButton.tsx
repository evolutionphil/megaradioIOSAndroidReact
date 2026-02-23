// UniversalCastButton - Simplified safe version
// Just shows a cast icon - native functionality disabled to prevent crashes

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
}) => {
  const handlePress = () => {
    if (Platform.OS === 'ios') {
      Alert.alert(
        'AirPlay',
        'Ses çıkışını değiştirmek için Kontrol Merkezi\'ni açın ve AirPlay simgesine dokunun.',
        [{ text: 'Tamam' }]
      );
    } else {
      Alert.alert(
        'Cast', 
        'Cast özelliği yakında eklenecek.',
        [{ text: 'Tamam' }]
      );
    }
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons name="tv-outline" size={size} color={color} />
    </TouchableOpacity>
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

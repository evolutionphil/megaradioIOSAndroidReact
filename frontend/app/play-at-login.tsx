import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

type PlayAtLoginOption = 'last_played' | 'random' | 'favorite' | 'off';

interface OptionItem {
  id: PlayAtLoginOption;
  label: string;
}

const OPTIONS: OptionItem[] = [
  { id: 'last_played', label: 'Last Played' },
  { id: 'random', label: 'Random' },
  { id: 'favorite', label: 'Favorite' },
  { id: 'off', label: 'Off' },
];

const STORAGE_KEY = 'play_at_login_setting';

export default function PlayAtLoginScreen() {
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState<PlayAtLoginOption>('last_played');

  useEffect(() => {
    loadSetting();
  }, []);

  const loadSetting = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSelectedOption(stored as PlayAtLoginOption);
      }
    } catch (e) {
      console.log('Failed to load play at login setting:', e);
    }
  };

  const handleSelect = async (option: PlayAtLoginOption) => {
    setSelectedOption(option);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, option);
    } catch (e) {
      console.log('Failed to save play at login setting:', e);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
          data-testid="play-at-login-back-btn"
        >
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Play at Login</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Options List */}
      <View style={styles.optionsList}>
        {OPTIONS.map((option, index) => (
          <React.Fragment key={option.id}>
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => handleSelect(option.id)}
              data-testid={`option-${option.id}`}
            >
              <Text style={styles.optionLabel}>{option.label}</Text>
              <View style={styles.radioContainer}>
                <View style={[
                  styles.radioOuter,
                  selectedOption === option.id && styles.radioOuterSelected
                ]}>
                  {selectedOption === option.id && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
            {index < OPTIONS.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
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

  // Options List
  optionsList: {
    marginTop: 8,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  optionLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  radioContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF4081',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#FF4081',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF4081',
  },
  divider: {
    height: 0.5,
    backgroundColor: '#333333',
    marginLeft: 20,
  },
});

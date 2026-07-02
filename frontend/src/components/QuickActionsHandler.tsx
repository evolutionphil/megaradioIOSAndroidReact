// QuickActionsHandler - "Play Last Station" shortcut via app icon long-press
// iOS: Home Screen Quick Actions | Android: App Shortcuts (expo-quick-actions)
// Must be used inside AudioProvider to access playStation function
// Fully async - never blocks startup

import { useEffect, useRef } from 'react';
import { Platform, InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudio } from '../hooks/useAudioPlayer';
import { usePlayerStore } from '../store/playerStore';
import { reportLaunchSource } from '../services/launchSourceService';
import i18n from '../services/i18nService';

const LAST_PLAYED_STATION_KEY = '@megaradio_last_played_station';

const getQuickActions = () => {
  try {
    return require('expo-quick-actions');
  } catch (e) {
    return null;
  }
};

export const QuickActionsHandler: React.FC = () => {
  const { playStation } = useAudio();
  const playStationRef = useRef(playStation);
  playStationRef.current = playStation;
  const handledInitial = useRef(false);
  const { currentStation } = usePlayerStore();

  const playLastStation = async () => {
    try {
      const raw = await AsyncStorage.getItem(LAST_PLAYED_STATION_KEY);
      if (!raw) {
        console.log('[QuickActions] No last played station stored');
        return;
      }
      const station = JSON.parse(raw);
      if (!station || !station._id) return;
      console.log('[QuickActions] Playing last station:', station.name);
      await playStationRef.current(station);
    } catch (e) {
      console.log('[QuickActions] Play failed:', (e as any)?.message || e);
    }
  };

  const handleAction = (action: any) => {
    if (action?.id === 'play-last' || action?.params?.action === 'play-last') {
      reportLaunchSource('quick_action');
      playLastStation();
    }
  };

  // Listener + cold-start initial action
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const QuickActions = getQuickActions();
    if (!QuickActions) return;

    const sub = QuickActions.addListener?.(handleAction);

    // App launched (cold start) via the shortcut — wait for stores/player to settle
    if (!handledInitial.current && QuickActions.initial) {
      handledInitial.current = true;
      const initial = QuickActions.initial;
      setTimeout(() => {
        InteractionManager.runAfterInteractions(() => handleAction(initial));
      }, 2000);
    }

    return () => sub?.remove?.();
  }, []);

  // Voice assistant deep link (iOS Siri App Shortcut / Android Google Assistant
  // App Action): both dispatch megaradio://?playLast=1
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const { Linking } = require('react-native');
    const handleUrl = (url: string | null) => {
      if (!url || !url.includes('playLast=1')) return;
      console.log('[QuickActions] Voice assistant playLast deep link received');
      reportLaunchSource(Platform.OS === 'ios' ? 'siri' : 'assistant');
      setTimeout(() => {
        InteractionManager.runAfterInteractions(() => playLastStation());
      }, 500);
    };
    const sub = Linking.addEventListener('url', (ev: any) => handleUrl(ev?.url));
    Linking.getInitialURL().then(handleUrl).catch(() => {});
    return () => sub?.remove?.();
  }, []);

  // Register/update the shortcut items (deferred, non-blocking)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const QuickActions = getQuickActions();
    if (!QuickActions) return;

    const timer = setTimeout(() => {
      InteractionManager.runAfterInteractions(async () => {
        try {
          let subtitle: string | undefined;
          try {
            const raw = await AsyncStorage.getItem(LAST_PLAYED_STATION_KEY);
            if (raw) subtitle = JSON.parse(raw)?.name;
          } catch (e) {}

          await QuickActions.setItems([
            {
              id: 'play-last',
              title: i18n.t('quick_action_play_last', { defaultValue: 'Son Çalınanı Çal' }),
              subtitle,
              icon: Platform.OS === 'ios' ? 'symbol:play.circle' : undefined,
              params: { action: 'play-last' },
            },
          ]);
          console.log('[QuickActions] Shortcut registered', subtitle ? `(${subtitle})` : '');
        } catch (e) {
          console.log('[QuickActions] setItems failed:', (e as any)?.message || e);
        }
      });
    }, 5000);

    return () => clearTimeout(timer);
    // Re-register when the playing station changes so the subtitle stays fresh
  }, [currentStation?._id]);

  return null;
};

export default QuickActionsHandler;

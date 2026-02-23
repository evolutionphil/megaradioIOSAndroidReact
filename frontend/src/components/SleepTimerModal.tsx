import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ITEM_H = 50;
const VISIBLE = 5;
const PAD = ITEM_H * 2; // padding items above/below

interface SleepTimerModalProps {
  visible: boolean;
  onClose: () => void;
  onStart: (totalMinutes: number) => void;
  isTimerActive: boolean;
  remainingSeconds?: number;
  onCancel: () => void;
}

// Simple scroll-based number picker
const NumberPicker = ({
  max,
  value,
  onChange,
  suffix,
}: {
  max: number;
  value: number;
  onChange: (v: number) => void;
  suffix: string;
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const items = Array.from({ length: max + 1 }, (_, i) => i);

  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ITEM_H);
    const clamped = Math.max(0, Math.min(idx, max));
    onChange(clamped);
  }, [max, onChange]);

  return (
    <View style={pStyles.wrapper}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={{ paddingVertical: PAD }}
        contentOffset={{ x: 0, y: value * ITEM_H }}
      >
        {items.map((num) => {
          const selected = num === value;
          return (
            <View key={num} style={pStyles.item}>
              <Text style={[pStyles.num, selected && pStyles.numSelected]}>{num}</Text>
              {selected && <Text style={pStyles.suffix}>{suffix}</Text>}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const pStyles = StyleSheet.create({
  wrapper: { flex: 1, height: ITEM_H * VISIBLE, overflow: 'hidden' },
  item: { height: ITEM_H, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 },
  num: { fontSize: 32, fontFamily: 'Ubuntu-Bold', color: '#444', textAlign: 'center', minWidth: 40 },
  numSelected: { fontSize: 38, color: '#FFF' },
  suffix: { fontSize: 16, fontFamily: 'Ubuntu-Medium', color: '#FFF', marginTop: 6 },
});

// Sleep Timer Setup Modal (for setting timer)
export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({
  visible, onClose, onStart, isTimerActive, remainingSeconds = 0, onCancel,
}) => {
  const insets = useSafeAreaInsets();
  const [hour, setHour] = useState(0);
  const [minute, setMinute] = useState(30);

  const handleStart = () => {
    const total = hour * 60 + minute;
    if (total > 0) { onStart(total); onClose(); }
  };

  // If timer is active, don't show this modal (use SleepCounterModal instead)
  if (isTimerActive) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={{ flex: 1 }} />
      </TouchableOpacity>

      <View style={[styles.sheet, { paddingBottom: insets.bottom || 20 }]}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={{ width: 50 }} />
          <Text style={styles.title}>Sleep Counter</Text>
          <TouchableOpacity onPress={onClose} data-testid="sleep-timer-close">
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.pickerRow}>
          <View style={styles.band} />
          <NumberPicker max={12} value={hour} onChange={setHour} suffix="h" />
          <NumberPicker max={59} value={minute} onChange={setMinute} suffix="m" />
        </View>
        <View style={styles.btnWrap}>
          <TouchableOpacity
            style={[styles.pinkBtn, (hour === 0 && minute === 0) && { opacity: 0.4 }]}
            onPress={handleStart}
            disabled={hour === 0 && minute === 0}
            data-testid="sleep-timer-start"
          >
            <Text style={styles.pinkBtnText}>Start</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Sleep Counter Modal (shows countdown when timer is active)
interface SleepCounterModalProps {
  visible: boolean;
  onClose: () => void;
  remainingSeconds: number;
  onStop: () => void;
}

export const SleepCounterModal: React.FC<SleepCounterModalProps> = ({
  visible, onClose, remainingSeconds, onStop,
}) => {
  const insets = useSafeAreaInsets();

  // Format as HH:MM:SS
  const formatTime = () => {
    const h = Math.floor(remainingSeconds / 3600);
    const m = Math.floor((remainingSeconds % 3600) / 60);
    const s = remainingSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStop = () => {
    onStop();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={{ flex: 1 }} />
      </TouchableOpacity>

      <View style={[styles.counterSheet, { paddingBottom: insets.bottom || 20 }]}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={{ width: 50 }} />
          <Text style={styles.title}>Sleep Counter</Text>
          <TouchableOpacity onPress={onClose} data-testid="sleep-counter-close">
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.counterContent}>
          <Text style={styles.counterLabel}>After this time the radio will be{'\n'}turned off automatically</Text>
          <Text style={styles.counterTime} data-testid="sleep-counter-time">{formatTime()}</Text>
        </View>

        <View style={styles.btnWrap}>
          <TouchableOpacity
            style={styles.pinkBtn}
            onPress={handleStop}
            data-testid="sleep-counter-stop"
          >
            <Text style={styles.pinkBtnText}>Stop</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#1B1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
  },
  counterSheet: {
    backgroundColor: '#1B1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    minHeight: 350,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#555', alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontFamily: 'Ubuntu-Bold', color: '#FFF' },
  closeText: { fontSize: 16, fontFamily: 'Ubuntu-Medium', color: '#FFF' },

  pickerRow: { flexDirection: 'row', height: ITEM_H * VISIBLE, marginBottom: 16 },
  band: {
    position: 'absolute', left: 0, right: 0,
    top: ITEM_H * 2, height: ITEM_H,
    backgroundColor: 'rgba(60,60,60,0.6)', borderRadius: 8,
  },

  btnWrap: { paddingBottom: 8, paddingHorizontal: 16 },
  pinkBtn: { height: 52, borderRadius: 26, backgroundColor: '#FF4199', justifyContent: 'center', alignItems: 'center' },
  pinkBtnText: { fontSize: 17, fontFamily: 'Ubuntu-Bold', color: '#FFF' },

  // Counter modal styles
  counterContent: { 
    alignItems: 'center', 
    paddingVertical: 50,
    flex: 1,
    justifyContent: 'center',
  },
  counterLabel: { 
    fontSize: 15, 
    color: '#888', 
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  counterTime: { 
    fontSize: 52, 
    fontFamily: 'Ubuntu-Bold', 
    color: '#FFF',
    letterSpacing: 2,
  },
});

export default SleepTimerModal;

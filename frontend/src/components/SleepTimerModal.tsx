import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_HEIGHT = 56;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

// Generate arrays for hours (0-12) and minutes (0-59)
const HOURS = Array.from({ length: 13 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

interface SleepTimerModalProps {
  visible: boolean;
  onClose: () => void;
  onStart: (totalMinutes: number) => void;
  isTimerActive: boolean;
  remainingSeconds?: number;
  onCancel: () => void;
}

// Scroll picker column
const PickerColumn = ({
  data,
  selectedIndex,
  onSelect,
  suffix,
}: {
  data: number[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  suffix: string;
}) => {
  const flatListRef = useRef<FlatList>(null);
  const scrolling = useRef(false);

  useEffect(() => {
    // Scroll to initial position
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({
        offset: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
    }, 100);
  }, []);

  const handleScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
    onSelect(clampedIndex);

    // Snap to position
    flatListRef.current?.scrollToOffset({
      offset: clampedIndex * ITEM_HEIGHT,
      animated: true,
    });
  }, [data.length, onSelect]);

  const renderItem = useCallback(({ item, index }: { item: number; index: number }) => {
    const isSelected = index === selectedIndex;
    return (
      <View style={[pickerStyles.item, { height: ITEM_HEIGHT }]}>
        <Text style={[
          pickerStyles.itemText,
          isSelected && pickerStyles.itemTextSelected,
          !isSelected && pickerStyles.itemTextDimmed,
        ]}>
          {item}
        </Text>
        {isSelected && <Text style={pickerStyles.suffix}>{suffix}</Text>}
      </View>
    );
  }, [selectedIndex, suffix]);

  // Add padding items for scroll effect
  const paddedData = [...Array(2).fill(null), ...data, ...Array(2).fill(null)];

  return (
    <View style={pickerStyles.column}>
      <FlatList
        ref={flatListRef}
        data={paddedData}
        keyExtractor={(_, index) => `${suffix}-${index}`}
        renderItem={({ item, index }) => {
          if (item === null) {
            return <View style={{ height: ITEM_HEIGHT }} />;
          }
          const dataIndex = index - 2;
          const isSelected = dataIndex === selectedIndex;
          return (
            <View style={[pickerStyles.item, { height: ITEM_HEIGHT }]}>
              <Text style={[
                pickerStyles.itemText,
                isSelected && pickerStyles.itemTextSelected,
                !isSelected && pickerStyles.itemTextDimmed,
              ]}>
                {item}
              </Text>
              {isSelected && <Text style={pickerStyles.suffix}>{suffix}</Text>}
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        style={{ height: PICKER_HEIGHT }}
      />
    </View>
  );
};

const pickerStyles = StyleSheet.create({
  column: {
    flex: 1,
    alignItems: 'center',
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  itemText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#555',
    textAlign: 'center',
  },
  itemTextSelected: {
    color: '#FFF',
    fontSize: 40,
  },
  itemTextDimmed: {
    color: '#444',
  },
  suffix: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 8,
  },
});

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({
  visible,
  onClose,
  onStart,
  isTimerActive,
  remainingSeconds = 0,
  onCancel,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedHour, setSelectedHour] = useState(0);
  const [selectedMinute, setSelectedMinute] = useState(30);

  const formatRemaining = () => {
    const h = Math.floor(remainingSeconds / 3600);
    const m = Math.floor((remainingSeconds % 3600) / 60);
    const s = remainingSeconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const handleStart = () => {
    const totalMinutes = selectedHour * 60 + selectedMinute;
    if (totalMinutes > 0) {
      onStart(totalMinutes);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.dummyFlex} />
      </TouchableOpacity>
      <View style={[styles.container, { paddingBottom: insets.bottom || 24 }]}>
        {/* Drag handle */}
        <View style={styles.dragHandle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Sleep Counter</Text>
          <TouchableOpacity onPress={onClose} data-testid="sleep-timer-close">
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>

        {isTimerActive ? (
          /* Timer is running - show countdown */
          <View style={styles.activeContainer}>
            <Text style={styles.activeLabel}>Radio will stop in</Text>
            <Text style={styles.activeTime}>{formatRemaining()}</Text>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => { onCancel(); onClose(); }}
              data-testid="sleep-timer-cancel"
            >
              <Text style={styles.cancelText}>Cancel Timer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Picker view */
          <>
            <View style={styles.pickerContainer}>
              {/* Selection highlight band */}
              <View style={styles.selectionBand} />

              {/* Hour picker */}
              <PickerColumn
                data={HOURS}
                selectedIndex={selectedHour}
                onSelect={setSelectedHour}
                suffix="h"
              />

              {/* Minute picker */}
              <PickerColumn
                data={MINUTES}
                selectedIndex={selectedMinute}
                onSelect={setSelectedMinute}
                suffix="m"
              />
            </View>

            {/* Start button */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.startButton,
                  (selectedHour === 0 && selectedMinute === 0) && styles.startButtonDisabled,
                ]}
                onPress={handleStart}
                disabled={selectedHour === 0 && selectedMinute === 0}
                data-testid="sleep-timer-start"
              >
                <Text style={styles.startText}>Start</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B1C1E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerSpacer: { width: 50 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    fontStyle: 'italic',
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    fontStyle: 'italic',
  },

  // Picker
  pickerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  selectionBand: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(60, 60, 60, 0.6)',
    borderRadius: 8,
  },

  // Start button
  buttonContainer: {
    paddingHorizontal: 32,
    paddingBottom: 16,
  },
  startButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF4199',
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButtonDisabled: {
    opacity: 0.4,
  },
  startText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },

  // Active timer
  activeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  activeLabel: {
    fontSize: 16,
    color: '#888',
    marginBottom: 12,
  },
  activeTime: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 40,
  },
  cancelButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF4199',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default SleepTimerModal;

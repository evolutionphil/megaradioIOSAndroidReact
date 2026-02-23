import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../store/playerStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const POPUP_SIZE = Math.min(SCREEN_WIDTH * 0.75, 300);

export const RadioErrorModal: React.FC = () => {
  const { playbackState, errorMessage, setError } = usePlayerStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const isVisible = playbackState === 'error';

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
      ]).start();

      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => handleDismiss(), 4000);
      return () => clearTimeout(timer);
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [isVisible]);

  const handleDismiss = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setError(null);
    });
  };

  if (!isVisible) return null;

  return (
    <Modal transparent visible={isVisible} animationType="none" onRequestClose={handleDismiss}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleDismiss}
        data-testid="radio-error-modal"
      >
        <Animated.View style={[styles.popup, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          {/* Outer glow border */}
          <View style={styles.glowBorder}>
            <View style={styles.innerContainer}>
              {/* Radio tower icon */}
              <View style={styles.iconContainer}>
                <Ionicons name="radio" size={80} color="#999" />
              </View>

              {/* Error text */}
              <Text style={styles.errorTitle}>Opss!</Text>
              <Text style={styles.errorMessage}>Radio doesn't work.</Text>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    width: POPUP_SIZE,
    height: POPUP_SIZE,
  },
  glowBorder: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(100, 120, 130, 0.3)',
    backgroundColor: 'rgba(30, 40, 45, 0.5)',
    padding: 6,
  },
  innerContainer: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: 'Ubuntu-Medium',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 16,
    fontWeight: '400',
    color: '#FFF',
    textAlign: 'center',
  },
});

export default RadioErrorModal;

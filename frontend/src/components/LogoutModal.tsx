import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';

interface LogoutModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({
  visible,
  onCancel,
  onConfirm,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Log Out</Text>
          <Text style={styles.message}>Are you sure you want to{'\n'}log out?</Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onCancel}
              data-testid="logout-cancel-btn"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.okButton} 
              onPress={onConfirm}
              data-testid="logout-ok-btn"
            >
              <Text style={styles.okText}>Ok</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  modalContainer: {
    backgroundColor: '#1B1C1E',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#555555',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  okButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF4081',
    justifyContent: 'center',
    alignItems: 'center',
  },
  okText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default LogoutModal;

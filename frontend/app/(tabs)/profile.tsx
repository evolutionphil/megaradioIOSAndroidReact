import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Modal,
  TextInput,
  Alert,
  Linking,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, typography } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/authStore';
import { useLocationStore } from '../../src/store/locationStore';

const COUNTRIES = [
  'Austria', 'Germany', 'Turkey', 'United States', 'United Kingdom',
  'France', 'Spain', 'Italy', 'Netherlands', 'Switzerland',
  'Belgium', 'Sweden', 'Norway', 'Denmark', 'Poland',
  'Czech Republic', 'Hungary', 'Romania', 'Greece', 'Portugal',
  'Brazil', 'Canada', 'Australia', 'Japan', 'India',
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout: clearAuth } = useAuthStore();
  const { country, setCountryManual } = useLocationStore();

  const [notifications, setNotifications] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Account modals
  const [showNameModal, setShowNameModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showVerificationPopup, setShowVerificationPopup] = useState(false);
  const [showPasswordChanged, setShowPasswordChanged] = useState(false);

  // Form values
  const [nameValue, setNameValue] = useState(user?.name || 'Guest');
  const [emailValue, setEmailValue] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const userName = user?.name || 'Guest';
  const userEmail = user?.email || 'guest@megaradio.com';

  const handleLogout = async () => {
    clearAuth();
    router.replace('/');
  };

  const handleEmailSend = () => {
    setShowEmailModal(false);
    setShowVerificationPopup(true);
    setTimeout(() => setShowVerificationPopup(false), 3000);
  };

  const handlePasswordDone = () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setShowPasswordModal(false);
    setShowPasswordChanged(true);
    setTimeout(() => setShowPasswordChanged(false), 3000);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleNameDone = () => {
    setShowNameModal(false);
  };

  const handleCountrySelect = (c: string) => {
    setCountryManual(c);
    setShowCountryPicker(false);
  };

  // ── ACCOUNT SCREEN ──
  if (showAccount) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.accountHeader}>
          <TouchableOpacity onPress={() => setShowAccount(false)} data-testid="account-back">
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.accountTitle}>Account</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.accountList}>
          <TouchableOpacity style={styles.accountRow} onPress={() => setShowNameModal(true)} data-testid="account-name">
            <View>
              <Text style={styles.accountLabel}>Name</Text>
              <Text style={styles.accountValue}>{nameValue}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity style={styles.accountRow} onPress={() => setShowEmailModal(true)} data-testid="account-email">
            <View>
              <Text style={styles.accountLabel}>Email</Text>
              <Text style={styles.accountValue}>{userEmail}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity style={styles.accountRow} onPress={() => setShowPasswordModal(true)} data-testid="account-password">
            <View>
              <Text style={styles.accountLabel}>Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          <View style={styles.divider} />
        </View>

        {/* Change Name Modal */}
        <Modal visible={showNameModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Change your name</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.modalInput}
                  value={nameValue}
                  onChangeText={setNameValue}
                  placeholder="Enter name"
                  placeholderTextColor="#666"
                  autoFocus
                />
                {nameValue.length > 0 && (
                  <TouchableOpacity onPress={() => setNameValue('')} style={styles.clearBtn}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setShowNameModal(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pinkBtn} onPress={handleNameDone}>
                  <Text style={styles.pinkBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Change Email Modal */}
        <Modal visible={showEmailModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Change your email</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.modalInput}
                  value={emailValue}
                  onChangeText={setEmailValue}
                  placeholder="Enter email"
                  placeholderTextColor="#666"
                  keyboardType="email-address"
                  autoFocus
                />
                {emailValue.length > 0 && (
                  <TouchableOpacity onPress={() => setEmailValue('')} style={styles.clearBtn}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setShowEmailModal(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pinkBtn} onPress={handleEmailSend}>
                  <Text style={styles.pinkBtnText}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Verification Sent Popup */}
        <Modal visible={showVerificationPopup} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={32} color="#FF4199" />
              </View>
              <Text style={styles.modalTitle}>We sent you{'\n'}a verification mail!</Text>
              <Text style={styles.modalSubtitle}>Please check your mail</Text>
            </View>
          </View>
        </Modal>

        {/* Change Password Modal */}
        <Modal visible={showPasswordModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Change your password</Text>
              <View style={styles.pwRow}>
                <TextInput
                  style={styles.modalInputFull}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Current password"
                  placeholderTextColor="#666"
                  secureTextEntry={!showCurrentPw}
                />
                <TouchableOpacity onPress={() => setShowCurrentPw(!showCurrentPw)} style={styles.eyeBtn}>
                  <Ionicons name={showCurrentPw ? 'eye' : 'eye-off'} size={20} color="#999" />
                </TouchableOpacity>
              </View>
              <View style={styles.pwRow}>
                <TextInput
                  style={styles.modalInputFull}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New password"
                  placeholderTextColor="#666"
                  secureTextEntry={!showNewPw}
                />
                <TouchableOpacity onPress={() => setShowNewPw(!showNewPw)} style={styles.eyeBtn}>
                  <Ionicons name={showNewPw ? 'eye' : 'eye-off'} size={20} color="#999" />
                </TouchableOpacity>
              </View>
              <View style={styles.pwRow}>
                <TextInput
                  style={styles.modalInputFull}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor="#666"
                  secureTextEntry={!showConfirmPw}
                />
                <TouchableOpacity onPress={() => setShowConfirmPw(!showConfirmPw)} style={styles.eyeBtn}>
                  <Ionicons name={showConfirmPw ? 'eye' : 'eye-off'} size={20} color="#999" />
                </TouchableOpacity>
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pinkBtn} onPress={handlePasswordDone}>
                  <Text style={styles.pinkBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Password Changed Popup */}
        <Modal visible={showPasswordChanged} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={32} color="#FF4199" />
              </View>
              <Text style={styles.modalTitle}>Your password{'\n'}was changed!</Text>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ── COUNTRY PICKER ──
  if (showCountryPicker) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.accountHeader}>
          <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.accountTitle}>Country</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView>
          {COUNTRIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.countryRow, c === country && styles.countryRowActive]}
              onPress={() => handleCountrySelect(c)}
            >
              <Text style={[styles.countryText, c === country && { color: '#FF4199' }]}>{c}</Text>
              {c === country && <Ionicons name="checkmark" size={20} color="#FF4199" />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── MAIN PROFILE SCREEN ──
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header - User info */}
        <View style={styles.header}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={32} color="#888" />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.userStats}>Followers 0    Follows 0</Text>
            </View>
            <TouchableOpacity>
              <Ionicons name="share-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Settings Section */}
        <Text style={styles.sectionLabel}>Settings</Text>

        <TouchableOpacity style={styles.row}>
          <View>
            <Text style={styles.rowTitle}>Play at Login</Text>
            <Text style={styles.rowSubtitle}>Last Played</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={() => setShowCountryPicker(true)} data-testid="profile-country">
          <View>
            <Text style={styles.rowTitle}>Country</Text>
            <Text style={styles.rowSubtitle}>{country || 'Not set'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
        <View style={styles.divider} />

        <TouchableOpacity style={styles.row}>
          <View>
            <Text style={styles.rowTitle}>Language</Text>
            <Text style={styles.rowSubtitle}>English</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
        <View style={styles.divider} />

        <TouchableOpacity style={styles.row}>
          <Text style={styles.rowTitle}>Statistics</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={() => setShowAccount(true)} data-testid="profile-account">
          <Text style={styles.rowTitle}>Account</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.rowTitle}>Notifications</Text>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#333', true: '#FF4199' }}
            thumbColor="#FFF"
          />
        </View>
        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.rowTitle}>Private Profile</Text>
          <Switch
            value={privateProfile}
            onValueChange={setPrivateProfile}
            trackColor={{ false: '#333', true: '#FF4199' }}
            thumbColor="#FFF"
          />
        </View>

        {/* About Section */}
        <Text style={styles.sectionLabel}>About</Text>

        <TouchableOpacity style={styles.row} onPress={() => Linking.openURL('https://themegaradio.com')}>
          <Text style={styles.rowTitle}>Mega Radio</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={() => Linking.openURL('https://themegaradio.com/privacy')}>
          <Text style={styles.rowTitle}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={() => Linking.openURL('https://themegaradio.com/terms')}>
          <Text style={styles.rowTitle}>Terms and Conditions</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        {/* Rate Us */}
        <View style={styles.rateSection}>
          <Text style={{ fontSize: 28, marginBottom: 4 }}>{'*'}</Text>
          <Text style={styles.rateText}>Rate Us On Store</Text>
        </View>

        {/* Social Media */}
        <Text style={styles.socialTitle}>Social Media</Text>
        <View style={styles.socialRow}>
          <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#3b5998' }]} onPress={() => Linking.openURL('https://facebook.com/megaradio')}>
            <FontAwesome5 name="facebook-f" size={22} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#C13584' }]} onPress={() => Linking.openURL('https://instagram.com/megaradio')}>
            <FontAwesome5 name="instagram" size={22} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#1DA1F2' }]} onPress={() => Linking.openURL('https://twitter.com/megaradio')}>
            <FontAwesome5 name="twitter" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Log Out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} data-testid="profile-logout">
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0F' },

  // Header
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' },
  userInfo: { flex: 1 },
  userName: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  userStats: { fontSize: 13, color: '#888', marginTop: 2 },

  // Sections
  sectionLabel: { fontSize: 18, fontWeight: '700', color: '#FFF', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8, backgroundColor: '#1A1A1C' },

  // Rows
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#0D0D0F' },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  rowSubtitle: { fontSize: 13, color: '#888', marginTop: 2 },
  divider: { height: 0.5, backgroundColor: '#333', marginHorizontal: 16 },

  // Rate
  rateSection: { alignItems: 'center', paddingVertical: 24 },
  rateText: { fontSize: 16, fontWeight: '600', color: '#FFF' },

  // Social
  socialTitle: { fontSize: 16, fontWeight: '700', color: '#FFF', textAlign: 'center', marginBottom: 12 },
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 20 },
  socialBtn: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },

  // Logout
  logoutBtn: { alignSelf: 'center', paddingHorizontal: 40, paddingVertical: 12, borderRadius: 20, backgroundColor: '#333', marginTop: 8 },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#FFF' },

  // Account screen
  accountHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  accountTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  accountList: { paddingTop: 8 },
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  accountLabel: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  accountValue: { fontSize: 14, color: '#888', marginTop: 2 },

  // Country picker
  countryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#333' },
  countryRowActive: { backgroundColor: 'rgba(255,65,153,0.08)' },
  countryText: { fontSize: 16, color: '#FFF' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  modalBox: { width: '100%', backgroundColor: '#1B1C1E', borderRadius: 16, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', textAlign: 'center', marginBottom: 16 },
  modalSubtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 4 },
  inputRow: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 24, paddingHorizontal: 16, height: 48, marginBottom: 16 },
  modalInput: { flex: 1, fontSize: 16, color: '#000' },
  clearBtn: { marginLeft: 8 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 16 },
  cancelText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  pinkBtn: { paddingHorizontal: 32, paddingVertical: 10, borderRadius: 20, backgroundColor: '#FF4199' },
  pinkBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  checkCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#FF4199', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },

  // Password modal
  pwRow: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A2A', borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 12 },
  modalInputFull: { flex: 1, fontSize: 16, color: '#FFF' },
  eyeBtn: { marginLeft: 8 },
});

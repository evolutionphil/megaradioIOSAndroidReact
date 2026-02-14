import React, { useState, useCallback, useEffect } from 'react';
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
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../src/store/authStore';
import { useLocationStore } from '../../src/store/locationStore';
import api from '../../src/services/api';
import API_ENDPOINTS from '../../src/constants/api';
import { LogoutModal } from '../../src/components/LogoutModal';

// Country type for rich format
interface CountryData {
  name: string;
  nativeName: string;
  code: string;
  flag: string;
  flagUrl: string;
  stationCount: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout: clearAuth } = useAuthStore();
  const { country, setCountryManual } = useLocationStore();

  const [notifications, setNotifications] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(false);
  const [currentPage, setCurrentPage] = useState<'main' | 'account' | 'country'>('main');

  // Account modals
  const [showNameModal, setShowNameModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showVerificationPopup, setShowVerificationPopup] = useState(false);
  const [showPasswordChanged, setShowPasswordChanged] = useState(false);

  const [nameValue, setNameValue] = useState(user?.name || 'Guest');
  const [emailValue, setEmailValue] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Country picker
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  
  // Logout modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // Avatar upload
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);

  const userName = user?.name || user?.fullName || nameValue || 'Guest';
  const userEmail = user?.email || 'guest@megaradio.com';
  
  // Build full avatar URL if relative
  let userAvatar = user?.profilePhoto || user?.avatar || null;
  if (userAvatar && !userAvatar.startsWith('http')) {
    userAvatar = `https://themegaradio.com${userAvatar}`;
  }
  
  // Use real followers/following count from user data
  const followersCount = user?.followersCount || 0;
  const followsCount = user?.followingCount || 0;

  // Fetch countries from API with rich format (includes flags)
  useEffect(() => {
    if (currentPage === 'country' && countries.length === 0) {
      setCountriesLoading(true);
      api.get(`${API_ENDPOINTS.countries}?format=rich`)
        .then(res => setCountries(res.data || []))
        .catch(() => {})
        .finally(() => setCountriesLoading(false));
    }
  }, [currentPage]);

  const filteredCountries = countrySearch
    ? countries.filter(c => 
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.nativeName.toLowerCase().includes(countrySearch.toLowerCase())
      )
    : countries;

  const handleLogout = async () => {
    setShowLogoutModal(false);
    clearAuth();
    router.replace('/(tabs)');
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
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
  };

  const handleCountrySelect = (countryData: CountryData) => {
    setCountryManual(countryData.name);
    setCurrentPage('main');
  };

  // Avatar upload handler
  const handleAvatarUpload = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload an avatar.');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      setAvatarUploading(true);
      
      // Show local preview immediately
      setLocalAvatar(asset.uri);

      // Create form data for upload
      const formData = new FormData();
      const fileName = asset.uri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(fileName);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      formData.append('avatar', {
        uri: asset.uri,
        name: fileName,
        type,
      } as any);

      // Upload to API
      const response = await api.post('https://themegaradio.com/api/auth/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data?.avatar || response.data?.user?.avatar) {
        const newAvatarUrl = response.data.avatar || response.data.user?.avatar;
        // Update auth store with new avatar
        const { updateUser } = useAuthStore.getState();
        if (updateUser && user) {
          updateUser({ ...user, avatar: newAvatarUrl, profilePhoto: newAvatarUrl });
        }
        Alert.alert('Success', 'Avatar updated successfully!');
      }
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      setLocalAvatar(null); // Revert preview
      Alert.alert('Error', error.response?.data?.message || 'Failed to upload avatar. Please try again.');
    } finally {
      setAvatarUploading(false);
    }
  };

  // ── COUNTRY PICKER ──
  if (currentPage === 'country') {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.subHeader}>
          <TouchableOpacity onPress={() => setCurrentPage('main')}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={s.subTitle}>Country</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Search */}
        <View style={s.searchBar}>
          <TextInput
            style={s.searchInput}
            placeholder="Search Country"
            placeholderTextColor="#999"
            value={countrySearch}
            onChangeText={setCountrySearch}
          />
          <Ionicons name="search" size={20} color="#999" />
        </View>

        {countriesLoading ? (
          <ActivityIndicator size="large" color="#FF4199" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => {
              const isSelected = item.name === country || item.nativeName === country;
              return (
                <TouchableOpacity
                  style={[s.countryRow, isSelected && s.countryRowActive]}
                  onPress={() => handleCountrySelect(item)}
                >
                  <Text style={s.flagEmoji}>{item.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.countryName}>{item.name}</Text>
                    {item.nativeName !== item.name && (
                      <Text style={s.countryNative}>{item.nativeName}</Text>
                    )}
                  </View>
                  <Text style={s.stationCount}>{item.stationCount}</Text>
                  <View style={[s.radioCircle, isSelected && s.radioCircleActive]}>
                    {isSelected && <View style={s.radioCircleFill} />}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>
    );
  }

  // ── ACCOUNT SCREEN ──
  if (currentPage === 'account') {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.subHeader}>
          <TouchableOpacity onPress={() => setCurrentPage('main')}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={s.subTitle}>Account</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ paddingTop: 8 }}>
          <TouchableOpacity style={s.accountRow} onPress={() => setShowNameModal(true)}>
            <View><Text style={s.aLabel}>Name</Text><Text style={s.aValue}>{nameValue}</Text></View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          <View style={s.divider} />
          <TouchableOpacity style={s.accountRow} onPress={() => setShowEmailModal(true)}>
            <View><Text style={s.aLabel}>Email</Text><Text style={s.aValue}>{userEmail}</Text></View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          <View style={s.divider} />
          <TouchableOpacity style={s.accountRow} onPress={() => setShowPasswordModal(true)}>
            <Text style={s.aLabel}>Password</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Name Modal */}
        <Modal visible={showNameModal} transparent animationType="fade">
          <View style={s.mOverlay}><View style={s.mBox}>
            <Text style={s.mTitle}>Change your name</Text>
            <View style={s.mInputRow}>
              <TextInput style={s.mInput} value={nameValue} onChangeText={setNameValue} placeholder="Enter name" placeholderTextColor="#666" autoFocus />
              {nameValue.length > 0 && <TouchableOpacity onPress={() => setNameValue('')}><Ionicons name="close-circle" size={20} color="#999" /></TouchableOpacity>}
            </View>
            <View style={s.mActions}>
              <TouchableOpacity onPress={() => setShowNameModal(false)}><Text style={s.mCancel}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.mPinkBtn} onPress={() => setShowNameModal(false)}><Text style={s.mPinkText}>Done</Text></TouchableOpacity>
            </View>
          </View></View>
        </Modal>

        {/* Email Modal */}
        <Modal visible={showEmailModal} transparent animationType="fade">
          <View style={s.mOverlay}><View style={s.mBox}>
            <Text style={s.mTitle}>Change your email</Text>
            <View style={s.mInputRow}>
              <TextInput style={s.mInput} value={emailValue} onChangeText={setEmailValue} placeholder="Enter email" placeholderTextColor="#666" keyboardType="email-address" autoFocus />
            </View>
            <View style={s.mActions}>
              <TouchableOpacity onPress={() => setShowEmailModal(false)}><Text style={s.mCancel}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.mPinkBtn} onPress={handleEmailSend}><Text style={s.mPinkText}>Send</Text></TouchableOpacity>
            </View>
          </View></View>
        </Modal>

        {/* Verification Popup */}
        <Modal visible={showVerificationPopup} transparent animationType="fade">
          <View style={s.mOverlay}><View style={s.mBox}>
            <View style={s.checkCircle}><Ionicons name="checkmark" size={32} color="#FF4199" /></View>
            <Text style={s.mTitle}>We sent you{'\n'}a verification mail!</Text>
            <Text style={s.mSub}>Please check your mail</Text>
          </View></View>
        </Modal>

        {/* Password Modal */}
        <Modal visible={showPasswordModal} transparent animationType="fade">
          <View style={s.mOverlay}><View style={s.mBox}>
            <Text style={s.mTitle}>Change your password</Text>
            {[
              { val: currentPassword, set: setCurrentPassword, show: showCurrentPw, toggle: () => setShowCurrentPw(!showCurrentPw), ph: 'Current password' },
              { val: newPassword, set: setNewPassword, show: showNewPw, toggle: () => setShowNewPw(!showNewPw), ph: 'New password' },
              { val: confirmPassword, set: setConfirmPassword, show: showConfirmPw, toggle: () => setShowConfirmPw(!showConfirmPw), ph: 'Confirm new password' },
            ].map((f, i) => (
              <View key={i} style={s.pwRow}>
                <TextInput style={s.pwInput} value={f.val} onChangeText={f.set} placeholder={f.ph} placeholderTextColor="#666" secureTextEntry={!f.show} />
                <TouchableOpacity onPress={f.toggle}><Ionicons name={f.show ? 'eye' : 'eye-off'} size={20} color="#999" /></TouchableOpacity>
              </View>
            ))}
            <View style={s.mActions}>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}><Text style={s.mCancel}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.mPinkBtn} onPress={handlePasswordDone}><Text style={s.mPinkText}>Done</Text></TouchableOpacity>
            </View>
          </View></View>
        </Modal>

        {/* Password Changed */}
        <Modal visible={showPasswordChanged} transparent animationType="fade">
          <View style={s.mOverlay}><View style={s.mBox}>
            <View style={s.checkCircle}><Ionicons name="checkmark" size={32} color="#FF4199" /></View>
            <Text style={s.mTitle}>Your password{'\n'}was changed!</Text>
          </View></View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ── MAIN PROFILE ──
  // If not authenticated, show login prompt
  if (!user) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.guestContainer}>
          <View style={s.guestAvatar}>
            <Ionicons name="person" size={48} color="#888" />
          </View>
          <Text style={s.guestSubtitle}>Sign in to access your profile, favorites, and more</Text>
          <TouchableOpacity 
            style={s.loginBtn} 
            onPress={() => router.push('/auth-options')}
            data-testid="profile-login-btn"
          >
            <Text style={s.loginBtnText}>Sign In / Sign Up</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.avatarRow}>
            <TouchableOpacity 
              style={s.avatar}
              onPress={handleAvatarUpload}
              disabled={avatarUploading}
              data-testid="profile-avatar-btn"
            >
              {avatarUploading ? (
                <ActivityIndicator size="small" color="#FF4199" />
              ) : (localAvatar || userAvatar) ? (
                <Image source={{ uri: localAvatar || userAvatar }} style={s.avatarImage} />
              ) : (
                <Ionicons name="person" size={32} color="#888" />
              )}
              {/* Camera badge */}
              <View style={s.cameraBadge}>
                <Ionicons name="camera" size={12} color="#FFF" />
              </View>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.userName}>{userName}</Text>
              <View style={s.statsRow}>
                <TouchableOpacity 
                  style={s.statTouchable}
                  onPress={() => router.push('/followers')} 
                  data-testid="profile-followers-btn"
                >
                  <Text style={s.statNumber}>{followersCount}</Text>
                  <Text style={s.statLabel}>Followers</Text>
                </TouchableOpacity>
                <View style={s.statDivider} />
                <TouchableOpacity 
                  style={s.statTouchable}
                  onPress={() => router.push('/follows')} 
                  data-testid="profile-follows-btn"
                >
                  <Text style={s.statNumber}>{followsCount}</Text>
                  <Text style={s.statLabel}>Follows</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity><Ionicons name="share-outline" size={22} color="#FFF" /></TouchableOpacity>
          </View>
        </View>

        {/* Settings */}
        <Text style={s.sectionLabel}>Settings</Text>
        {[
          { title: 'Play at Login', sub: 'Last Played', onPress: () => router.push('/play-at-login') },
          { title: 'Country', sub: country || 'Not set', onPress: () => setCurrentPage('country') },
          { title: 'Language', sub: 'English', onPress: () => router.push('/languages' as any) },
          { title: 'Statistics', onPress: () => router.push('/statistics') },
          { title: 'Account', onPress: () => setCurrentPage('account') },
        ].map((item, i) => (
          <React.Fragment key={i}>
            <TouchableOpacity style={s.row} onPress={item.onPress}>
              <View>
                <Text style={s.rowTitle}>{item.title}</Text>
                {item.sub && <Text style={s.rowSub}>{item.sub}</Text>}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
            <View style={s.divider} />
          </React.Fragment>
        ))}

        <View style={s.row}>
          <Text style={s.rowTitle}>Notifications</Text>
          <Switch value={notifications} onValueChange={setNotifications} trackColor={{ false: '#333', true: '#FF4199' }} thumbColor="#FFF" />
        </View>
        <View style={s.divider} />
        <View style={s.row}>
          <Text style={s.rowTitle}>Private Profile</Text>
          <Switch value={privateProfile} onValueChange={setPrivateProfile} trackColor={{ false: '#333', true: '#FF4199' }} thumbColor="#FFF" />
        </View>

        {/* About */}
        <Text style={s.sectionLabel}>About</Text>
        {['Mega Radio', 'Privacy Policy', 'Terms and Conditions'].map((title, i) => (
          <React.Fragment key={i}>
            <TouchableOpacity style={s.row}>
              <Text style={s.rowTitle}>{title}</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
            {i < 2 && <View style={s.divider} />}
          </React.Fragment>
        ))}

        {/* Social */}
        <Text style={[s.sectionLabel, { textAlign: 'center', backgroundColor: 'transparent' }]}>Social Media</Text>
        <View style={s.socialRow}>
          {[
            { name: 'facebook-f' as const, bg: '#3b5998' },
            { name: 'instagram' as const, bg: '#C13584' },
            { name: 'twitter' as const, bg: '#1DA1F2' },
          ].map((soc) => (
            <TouchableOpacity key={soc.name} style={[s.socialBtn, { backgroundColor: soc.bg }]}>
              <FontAwesome5 name={soc.name} size={22} color="#FFF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={() => setShowLogoutModal(true)} data-testid="profile-logout-btn">
          <Text style={s.logoutText}>Log Out</Text>
        </TouchableOpacity>
        <View style={{ height: 80 }} />
      </ScrollView>
      
      {/* Logout Modal */}
      <LogoutModal
        visible={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0F' },
  // Header
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: 56, height: 56, borderRadius: 28 },
  userName: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  statsRow: { flexDirection: 'row', marginTop: 4, alignItems: 'center' },
  statTouchable: { alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8 },
  statNumber: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  statLabel: { fontSize: 13, color: '#888', marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: '#333', marginHorizontal: 8 },
  // Section
  sectionLabel: { fontSize: 18, fontWeight: '700', color: '#FFF', paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },
  // Rows
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  rowSub: { fontSize: 13, color: '#888', marginTop: 2 },
  divider: { height: 0.5, backgroundColor: '#2A2A2A', marginHorizontal: 16 },
  // Social
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 20 },
  socialBtn: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  // Logout
  logoutBtn: { alignSelf: 'center', paddingHorizontal: 40, paddingVertical: 12, borderRadius: 20, backgroundColor: '#333', marginTop: 8 },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  // Sub pages header
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  subTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  // Account
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  aLabel: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  aValue: { fontSize: 14, color: '#888', marginTop: 2 },
  // Country picker
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 16, height: 48 },
  searchInput: { flex: 1, fontSize: 16, color: '#000' },
  countryRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#1A1A1C', marginHorizontal: 12, marginBottom: 6, borderRadius: 12, gap: 12 },
  countryRowActive: { borderWidth: 1, borderColor: '#FF4199' },
  flagEmoji: { fontSize: 28, width: 40, textAlign: 'center' },
  countryName: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  countryNative: { fontSize: 13, color: '#888', marginTop: 2 },
  stationCount: { fontSize: 13, color: '#888', marginRight: 12 },
  radioCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#FF4199', justifyContent: 'center', alignItems: 'center' },
  radioCircleActive: { borderColor: '#FF4199' },
  radioCircleFill: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF4199' },
  // Modals
  mOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  mBox: { width: '100%', backgroundColor: '#1B1C1E', borderRadius: 16, padding: 24, alignItems: 'center' },
  mTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', textAlign: 'center', marginBottom: 16 },
  mSub: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 4 },
  mInputRow: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 24, paddingHorizontal: 16, height: 48, marginBottom: 16 },
  mInput: { flex: 1, fontSize: 16, color: '#000' },
  mActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 16 },
  mCancel: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  mPinkBtn: { paddingHorizontal: 32, paddingVertical: 10, borderRadius: 20, backgroundColor: '#FF4199' },
  mPinkText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  checkCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#FF4199', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  pwRow: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A2A', borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 12 },
  pwInput: { flex: 1, fontSize: 16, color: '#FFF' },
  // Guest state
  guestContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  guestAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#1A1A1D', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  guestTitle: { fontSize: 24, fontWeight: '700', color: '#FFF', marginBottom: 8, textAlign: 'center' },
  guestSubtitle: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  loginBtn: { width: '100%', height: 56, borderRadius: 28, backgroundColor: '#FF4B8C', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  loginBtnText: { fontSize: 17, fontWeight: '600', color: '#FFF' },
  skipBtn: { width: '100%', height: 56, borderRadius: 28, borderWidth: 1, borderColor: '#3A3A3D', justifyContent: 'center', alignItems: 'center' },
  skipBtnText: { fontSize: 17, fontWeight: '600', color: '#FFF' },
});

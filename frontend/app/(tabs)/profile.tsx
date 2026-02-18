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
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/authStore';
import { useLocationStore } from '../../src/store/locationStore';
import { useLanguageStore } from '../../src/store/languageStore';
import api from '../../src/services/api';
import API_ENDPOINTS from '../../src/constants/api';
import { LogoutModal } from '../../src/components/LogoutModal';
import appService, { AppInfo } from '../../src/services/appService';

// Language display names
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  tr: 'Türkçe',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  nl: 'Nederlands',
  pl: 'Polski',
  ru: 'Русский',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
  ar: 'العربية',
};

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
  const { t } = useTranslation();
  const { user, logout: clearAuth } = useAuthStore();
  const { country, setCountryManual } = useLocationStore();
  const { currentLanguage, languageVersion } = useLanguageStore();

  const [notifications, setNotifications] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(false);
  const [privateProfileLoading, setPrivateProfileLoading] = useState(false);
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

  // App info from API
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

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

  // Sync private profile status from user data
  useEffect(() => {
    if (user) {
      // API returns isPublicProfile: true means profile is public
      // So privateProfile = !isPublicProfile
      setPrivateProfile(user.isPublicProfile === false);
    }
  }, [user]);

  // Fetch app info (social media links, etc.)
  useEffect(() => {
    appService.getAppInfo().then(info => {
      if (info) setAppInfo(info);
    });
  }, []);

  // Handle private profile toggle
  const handlePrivateProfileToggle = async (value: boolean) => {
    if (!user) return;
    
    setPrivateProfileLoading(true);
    const previousValue = privateProfile;
    
    // Optimistic update
    setPrivateProfile(value);
    
    try {
      // API expects isPublicProfile (inverse of privateProfile)
      await api.put('https://themegaradio.com/api/auth/profile', {
        isPublicProfile: !value
      });
      
      // Update user in auth store
      const { updateUser } = useAuthStore.getState();
      if (updateUser) {
        updateUser({ ...user, isPublicProfile: !value });
      }
    } catch (error) {
      console.error('Failed to update profile privacy:', error);
      // Revert on error
      setPrivateProfile(previousValue);
    } finally {
      setPrivateProfileLoading(false);
    }
  };

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
          <Text style={s.subTitle}>{t('country', 'Country')}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Search */}
        <View style={s.searchBar}>
          <TextInput
            style={s.searchInput}
            placeholder={t('search_country', 'Search Country')}
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
          <Text style={s.subTitle}>{t('account', 'Account')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ paddingTop: 8 }}>
          <TouchableOpacity style={s.accountRow} onPress={() => setShowNameModal(true)}>
            <View><Text style={s.aLabel}>{t('name', 'Name')}</Text><Text style={s.aValue}>{nameValue}</Text></View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          <View style={s.divider} />
          <TouchableOpacity style={s.accountRow} onPress={() => setShowEmailModal(true)}>
            <View><Text style={s.aLabel}>{t('email', 'Email')}</Text><Text style={s.aValue}>{userEmail}</Text></View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          <View style={s.divider} />
          <TouchableOpacity style={s.accountRow} onPress={() => setShowPasswordModal(true)}>
            <Text style={s.aLabel}>{t('password', 'Password')}</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Name Modal */}
        <Modal visible={showNameModal} transparent animationType="fade">
          <View style={s.mOverlay}><View style={s.mBox}>
            <Text style={s.mTitle}>{t('change_name', 'Change your name')}</Text>
            <View style={s.mInputRow}>
              <TextInput style={s.mInput} value={nameValue} onChangeText={setNameValue} placeholder={t('name', 'Name')} placeholderTextColor="#666" autoFocus />
              {nameValue.length > 0 && <TouchableOpacity onPress={() => setNameValue('')}><Ionicons name="close-circle" size={20} color="#999" /></TouchableOpacity>}
            </View>
            <View style={s.mActions}>
              <TouchableOpacity onPress={() => setShowNameModal(false)}><Text style={s.mCancel}>{t('cancel', 'Cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={s.mPinkBtn} onPress={() => setShowNameModal(false)}><Text style={s.mPinkText}>{t('done', 'Done')}</Text></TouchableOpacity>
            </View>
          </View></View>
        </Modal>

        {/* Email Modal */}
        <Modal visible={showEmailModal} transparent animationType="fade">
          <View style={s.mOverlay}><View style={s.mBox}>
            <Text style={s.mTitle}>{t('change_email', 'Change your email')}</Text>
            <View style={s.mInputRow}>
              <TextInput style={s.mInput} value={emailValue} onChangeText={setEmailValue} placeholder={t('email', 'Email')} placeholderTextColor="#666" keyboardType="email-address" autoFocus />
            </View>
            <View style={s.mActions}>
              <TouchableOpacity onPress={() => setShowEmailModal(false)}><Text style={s.mCancel}>{t('cancel', 'Cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={s.mPinkBtn} onPress={handleEmailSend}><Text style={s.mPinkText}>{t('save', 'Save')}</Text></TouchableOpacity>
            </View>
          </View></View>
        </Modal>

        {/* Verification Popup */}
        <Modal visible={showVerificationPopup} transparent animationType="fade">
          <View style={s.mOverlay}><View style={s.mBox}>
            <View style={s.checkCircle}><Ionicons name="checkmark" size={32} color="#FF4199" /></View>
            <Text style={s.mTitle}>{t('verification_sent', 'We sent you a verification mail!')}</Text>
            <Text style={s.mSub}>{t('check_mail', 'Please check your mail')}</Text>
          </View></View>
        </Modal>

        {/* Password Modal */}
        <Modal visible={showPasswordModal} transparent animationType="fade">
          <View style={s.mOverlay}><View style={s.mBox}>
            <Text style={s.mTitle}>{t('change_password', 'Change your password')}</Text>
            {[
              { val: currentPassword, set: setCurrentPassword, show: showCurrentPw, toggle: () => setShowCurrentPw(!showCurrentPw), ph: t('current_password', 'Current password') },
              { val: newPassword, set: setNewPassword, show: showNewPw, toggle: () => setShowNewPw(!showNewPw), ph: t('new_password', 'New password') },
              { val: confirmPassword, set: setConfirmPassword, show: showConfirmPw, toggle: () => setShowConfirmPw(!showConfirmPw), ph: t('confirm_password', 'Confirm new password') },
            ].map((f, i) => (
              <View key={i} style={s.pwRow}>
                <TextInput style={s.pwInput} value={f.val} onChangeText={f.set} placeholder={f.ph} placeholderTextColor="#666" secureTextEntry={!f.show} />
                <TouchableOpacity onPress={f.toggle}><Ionicons name={f.show ? 'eye' : 'eye-off'} size={20} color="#999" /></TouchableOpacity>
              </View>
            ))}
            <View style={s.mActions}>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}><Text style={s.mCancel}>{t('cancel', 'Cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={s.mPinkBtn} onPress={handlePasswordDone}><Text style={s.mPinkText}>{t('done', 'Done')}</Text></TouchableOpacity>
            </View>
          </View></View>
        </Modal>

        {/* Password Changed */}
        <Modal visible={showPasswordChanged} transparent animationType="fade">
          <View style={s.mOverlay}><View style={s.mBox}>
            <View style={s.checkCircle}><Ionicons name="checkmark" size={32} color="#FF4199" /></View>
            <Text style={s.mTitle}>{t('password_changed', 'Your password was changed!')}</Text>
          </View></View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ── MAIN PROFILE ──
  // If not authenticated, show Guest User Settings
  if (!user) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Guest Header */}
          <View style={s.header}>
            <View style={s.avatarRow}>
              <View style={s.avatar}>
                <Ionicons name="person" size={48} color="#888" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{t('guest_user', 'Guest User')}</Text>
              </View>
            </View>
          </View>

          {/* Settings Section */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>{t('settings', 'Settings')}</Text>

            {/* Account - Redirects to Login */}
            <TouchableOpacity 
              style={s.row} 
              onPress={() => router.push('/auth-options')}
              data-testid="guest-account-btn"
            >
              <Ionicons name="person-outline" size={22} color="#FFF" style={s.rowIcon} />
              <Text style={s.rowText}>{t('account', 'Account')}</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>

            {/* Language Picker */}
            <TouchableOpacity 
              style={s.row}
              onPress={() => router.push('/languages')}
              data-testid="guest-language-btn"
            >
              <Ionicons name="language-outline" size={22} color="#FFF" style={s.rowIcon} />
              <Text style={s.rowText}>{t('language', 'Language')}</Text>
              <View style={s.rowRight}>
                <Text style={s.rowVal}>{LANGUAGE_NAMES[currentLanguage] || 'English'}</Text>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </View>
            </TouchableOpacity>

            {/* Country Picker */}
            <TouchableOpacity 
              style={s.row} 
              onPress={() => setCurrentPage('country')}
              data-testid="guest-country-btn"
            >
              <Ionicons name="location-outline" size={22} color="#FFF" style={s.rowIcon} />
              <Text style={s.rowText}>{t('country', 'Country')}</Text>
              <View style={s.rowRight}>
                <Text style={s.rowVal}>{country || 'Not set'}</Text>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </View>
            </TouchableOpacity>

            {/* Private Profile - Login Required */}
            <TouchableOpacity 
              style={s.row} 
              onPress={() => router.push('/auth-options')}
              data-testid="guest-private-profile-btn"
            >
              <Ionicons name="lock-closed-outline" size={22} color="#FFF" style={s.rowIcon} />
              <Text style={s.rowText}>{t('private_profile', 'Private Profile')}</Text>
              <View style={s.rowRight}>
                <Text style={[s.rowVal, { color: '#888' }]}>{t('login_required', 'Login Required')}</Text>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </View>
            </TouchableOpacity>
          </View>

          {/* About Section */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>{t('about', 'About')}</Text>

            <TouchableOpacity style={s.row} onPress={() => router.push({ pathname: '/static-page', params: { type: 'about' } })}>
              <Ionicons name="information-circle-outline" size={22} color="#FFF" style={s.rowIcon} />
              <Text style={s.rowText}>{t('about_us', 'About Us')}</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity style={s.row} onPress={() => router.push({ pathname: '/static-page', params: { type: 'terms' } })}>
              <Ionicons name="document-text-outline" size={22} color="#FFF" style={s.rowIcon} />
              <Text style={s.rowText}>{t('terms', 'Terms of Service')}</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity style={s.row} onPress={() => router.push({ pathname: '/static-page', params: { type: 'privacy' } })}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#FFF" style={s.rowIcon} />
              <Text style={s.rowText}>{t('privacy', 'Privacy Policy')}</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <View style={s.section}>
            <TouchableOpacity 
              style={s.loginBtn} 
              onPress={() => router.push('/auth-options')}
              data-testid="guest-login-btn"
            >
              <Text style={s.loginBtnText}>{t('sign_in_sign_up', 'Sign In / Sign Up')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
                  <Text style={s.statLabel}>{t('followers', 'Followers')}</Text>
                </TouchableOpacity>
                <View style={s.statDivider} />
                <TouchableOpacity 
                  style={s.statTouchable}
                  onPress={() => router.push('/follows')} 
                  data-testid="profile-follows-btn"
                >
                  <Text style={s.statNumber}>{followsCount}</Text>
                  <Text style={s.statLabel}>{t('follows', 'Follows')}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity><Ionicons name="share-outline" size={22} color="#FFF" /></TouchableOpacity>
          </View>
        </View>

        {/* Settings */}
        <Text style={s.sectionLabel}>{t('settings', 'Settings')}</Text>
        {[
          { title: t('play_at_login', 'Play at Login'), sub: t('last_played', 'Last Played'), onPress: () => router.push('/play-at-login') },
          { title: t('country', 'Country'), sub: country || t('not_set', 'Not set'), onPress: () => setCurrentPage('country') },
          { title: t('language', 'Language'), sub: LANGUAGE_NAMES[currentLanguage] || currentLanguage, onPress: () => router.push('/languages' as any) },
          { title: t('statistics', 'Statistics'), onPress: () => router.push('/statistics') },
          { title: t('account', 'Account'), onPress: () => setCurrentPage('account') },
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
          <Text style={s.rowTitle}>{t('notifications_setting', 'Notifications')}</Text>
          <Switch value={notifications} onValueChange={setNotifications} trackColor={{ false: '#333', true: '#FF4199' }} thumbColor="#FFF" />
        </View>
        <View style={s.divider} />
        <View style={s.row}>
          <Text style={s.rowTitle}>{t('private_profile', 'Private Profile')}</Text>
          <Switch 
            value={privateProfile} 
            onValueChange={handlePrivateProfileToggle} 
            trackColor={{ false: '#333', true: '#FF4199' }} 
            thumbColor="#FFF"
            disabled={privateProfileLoading}
          />
        </View>

        {/* About */}
        <Text style={s.sectionLabel}>{t('about', 'About')}</Text>
        <TouchableOpacity style={s.row} onPress={() => router.push({ pathname: '/static-page', params: { type: 'about' } })}>
          <Text style={s.rowTitle}>{t('about_us', 'About Us')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
        <View style={s.divider} />
        <TouchableOpacity style={s.row} onPress={() => router.push({ pathname: '/static-page', params: { type: 'privacy' } })}>
          <Text style={s.rowTitle}>{t('privacy_policy', 'Privacy Policy')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
        <View style={s.divider} />
        <TouchableOpacity style={s.row} onPress={() => router.push({ pathname: '/static-page', params: { type: 'terms' } })}>
          <Text style={s.rowTitle}>{t('terms_conditions', 'Terms and Conditions')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        {/* Social */}
        <Text style={[s.sectionLabel, { textAlign: 'center', backgroundColor: 'transparent' }]}>{t('social_media', 'Social Media')}</Text>
        <View style={s.socialRow}>
          {[
            { name: 'facebook-f' as const, bg: '#3b5998', url: appInfo?.social?.facebook },
            { name: 'instagram' as const, bg: '#C13584', url: appInfo?.social?.instagram },
            { name: 'twitter' as const, bg: '#1DA1F2', url: appInfo?.social?.twitter },
          ].map((soc) => (
            <TouchableOpacity 
              key={soc.name} 
              style={[s.socialBtn, { backgroundColor: soc.bg }]}
              onPress={() => soc.url && Linking.openURL(soc.url)}
            >
              <FontAwesome5 name={soc.name} size={22} color="#FFF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={() => setShowLogoutModal(true)} data-testid="profile-logout-btn">
          <Text style={s.logoutText}>{t('log_out', 'Log Out')}</Text>
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
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative' as const },
  avatarImage: { width: 56, height: 56, borderRadius: 28 },
  cameraBadge: { position: 'absolute' as const, bottom: 0, right: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: '#FF4199', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0D0D0F' },
  name: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  userName: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  statsRow: { flexDirection: 'row', marginTop: 4, alignItems: 'center' },
  statTouchable: { alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8 },
  statNumber: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  statLabel: { fontSize: 13, color: '#888', marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: '#333', marginHorizontal: 8 },
  // Section
  section: { marginBottom: 8 },
  sectionLabel: { fontSize: 18, fontWeight: '700', color: '#FFF', paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },
  // Rows
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#1A1A1C', marginHorizontal: 16, marginBottom: 8, borderRadius: 12 },
  rowIcon: { marginRight: 12 },
  rowText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#FFF' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowVal: { fontSize: 14, color: '#888' },
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
  loginBtn: { marginHorizontal: 16, height: 56, borderRadius: 28, backgroundColor: '#FF4B8C', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  loginBtnText: { fontSize: 17, fontWeight: '600', color: '#FFF' },
  skipBtn: { width: '100%', height: 56, borderRadius: 28, borderWidth: 1, borderColor: '#3A3A3D', justifyContent: 'center', alignItems: 'center' },
  skipBtnText: { fontSize: 17, fontWeight: '600', color: '#FFF' },
});

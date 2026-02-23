import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useLanguageStore } from '../src/store/languageStore';
import { getAvailableLanguages, changeLanguage } from '../src/services/i18nService';

interface Language {
  code: string;
  name: string;
}

// Supported languages with their native names
const NATIVE_NAMES: Record<string, string> = {
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

export default function LanguagesScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { currentLanguage, setLanguage, isLoading: languageLoading, initialize, languageVersion } = useLanguageStore();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  
  // Animation value for language change effect
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Initialize language store and fetch available languages
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        await initialize();
        const availableLanguages = await getAvailableLanguages();
        setLanguages(availableLanguages);
      } catch (error) {
        console.error('Error initializing languages:', error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const handleLanguageSelect = async (code: string) => {
    if (code === currentLanguage || isChanging) return;
    
    setIsChanging(true);
    
    // Animate out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      try {
        await setLanguage(code);
        
        // Animate back in
        Animated.parallel([
          Animated.spring(fadeAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }),
        ]).start();
      } catch (error) {
        console.error('Error saving language:', error);
        // Reset animation on error
        fadeAnim.setValue(1);
        scaleAnim.setValue(1);
      } finally {
        setIsChanging(false);
      }
    });
  };

  // Filter languages by search
  const filteredLanguages = searchQuery
    ? languages.filter(
        (lang) =>
          lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (NATIVE_NAMES[lang.code]?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
          lang.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : languages;

  // Use i18n.language for real-time current language (not just store value)
  const activeLanguage = i18n.language || currentLanguage;

  const renderLanguageItem = ({ item }: { item: Language }) => {
    const isSelected = activeLanguage === item.code;
    const nativeName = NATIVE_NAMES[item.code] || item.name;

    return (
      <TouchableOpacity
        style={[styles.languageRow, isSelected && styles.languageRowActive]}
        onPress={() => handleLanguageSelect(item.code)}
        disabled={isChanging}
        data-testid={`language-${item.code}`}
      >
        <View style={styles.languageInfo}>
          <Text style={styles.languageName}>{item.name}</Text>
          <Text style={styles.languageNative}>{nativeName}</Text>
        </View>
        <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
          {isSelected && <View style={styles.radioCircleFill} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View 
        style={[
          styles.animatedContainer,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} data-testid="back-btn">
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('languages', 'Languages')}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder={t('search_placeholder', 'Search...')}
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              data-testid="language-search-input"
            />
            <Ionicons name="search" size={20} color="#999" />
          </View>
        </View>

        {/* Language List */}
        {isLoading || languageLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF4199" />
          </View>
        ) : (
          <FlatList
            data={filteredLanguages}
            renderItem={renderLanguageItem}
            keyExtractor={(item) => item.code}
            extraData={activeLanguage} // Force re-render on language change
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('no_results', 'No languages found')}</Text>
              </View>
            }
          />
        )}
        
        {/* Loading overlay during language change */}
        {isChanging && (
          <View style={styles.changingOverlay}>
            <ActivityIndicator size="large" color="#FF4199" />
            <Text style={styles.changingText}>{t('loading', 'Loading...')}</Text>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0F',
  },
  animatedContainer: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Ubuntu-Bold',
    color: '#FFF',
  },

  // Search
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // List
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 40,
  },

  // Language Row
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1C',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 6,
  },
  languageRowActive: {
    borderWidth: 1,
    borderColor: '#FF4199',
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontFamily: 'Ubuntu-Medium',
    color: '#FFF',
  },
  languageNative: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },

  // Radio Button
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF4199',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: {
    borderColor: '#FF4199',
  },
  radioCircleFill: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF4199',
  },

  // Empty
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
  },
  
  // Language changing overlay
  changingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(13, 13, 15, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#FFF',
    fontFamily: 'Ubuntu-Medium',
  },
});

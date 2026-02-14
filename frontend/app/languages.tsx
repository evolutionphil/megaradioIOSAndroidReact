import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
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
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [languages, setLanguages] = useState<Language[]>(KNOWN_LANGUAGES);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Load saved language preference
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (saved) {
          setSelectedLanguage(saved);
        }
      } catch (error) {
        console.error('Error loading language:', error);
      }
    };
    loadLanguage();
  }, []);

  // Fetch available translations from API
  useEffect(() => {
    const fetchLanguages = async () => {
      setIsLoading(true);
      try {
        // Try to fetch a test translation to verify API works
        const response = await fetch(`${API_BASE}/api/translations/en`, {
          headers: {
            'X-API-Key': 'mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw',
          },
        });
        
        if (response.ok) {
          // API works, use our predefined list
          // In the future, we could fetch the list of available languages from the API
          setLanguages(KNOWN_LANGUAGES);
        }
      } catch (error) {
        console.error('Error fetching languages:', error);
        // Use default list on error
        setLanguages(KNOWN_LANGUAGES);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLanguages();
  }, []);

  const handleLanguageSelect = async (code: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, code);
      setSelectedLanguage(code);
      
      // Optionally fetch translations for the selected language
      // This would be useful when i18n is fully implemented
      // const response = await fetch(`${API_BASE}/api/translations/${code}`, {
      //   headers: { 'X-API-Key': 'mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw' },
      // });
      
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  // Filter languages by search
  const filteredLanguages = searchQuery
    ? languages.filter(
        (lang) =>
          lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lang.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : languages;

  const renderLanguageItem = ({ item }: { item: Language }) => {
    const isSelected = selectedLanguage === item.code;

    return (
      <TouchableOpacity
        style={[styles.languageRow, isSelected && styles.languageRowActive]}
        onPress={() => handleLanguageSelect(item.code)}
        data-testid={`language-${item.code}`}
      >
        <View style={styles.languageInfo}>
          <Text style={styles.languageName}>{item.name}</Text>
          <Text style={styles.languageNative}>{item.nativeName}</Text>
        </View>
        <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
          {isSelected && <View style={styles.radioCircleFill} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} data-testid="back-btn">
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Language</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Language"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            data-testid="language-search-input"
          />
          <Ionicons name="search" size={20} color="#999" />
        </View>
      </View>

      {/* Language List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4199" />
        </View>
      ) : (
        <FlatList
          data={filteredLanguages}
          renderItem={renderLanguageItem}
          keyExtractor={(item) => item.code}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No languages found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0F',
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
    fontWeight: '700',
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
    fontWeight: '600',
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
});

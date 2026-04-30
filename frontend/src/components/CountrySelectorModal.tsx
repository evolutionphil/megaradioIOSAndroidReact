import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Pressable,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { API_ENDPOINTS } from '../constants/api';
import { useLocationStore } from '../store/locationStore';
import { colors } from '../constants/theme';

export interface CountryData {
  name: string;
  nativeName: string;
  code: string;
  flag: string;
  flagUrl: string;
  stationCount: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const CountrySelectorModal: React.FC<Props> = ({ visible, onClose }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { country, setCountryManual } = useLocationStore();

  const [countries, setCountries] = useState<CountryData[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch countries when modal opens (cache after first load)
  useEffect(() => {
    if (!visible || countries.length > 0) return;
    setLoading(true);
    api
      .get(`${API_ENDPOINTS.countries}?format=rich`)
      .then((res) => setCountries(res.data || []))
      .catch((e) => console.log('[CountrySelector] Fetch error:', e?.message))
      .finally(() => setLoading(false));
  }, [visible]);

  const filtered = useMemo(() => {
    if (!search.trim()) return countries;
    const q = search.toLowerCase();
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.nativeName.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [search, countries]);

  const handleSelect = async (c: CountryData) => {
    // Pass full API data so countryCode is reliable for 215+ countries
    await setCountryManual(c.name, {
      code: c.code,
      englishName: c.name,
      nativeName: c.nativeName,
    });
    setSearch('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        data-testid="country-modal-backdrop"
      >
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom || 16 }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title} data-testid="country-modal-title">
              {t('select_country', 'Select Country')}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              data-testid="country-modal-close"
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('search_country', 'Search Country')}
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              autoCapitalize="none"
              data-testid="country-modal-search-input"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* List */}
          {loading ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={{ marginTop: 40 }}
            />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={42} color={colors.textMuted} />
                  <Text style={styles.emptyText}>
                    {t('no_countries_found', 'No countries found')}
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isSelected =
                  item.name === country || item.nativeName === country;
                return (
                  <TouchableOpacity
                    style={[styles.row, isSelected && styles.rowActive]}
                    onPress={() => handleSelect(item)}
                    data-testid={`country-row-${item.code}`}
                  >
                    {/* PNG flag from CDN — guaranteed to render on all iOS regions */}
                    {item.flagUrl ? (
                      <Image
                        source={{ uri: item.flagUrl }}
                        style={styles.flagImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.flag}>{item.flag || countryCodeToFlag(item.code)}</Text>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.countryName}>{item.name}</Text>
                      {item.nativeName !== item.name && (
                        <Text style={styles.countryNative}>{item.nativeName}</Text>
                      )}
                    </View>
                    <Text style={styles.count}>{item.stationCount}</Text>
                    <View
                      style={[styles.radio, isSelected && styles.radioActive]}
                    >
                      {isSelected && <View style={styles.radioFill} />}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// Convert ISO-3166 country code ("TR") → 🇹🇷 flag emoji
export const countryCodeToFlag = (code?: string | null): string => {
  if (!code || code.length !== 2) return '🌐';
  const upper = code.toUpperCase();
  const OFFSET = 127397; // regional indicator offset
  return String.fromCodePoint(
    upper.charCodeAt(0) + OFFSET,
    upper.charCodeAt(1) + OFFSET
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '60%',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  rowActive: {
    backgroundColor: 'rgba(255,65,153,0.12)',
  },
  flag: {
    fontSize: 28,
    width: 40,
    textAlign: 'center',
  },
  flagImage: {
    width: 36,
    height: 24,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  countryName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  countryNative: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  count: {
    color: colors.textMuted,
    fontSize: 12,
    marginRight: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: colors.primary,
  },
  radioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    gap: 12,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});

export default CountrySelectorModal;

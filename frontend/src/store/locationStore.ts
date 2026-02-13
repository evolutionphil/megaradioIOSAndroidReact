import { create } from 'zustand';
import * as Location from 'expo-location';

// English to Native name mapping for API calls
const COUNTRY_NATIVE_MAP: Record<string, string> = {
  'Turkey': 'Türkiye',
  'Germany': 'Deutschland',
  'Austria': 'Österreich',
  'Switzerland': 'Schweiz',
  'France': 'France',
  'Spain': 'España',
  'Italy': 'Italia',
  'Netherlands': 'Nederland',
  'Belgium': 'België',
  'Poland': 'Polska',
  'Czech Republic': 'Česko',
  'Czechia': 'Česko',
  'Russia': 'Россия',
  'Ukraine': 'Україна',
  'Greece': 'Ελλάδα',
  'Japan': '日本',
  'China': '中国',
  'South Korea': '대한민국',
  'Brazil': 'Brasil',
  'Portugal': 'Portugal',
  'Romania': 'România',
  'Hungary': 'Magyarország',
  'Sweden': 'Sverige',
  'Norway': 'Norge',
  'Denmark': 'Danmark',
  'Finland': 'Suomi',
  'Croatia': 'Hrvatska',
  'Serbia': 'Србија',
  'Bulgaria': 'България',
  'Slovakia': 'Slovensko',
  'Slovenia': 'Slovenija',
};

// Native to English name mapping (reverse)
const COUNTRY_ENGLISH_MAP: Record<string, string> = Object.entries(COUNTRY_NATIVE_MAP).reduce(
  (acc, [eng, native]) => ({ ...acc, [native]: eng }),
  {}
);

interface LocationState {
  countryCode: string | null; // e.g., "AT" for Austria
  country: string | null;     // Native name e.g., "Österreich" (for /api/stations)
  countryEnglish: string | null; // English name e.g., "Austria" (for /api/stations/popular)
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: string | null;
  fetchLocation: () => Promise<void>;
  setCountryManual: (country: string) => void;
  getCountryForApi: (apiType: 'popular' | 'stations') => string | undefined;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  countryCode: null,
  country: null,
  countryEnglish: null,
  latitude: null,
  longitude: null,
  loading: false,
  error: null,

  fetchLocation: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        set({ loading: false, error: 'Permission denied' });
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });

      const { latitude, longitude } = location.coords;
      set({ latitude, longitude });

      // Reverse geocode to get country
      const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geo) {
        const countryName = geo.country || null;
        // expo-location returns English names typically
        const nativeName = COUNTRY_NATIVE_MAP[countryName || ''] || countryName;
        set({
          countryCode: geo.isoCountryCode || null,
          country: nativeName,
          countryEnglish: countryName,
          loading: false,
        });
      } else {
        set({ loading: false });
      }
    } catch (err) {
      console.log('[Location] Error:', err);
      set({ loading: false, error: 'Failed to get location' });
    }
  },

  setCountryManual: (countryName: string) => {
    // Check if the input is native or English and determine both
    const englishName = COUNTRY_ENGLISH_MAP[countryName] || countryName;
    const nativeName = COUNTRY_NATIVE_MAP[countryName] || COUNTRY_NATIVE_MAP[englishName] || countryName;
    
    set({ 
      country: nativeName, 
      countryEnglish: englishName,
      countryCode: null, 
      loading: false, 
      error: null 
    });
  },
  
  // Helper to get correct country name for different API endpoints
  getCountryForApi: (apiType: 'popular' | 'stations') => {
    const state = get();
    if (apiType === 'popular') {
      // Popular API expects English name
      return state.countryEnglish || state.country || undefined;
    }
    // Stations API expects native name
    return state.country || undefined;
  },
}));

export default useLocationStore;

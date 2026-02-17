import { create } from 'zustand';
import * as Location from 'expo-location';

// Country name to ISO code mapping
const COUNTRY_CODE_MAP: Record<string, string> = {
  'Turkey': 'TR', 'Türkiye': 'TR',
  'Germany': 'DE', 'Deutschland': 'DE',
  'Austria': 'AT', 'Österreich': 'AT',
  'Switzerland': 'CH', 'Schweiz': 'CH',
  'France': 'FR',
  'Spain': 'ES', 'España': 'ES',
  'Italy': 'IT', 'Italia': 'IT',
  'Netherlands': 'NL', 'Nederland': 'NL',
  'Belgium': 'BE', 'België': 'BE',
  'Poland': 'PL', 'Polska': 'PL',
  'Czech Republic': 'CZ', 'Czechia': 'CZ', 'Česko': 'CZ',
  'Russia': 'RU', 'Россия': 'RU',
  'Ukraine': 'UA', 'Україна': 'UA',
  'Greece': 'GR', 'Ελλάδα': 'GR',
  'Japan': 'JP', '日本': 'JP',
  'China': 'CN', '中国': 'CN',
  'South Korea': 'KR', '대한민국': 'KR',
  'Brazil': 'BR', 'Brasil': 'BR',
  'Portugal': 'PT',
  'Romania': 'RO', 'România': 'RO',
  'Hungary': 'HU', 'Magyarország': 'HU',
  'Sweden': 'SE', 'Sverige': 'SE',
  'Norway': 'NO', 'Norge': 'NO',
  'Denmark': 'DK', 'Danmark': 'DK',
  'Finland': 'FI', 'Suomi': 'FI',
  'Croatia': 'HR', 'Hrvatska': 'HR',
  'Serbia': 'RS', 'Србија': 'RS',
  'Bulgaria': 'BG', 'България': 'BG',
  'Slovakia': 'SK', 'Slovensko': 'SK',
  'Slovenia': 'SI', 'Slovenija': 'SI',
  'United States': 'US', 'USA': 'US',
  'United Kingdom': 'GB', 'UK': 'GB',
  'Canada': 'CA',
  'Australia': 'AU',
  'Mexico': 'MX', 'México': 'MX',
  'Argentina': 'AR',
  'Colombia': 'CO',
  'Chile': 'CL',
  'Peru': 'PE', 'Perú': 'PE',
  'India': 'IN',
  'Indonesia': 'ID',
  'Thailand': 'TH',
  'Vietnam': 'VN',
  'Philippines': 'PH',
  'Malaysia': 'MY',
  'Singapore': 'SG',
  'Egypt': 'EG',
  'South Africa': 'ZA',
  'Nigeria': 'NG',
  'Kenya': 'KE',
  'Morocco': 'MA',
  'Algeria': 'DZ',
  'Tunisia': 'TN',
  'Israel': 'IL',
  'Saudi Arabia': 'SA',
  'United Arab Emirates': 'AE', 'UAE': 'AE',
  'Iraq': 'IQ',
  'Iran': 'IR',
  'Pakistan': 'PK',
  'Bangladesh': 'BD',
  'New Zealand': 'NZ',
  'Ireland': 'IE',
  'Iceland': 'IS',
  'Estonia': 'EE',
  'Latvia': 'LV',
  'Lithuania': 'LT',
  'Belarus': 'BY',
  'Moldova': 'MD',
  'Albania': 'AL',
  'North Macedonia': 'MK',
  'Montenegro': 'ME',
  'Bosnia and Herzegovina': 'BA',
  'Kosovo': 'XK',
  'Cyprus': 'CY',
  'Malta': 'MT',
  'Luxembourg': 'LU',
  'Liechtenstein': 'LI',
  'Monaco': 'MC',
  'Andorra': 'AD',
  'San Marino': 'SM',
  'Vatican City': 'VA',
};

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
      // First check if we already have permission (non-blocking)
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      
      let permissionGranted = existingStatus === 'granted';
      
      // Only request if not already granted
      if (!permissionGranted) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        permissionGranted = status === 'granted';
      }
      
      if (!permissionGranted) {
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
    
    // Get country code from mapping
    const countryCode = COUNTRY_CODE_MAP[countryName] || COUNTRY_CODE_MAP[englishName] || COUNTRY_CODE_MAP[nativeName] || null;
    
    console.log('[LocationStore] setCountryManual:', { countryName, englishName, nativeName, countryCode });
    
    set({ 
      country: nativeName, 
      countryEnglish: englishName,
      countryCode: countryCode, 
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

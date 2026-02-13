import { create } from 'zustand';
import * as Location from 'expo-location';

interface LocationState {
  countryCode: string | null; // e.g., "AT" for Austria
  country: string | null;     // e.g., "Austria"
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: string | null;
  fetchLocation: () => Promise<void>;
  setCountryManual: (country: string) => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  countryCode: null,
  country: null,
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
        set({
          countryCode: geo.isoCountryCode || null,
          country: geo.country || null,
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
    set({ country: countryName, countryCode: null, loading: false, error: null });
  },
}));

export default useLocationStore;

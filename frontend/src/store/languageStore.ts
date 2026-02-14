import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { changeLanguage, getStoredLanguage, getAvailableLanguages } from '../services/i18nService';

interface Language {
  code: string;
  name: string;
}

interface LanguageState {
  currentLanguage: string;
  availableLanguages: Language[];
  isLoading: boolean;
  isInitialized: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  setLanguage: (code: string) => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  currentLanguage: 'en',
  availableLanguages: [],
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) return;
    
    set({ isLoading: true });
    
    try {
      const storedLang = await getStoredLanguage();
      const languages = await getAvailableLanguages();
      
      set({
        currentLanguage: storedLang,
        availableLanguages: languages,
        isInitialized: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('[LanguageStore] Initialization error:', error);
      set({ isLoading: false, isInitialized: true });
    }
  },

  setLanguage: async (code: string) => {
    set({ isLoading: true });
    
    try {
      await changeLanguage(code);
      set({ currentLanguage: code, isLoading: false });
    } catch (error) {
      console.error('[LanguageStore] Failed to change language:', error);
      set({ isLoading: false });
    }
  },
}));

export default useLanguageStore;

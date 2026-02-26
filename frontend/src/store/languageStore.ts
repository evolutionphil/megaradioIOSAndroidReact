import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { changeLanguage, getStoredLanguage, getAvailableLanguages, addLanguageChangeListener, getCurrentLanguage } from '../services/i18nService';

interface Language {
  code: string;
  name: string;
}

interface LanguageState {
  currentLanguage: string;
  availableLanguages: Language[];
  isLoading: boolean;
  isInitialized: boolean;
  languageVersion: number; // For forcing re-renders
  
  // Actions
  initialize: () => Promise<void>;
  setLanguage: (code: string) => Promise<void>;
  forceUpdate: () => void;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  currentLanguage: 'en',
  availableLanguages: [],
  isLoading: false,
  isInitialized: false,
  languageVersion: 0,

  initialize: async () => {
    if (get().isInitialized) return;
    
    set({ isLoading: true });
    
    try {
      const storedLang = await getStoredLanguage();
      const languages = await getAvailableLanguages();
      
      // Ensure i18n is using the correct language
      const currentI18nLang = getCurrentLanguage();
      if (currentI18nLang !== storedLang) {
        console.log('[LanguageStore] Syncing i18n language from', currentI18nLang, 'to', storedLang);
        await changeLanguage(storedLang);
      }
      
      // Add listener for language changes from i18n service
      addLanguageChangeListener((lang) => {
        console.log('[LanguageStore] Language change detected:', lang);
        set((state) => ({
          currentLanguage: lang,
          languageVersion: state.languageVersion + 1,
        }));
      });
      
      set({
        currentLanguage: storedLang,
        availableLanguages: languages,
        isInitialized: true,
        isLoading: false,
      });
      
      console.log('[LanguageStore] Initialized with language:', storedLang);
    } catch (error) {
      console.error('[LanguageStore] Initialization error:', error);
      set({ isLoading: false, isInitialized: true });
    }
  },

  setLanguage: async (code: string) => {
    set({ isLoading: true });
    
    try {
      await changeLanguage(code);
      // The listener will update the state
      set({ isLoading: false });
    } catch (error) {
      console.error('[LanguageStore] Failed to change language:', error);
      set({ isLoading: false });
    }
  },
  
  forceUpdate: () => {
    set((state) => ({ languageVersion: state.languageVersion + 1 }));
  },
}));

export default useLanguageStore;

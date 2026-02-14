import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import api from './api';
import { API_ENDPOINTS } from '../constants/api';

// Storage key for language preference
const LANGUAGE_KEY = '@megaradio_language';

// Supported languages
const SUPPORTED_LANGUAGES = ['en', 'tr', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'ru', 'ja', 'ko', 'zh', 'ar'];

// Default fallback translations (English) - includes missing keys from API
const defaultTranslations: Record<string, string> = {
  // Navigation
  nav_home: 'Home',
  nav_for_you: 'For You',
  nav_genres: 'Genres',
  nav_about: 'About',
  nav_contact: 'Contact',
  nav_apps: 'Applications',
  nav_feedback: 'Feedback',
  
  // Homepage
  homepage_see_all: 'See All',
  homepage_community_favorites: 'Community Favorites',
  homepage_genres: 'Genres',
  homepage_popular_stations: 'Popular Stations',
  homepage_stations_near_you: 'Stations Near You',
  homepage_favorites_from_users: 'Favorites From Users',
  homepage_all_stations: 'All Stations',
  homepage_recently_played: 'Recently Played',
  
  // Common
  loading: 'Loading...',
  search: 'Search',
  search_placeholder: 'Search...',
  all: 'All',
  see_more: 'See More',
  
  // Auth
  login: 'Login',
  log_in: 'Log in',
  sign_up: 'Sign Up',
  forgot_password: 'Forget your password?',
  email: 'E-Mail',
  password: 'Password',
  logging_in: 'Logging in...',
  auth_create_account: 'Create Account',
  auth_continue_with_google: 'Continue with Google',
  auth_continue_with_apple: 'Continue with Apple',
  auth_continue_with_facebook: 'Continue with Facebook',
  auth_or_with_email: 'Or continue with email',
  
  // Profile
  profile_followers: 'Followers',
  profile_following: 'Following',
  profile_favorites: 'Favorites',
  profile_login_required: 'Please log in to view this profile',
  
  // Stations
  stations: 'Stations',
  popular_stations: 'Popular Stations',
  stations_near_you: 'Stations Near You',
  no_stations_found: 'No stations found.',
  
  // Genres
  genres: 'Genres',
  genres_description: 'Discover stations by music genre',
  
  // Player
  now_playing: 'Now Playing',
  
  // Notifications
  notifications: 'Notifications',
  no_notifications: 'No notifications',
  
  // Users
  users: 'Users',
  follow: 'Follow',
  unfollow: 'Unfollow',
  following: 'Following',
  
  // Discover
  discover: 'Discover',
  discover_subtitle: 'Explore the world of radio',
  browse_genres: 'Browse Genres',
  top_stations: 'Top Stations',
  
  // Favorites
  favorites: 'Favorites',
  add_to_favorites: 'Add to Favorites',
  remove_from_favorites: 'Remove from Favorites',
  
  // Records
  records: 'Records',
  
  // Sort
  sort_az: 'A to Z',
  sort_za: 'Z to A',
  sort_newest_first: 'Newest First',
  sort_oldest_first: 'Oldest First',
  popular: 'Popular',
  
  // Countries
  countries: 'Countries',
  all_countries: 'All Countries',
  
  // Languages
  languages: 'Languages',
  select_language: 'Select Language',
  language_changed: 'Language changed',
  
  // Errors
  general_error: 'Error',
  general_error_message: 'An error occurred. Please try again.',
  
  // Share
  share: 'Share',
  copy_link: 'Copy Link',
  
  // Empty states
  no_favorites: 'No favorites yet',
  no_recently_played: 'No recently played stations',
  enable_location: 'Enable location to see nearby stations',
};

// Translation cache
let translationsCache: Record<string, Record<string, string>> = {
  en: defaultTranslations,
};

// Fetch translations from API
export const fetchTranslations = async (lang: string): Promise<Record<string, string>> => {
  // Return from cache if available
  if (translationsCache[lang]) {
    return translationsCache[lang];
  }

  try {
    const response = await api.get(API_ENDPOINTS.translations(lang));
    const translations = response.data || {};
    
    // Merge with defaults to ensure all keys exist
    const mergedTranslations = { ...defaultTranslations, ...translations };
    
    // Cache the translations
    translationsCache[lang] = mergedTranslations;
    
    return mergedTranslations;
  } catch (error) {
    console.error(`[i18n] Failed to fetch translations for ${lang}:`, error);
    // Return defaults on error
    return defaultTranslations;
  }
};

// Get stored language preference
export const getStoredLanguage = async (): Promise<string> => {
  try {
    const lang = await AsyncStorage.getItem(LANGUAGE_KEY);
    return lang || 'en';
  } catch {
    return 'en';
  }
};

// Store language preference
export const setStoredLanguage = async (lang: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  } catch (error) {
    console.error('[i18n] Failed to store language:', error);
  }
};

// Initialize i18next
export const initI18n = async (): Promise<void> => {
  const storedLang = await getStoredLanguage();
  const translations = await fetchTranslations(storedLang);

  await i18n
    .use(initReactI18next)
    .init({
      resources: {
        [storedLang]: {
          translation: translations,
        },
      },
      lng: storedLang,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
};

// Change language
export const changeLanguage = async (lang: string): Promise<void> => {
  try {
    // Fetch translations for the new language
    const translations = await fetchTranslations(lang);
    
    // Add translations to i18n
    i18n.addResourceBundle(lang, 'translation', translations, true, true);
    
    // Change language
    await i18n.changeLanguage(lang);
    
    // Store preference
    await setStoredLanguage(lang);
  } catch (error) {
    console.error('[i18n] Failed to change language:', error);
  }
};

// Get available languages from API
export const getAvailableLanguages = async (): Promise<{ code: string; name: string }[]> => {
  // Common languages supported by the API
  return [
    { code: 'en', name: 'English' },
    { code: 'tr', name: 'Türkçe' },
    { code: 'de', name: 'Deutsch' },
    { code: 'fr', name: 'Français' },
    { code: 'es', name: 'Español' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' },
    { code: 'nl', name: 'Nederlands' },
    { code: 'pl', name: 'Polski' },
    { code: 'ru', name: 'Русский' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'zh', name: '中文' },
    { code: 'ar', name: 'العربية' },
  ];
};

export default i18n;

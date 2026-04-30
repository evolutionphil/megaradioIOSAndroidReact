import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocalization } from './LocalizationContext';
import { assetPath } from '@/lib/assetPath';
import { trackCountryChange } from '@/lib/analytics';

interface CountryContextType {
  selectedCountry: string;
  selectedCountryCode: string;
  selectedCountryFlag: string;
  setCountry: (country: string, code: string, flag: string) => void;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

export const CountryProvider = ({ children }: { children: ReactNode }) => {
  const { detectedCountry, detectedCountryCode } = useLocalization();
  
  const globeIcon = assetPath('images/globe-icon.svg');
  
  // Initialize from localStorage or temporary default
  const [selectedCountry, setSelectedCountry] = useState<string>(() => {
    return localStorage.getItem('selectedCountry') || 'Global';
  });
  
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(() => {
    return localStorage.getItem('selectedCountryCode') || 'GLOBAL';
  });
  
  const [selectedCountryFlag, setSelectedCountryFlag] = useState<string>(() => {
    const saved = localStorage.getItem('selectedCountryFlag');
    // Fix: Clear old absolute paths that cause ERR_ACCESS_DENIED on Samsung TV
    if (saved && saved.startsWith('/images/')) {
      localStorage.removeItem('selectedCountryFlag');
      return globeIcon;
    }
    return saved || globeIcon;
  });

  // Auto-detect country from localization on first visit
  // This runs after LocalizationContext has detected the language/country
  useEffect(() => {
    const hasStoredCountry = localStorage.getItem('selectedCountry');
    
    // Only auto-detect if user hasn't manually selected a country before
    if (!hasStoredCountry && detectedCountry && detectedCountryCode) {
      // Use detected country if it's valid (not default fallback values)
      if (detectedCountry !== 'Unknown' && detectedCountryCode !== 'XX') {
        setSelectedCountry(detectedCountry);
        setSelectedCountryCode(detectedCountryCode);
        setSelectedCountryFlag(`https://flagcdn.com/w40/${detectedCountryCode.toLowerCase()}.png`);
      }
    }
  }, [detectedCountry, detectedCountryCode]);

  const setCountry = (country: string, code: string, flag: string) => {
    setSelectedCountry(country);
    setSelectedCountryCode(code);
    setSelectedCountryFlag(flag);
    
    // Track country change in Google Analytics
    trackCountryChange(country);
    
    // Persist to localStorage
    localStorage.setItem('selectedCountry', country);
    localStorage.setItem('selectedCountryCode', code);
    localStorage.setItem('selectedCountryFlag', flag);
  };

  return (
    <CountryContext.Provider value={{ 
      selectedCountry, 
      selectedCountryCode, 
      selectedCountryFlag, 
      setCountry 
    }}>
      {children}
    </CountryContext.Provider>
  );
};

export const useCountry = () => {
  const context = useContext(CountryContext);
  if (context === undefined) {
    throw new Error('useCountry must be used within a CountryProvider');
  }
  return context;
};

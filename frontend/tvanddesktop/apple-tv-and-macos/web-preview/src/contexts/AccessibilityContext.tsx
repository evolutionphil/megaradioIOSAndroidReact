import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AccessibilityContextType {
  highContrast: boolean;
  largeText: boolean;
  setHighContrast: (value: boolean) => void;
  setLargeText: (value: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [highContrast, setHighContrastState] = useState(() => {
    try { return localStorage.getItem('highContrast') === 'true'; } catch { return false; }
  });
  const [largeText, setLargeTextState] = useState(() => {
    try { return localStorage.getItem('largeText') === 'true'; } catch { return false; }
  });

  const setHighContrast = (value: boolean) => {
    setHighContrastState(value);
    try { localStorage.setItem('highContrast', String(value)); } catch {}
  };

  const setLargeText = (value: boolean) => {
    setLargeTextState(value);
    try { localStorage.setItem('largeText', String(value)); } catch {}
  };

  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }, [highContrast]);

  useEffect(() => {
    const root = document.documentElement;
    if (largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }
  }, [largeText]);

  return (
    <AccessibilityContext.Provider value={{ highContrast, largeText, setHighContrast, setLargeText }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return context;
}

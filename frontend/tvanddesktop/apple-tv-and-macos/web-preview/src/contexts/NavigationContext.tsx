import { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from "react";
import { useCountry } from './CountryContext';
import { captureNavigationScroll } from '@/lib/navigationRestore';

export interface NavigationState {
  previousPage: string;
  returnFocusIndex: number;
  /**
   * Optional: the station/item the user selected before navigating away.
   * Used by Discover to *re-find* the correct focus index after dynamic
   * lists (recently played, popular) reshuffle/grow. When provided the
   * caller should prefer this over `returnFocusIndex`.
   */
  returnStationId?: string;
  /** Which section the saved station belongs to. */
  returnSection?: 'recent' | 'forYou' | 'popular' | 'country' | 'genre' | 'search' | 'favorites';
  pageData?: unknown;
  scroll?: Record<string, { top: number; left: number }>;
  country?: { name: string; code: string; flag: string };
}

interface NavigationContextType {
  navigationState: NavigationState | null;
  setNavigationState: (
    page: string,
    focusIndex: number,
    stationId?: string,
    section?: NavigationState['returnSection']
  ) => void;
  clearNavigationState: () => void;
  getPreviousPage: () => string | null;
  getReturnFocusIndex: () => number | null;
  popNavigationState: (page?: string) => NavigationState | null;
  registerSnapshot: (page: string, getter: () => unknown) => () => void;
  readSnapshot: (page: string) => unknown;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [navigationState, setNavigationStateInternal] = useState<NavigationState | null>(null);
  const stateRef = useRef<NavigationState | null>(null);
  const snapshots = useRef(new Map<string, () => unknown>());
  const { selectedCountry, selectedCountryCode, selectedCountryFlag } = useCountry();
  const registerSnapshot = useCallback((page: string, getter: () => unknown) => {
    snapshots.current.set(page, getter);
    return () => { if (snapshots.current.get(page) === getter) snapshots.current.delete(page); };
  }, []);
  const readSnapshot = useCallback((page: string) =>
    stateRef.current?.previousPage === page ? stateRef.current.pageData : undefined, []);

  const setNavigationState = (
    page: string,
    focusIndex: number,
    stationId?: string,
    section?: NavigationState['returnSection']
  ) => {
    const state: NavigationState = {
      previousPage: page,
      returnFocusIndex: focusIndex,
      returnStationId: stationId,
      returnSection: section,
      pageData: snapshots.current.get(page)?.(),
      scroll: captureNavigationScroll(),
      country: { name: selectedCountry, code: selectedCountryCode, flag: selectedCountryFlag },
    };
    stateRef.current = state;
    setNavigationStateInternal(state);
  };

  const clearNavigationState = () => {
    stateRef.current = null;
    setNavigationStateInternal(null);
  };

  const getPreviousPage = () => {
    return stateRef.current?.previousPage || null;
  };

  const getReturnFocusIndex = () => {
    return stateRef.current?.returnFocusIndex ?? null;
  };

  const popNavigationState = (page?: string) => {
    const state = stateRef.current;
    if (page && state?.previousPage !== page) return null;
    if (state) {
      stateRef.current = null;
      setNavigationStateInternal(null);
    }
    return state;
  };

  return (
    <NavigationContext.Provider
      value={{
        navigationState,
        setNavigationState,
        clearNavigationState,
        getPreviousPage,
        getReturnFocusIndex,
        popNavigationState,
        registerSnapshot,
        readSnapshot,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}

export function useSavedNavigationData<T>(page: string): T | undefined {
  const { readSnapshot } = useNavigation();
  return useRef(readSnapshot(page) as T | undefined).current;
}

export function usePageSnapshot(page: string, getter: () => unknown) {
  const { registerSnapshot } = useNavigation();
  const latest = useRef(getter);
  latest.current = getter;
  useEffect(() => registerSnapshot(page, () => latest.current()), [page, registerSnapshot]);
}

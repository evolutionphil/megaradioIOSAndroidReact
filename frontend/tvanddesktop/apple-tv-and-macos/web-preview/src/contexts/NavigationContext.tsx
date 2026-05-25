import { createContext, useContext, useState, ReactNode } from "react";

interface NavigationState {
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
  returnSection?: 'recent' | 'forYou' | 'popular' | 'country' | 'genre';
}

interface NavigationContextType {
  navigationState: NavigationState | null;
  setNavigationState: (
    page: string,
    focusIndex: number,
    stationId?: string,
    section?: 'recent' | 'forYou' | 'popular' | 'country' | 'genre'
  ) => void;
  clearNavigationState: () => void;
  getPreviousPage: () => string | null;
  getReturnFocusIndex: () => number | null;
  popNavigationState: () => NavigationState | null;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [navigationState, setNavigationStateInternal] = useState<NavigationState | null>(null);

  const setNavigationState = (
    page: string,
    focusIndex: number,
    stationId?: string,
    section?: 'recent' | 'forYou' | 'popular' | 'country' | 'genre'
  ) => {
    setNavigationStateInternal({
      previousPage: page,
      returnFocusIndex: focusIndex,
      returnStationId: stationId,
      returnSection: section,
    });
  };

  const clearNavigationState = () => {
    setNavigationStateInternal(null);
  };

  const getPreviousPage = () => {
    return navigationState?.previousPage || null;
  };

  const getReturnFocusIndex = () => {
    return navigationState?.returnFocusIndex ?? null;
  };

  const popNavigationState = () => {
    const state = navigationState;
    if (state) {
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

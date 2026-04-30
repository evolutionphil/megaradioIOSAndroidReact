import { createContext, useContext, useState, ReactNode } from "react";

interface NavigationState {
  previousPage: string;
  returnFocusIndex: number;
}

interface NavigationContextType {
  navigationState: NavigationState | null;
  setNavigationState: (page: string, focusIndex: number) => void;
  clearNavigationState: () => void;
  getPreviousPage: () => string | null;
  getReturnFocusIndex: () => number | null;
  popNavigationState: () => NavigationState | null;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [navigationState, setNavigationStateInternal] = useState<NavigationState | null>(null);

  const setNavigationState = (page: string, focusIndex: number) => {
    setNavigationStateInternal({ previousPage: page, returnFocusIndex: focusIndex });
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

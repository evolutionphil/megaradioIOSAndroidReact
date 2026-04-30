import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useCountry } from "@/contexts/CountryContext";
import { getFocusClasses } from "@/hooks/useFocusManager";
import { usePageKeyHandler } from "@/contexts/FocusRouterContext";
import { Sidebar } from "@/components/Sidebar";
import { CountrySelector } from "@/components/CountrySelector";

const sidebarRoutes = ['/discover-no-user', '/genres', '/search', '/favorites', '/country-select', '/settings'];

export const CountrySelectPage = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const { selectedCountry, setCountry } = useCountry();
  const [focusZone, setFocusZone] = useState<'sidebar' | 'content'>('content');
  const [sidebarIndex, setSidebarIndex] = useState(4);

  const handleNavigateToSidebar = useCallback(() => {
    setFocusZone('sidebar');
    setSidebarIndex(0);
  }, []);

  const handleNavigateToContent = useCallback(() => {
    setFocusZone('content');
  }, []);

  usePageKeyHandler('/country-select', (e) => {
    if (focusZone !== 'sidebar') return;

    const key = (window as any).tvKey;
    const keyCode = e.keyCode;
    const isUp = keyCode === 38 || keyCode === key?.UP;
    const isDown = keyCode === 40 || keyCode === key?.DOWN;
    const isRight = keyCode === 39 || keyCode === key?.RIGHT;
    const isEnter = keyCode === 13 || keyCode === key?.ENTER;
    const isBack = keyCode === 461 || keyCode === 10009 || keyCode === key?.RETURN;

    if (isBack) {
      e.preventDefault();
      setLocation('/discover-no-user');
      return;
    }

    if (isUp) {
      e.preventDefault();
      setSidebarIndex(prev => Math.max(0, prev - 1));
    } else if (isDown) {
      e.preventDefault();
      setSidebarIndex(prev => Math.min(5, prev + 1));
    } else if (isRight) {
      e.preventDefault();
      handleNavigateToContent();
    } else if (isEnter) {
      e.preventDefault();
      const route = sidebarRoutes[sidebarIndex];
      if (route && route !== '/country-select') {
        window.location.hash = '#' + route;
      } else {
        handleNavigateToContent();
      }
    }
  });

  return (
    <div className="bg-[#0e0e0e] absolute inset-0 w-[1920px] h-[1080px] overflow-hidden" data-testid="page-country-select">
      <Sidebar
        activePage="country"
        isFocused={(index: number) => focusZone === 'sidebar' && sidebarIndex === index}
        getFocusClasses={getFocusClasses}
      />
      <CountrySelector
        isOpen={true}
        mode="page"
        onClose={() => setLocation('/discover-no-user')}
        selectedCountry={selectedCountry}
        onSelectCountry={(country) => {
          setCountry(country.name, country.code, country.flag);
          setLocation('/discover-no-user');
        }}
        onNavigateToSidebar={handleNavigateToSidebar}
        keyboardDisabled={focusZone === 'sidebar'}
      />
    </div>
  );
};

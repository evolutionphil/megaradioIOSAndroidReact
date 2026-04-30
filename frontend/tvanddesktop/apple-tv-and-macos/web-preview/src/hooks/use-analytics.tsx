import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { trackPageView } from '../lib/analytics';

// Hook to automatically track page views on route changes
export const useAnalytics = () => {
  const [location] = useLocation();
  const prevLocationRef = useRef<string | null>(null);
  
  useEffect(() => {
    // Track initial page view on mount
    if (prevLocationRef.current === null) {
      trackPageView(location);
      prevLocationRef.current = location;
      return;
    }
    
    // Track page view on route change
    if (location !== prevLocationRef.current) {
      trackPageView(location);
      prevLocationRef.current = location;
    }
  }, [location]);
};

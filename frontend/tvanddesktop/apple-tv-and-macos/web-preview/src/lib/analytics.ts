// Google Analytics 4 integration for Mega Radio TV App
// Tracks page views, events, and user interactions

// Define the gtag function globally
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Initialize Google Analytics
export const initGA = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  if (!measurementId) {
    return;
  }

  // Add Google Analytics script to the head
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  
  // Handle script load success
  script1.onload = () => {
  };
  
  // Handle script load failure
  script1.onerror = (error) => {
  };
  
  document.head.appendChild(script1);

  // Initialize gtag
  const script2 = document.createElement('script');
  script2.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}', {
      send_page_view: true,
      custom_map: {
        dimension1: 'platform',
        dimension2: 'country',
        dimension3: 'language'
      }
    });
  `;
  document.head.appendChild(script2);
};

// Track page views - useful for single-page applications
export const trackPageView = (url: string) => {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }
  
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId) return;
  
  window.gtag('config', measurementId, {
    page_path: url
  });
};

// Track events
export const trackEvent = (
  action: string, 
  category?: string, 
  label?: string, 
  value?: number
) => {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};

// Track custom events for Mega Radio
export const trackStationPlay = (stationName: string, country: string, genre?: string) => {
  trackEvent('play_station', 'engagement', `${stationName} (${country})`, 1);
  if (genre) {
    trackEvent('play_genre', 'engagement', genre, 1);
  }
};

export const trackFavoriteToggle = (stationName: string, added: boolean) => {
  trackEvent(added ? 'add_favorite' : 'remove_favorite', 'engagement', stationName, 1);
};

export const trackCountryChange = (countryName: string) => {
  trackEvent('change_country', 'navigation', countryName, 1);
};

export const trackSearch = (query: string, resultsCount: number) => {
  trackEvent('search', 'engagement', query, resultsCount);
};

export const trackError = (errorMessage: string, errorContext?: string) => {
  trackEvent('error', 'technical', `${errorContext || 'general'}: ${errorMessage}`, 1);
};

import { Link, useLocation } from "wouter";
import { resolveStationImageUrl } from "@/lib/imageUtils";
import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { megaRadioApi, type Station, type Genre } from "@/services/megaRadioApi";
import { cacheService } from "@/services/cacheService";
import { CountrySelector } from "@/components/CountrySelector";
import { CountryTrigger } from "@/components/CountryTrigger";
import { useFocusManager, getFocusClasses } from "@/hooks/useFocusManager";
import { usePageKeyHandler } from "@/contexts/FocusRouterContext";
import { useCountry } from "@/contexts/CountryContext";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useGlobalPlayer } from "@/contexts/GlobalPlayerContext";
import { useNavigation } from "@/contexts/NavigationContext";
import { autoPlayService } from "@/services/autoPlayService";
import { recentlyPlayedService } from "@/services/recentlyPlayedService";
import { recommendationService } from "@/services/recommendationService";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { assetPath } from "@/lib/assetPath";
import { useHelp } from "@/contexts/HelpContext";

export const DiscoverNoUser = (): JSX.Element => {
  const { t } = useLocalization();
  const { selectedCountry, selectedCountryCode, selectedCountryFlag, setCountry } = useCountry();
  const { playStation, isPlaying } = useGlobalPlayer();
  const { isAuthenticated, user } = useAuth();
  const [location, setLocation] = useLocation();
  const { setNavigationState, popNavigationState } = useNavigation();
  const queryClient = useQueryClient();
  const [isCountrySelectorOpen, setIsCountrySelectorOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [exitModalFocusIndex, setExitModalFocusIndex] = useState(0);
  const [showHeader, setShowHeader] = useState(true);
  const [helpFocused, setHelpFocused] = useState(false);
  const [isCountryHeaderFocused, setIsCountryHeaderFocused] = useState(false);
  const { openHelp, closeHelp, helpOpen } = useHelp();
  const helpFocusedRef = useRef(false);
  const helpOpenRef = useRef(false);
  helpFocusedRef.current = helpFocused;
  helpOpenRef.current = helpOpen;
  const setHF = (v: boolean) => { helpFocusedRef.current = v; setHelpFocused(v); };
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const genreScrollRef = useRef<HTMLDivElement>(null);
  const recentScrollRef = useRef<HTMLDivElement>(null);
  const forYouScrollRef = useRef<HTMLDivElement>(null);
  const [recentStations, setRecentStations] = useState<Station[]>([]);
  const [forYouStations, setForYouStations] = useState<Station[]>([]);
  const lastScrollY = useRef(0);
  const lastScrollTime = useRef(0); // Throttle scroll events
  const MAX_STATIONS = 200; // Prevent memory bloat on TV devices
  
  // Infinite scroll state for country stations - TRUE INFINITE SCROLL with API
  const [displayedStations, setDisplayedStations] = useState<Station[]>([]);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreCountryStations, setHasMoreCountryStations] = useState(true);
  const isLoadingRef = useRef(false);
  const loadMoreRef = useRef<(silent?: boolean) => void>(() => {});
  const STATIONS_PER_LOAD = 21;

  // WARM-START CACHING: Get cached data immediately on mount for instant display
  const cachedGenres = useMemo(() => {
    const cached = cacheService.getGenres(selectedCountryCode);
    return cached.data ? { genres: cached.data } : undefined;
  }, [selectedCountryCode]);

  const cachedPopularStations = useMemo(() => {
    const cached = cacheService.getPopularStations(selectedCountryCode);
    return cached.data ? { stations: cached.data } : undefined;
  }, [selectedCountryCode]);

  const cachedInitialStations = useMemo(() => {
    const cached = cacheService.getInitialStations(selectedCountryCode);
    return cached.data && cached.data.length >= STATIONS_PER_LOAD ? { stations: cached.data } : undefined;
  }, [selectedCountryCode]);

  // Fetch ALL genres from API filtered by country (or global if GLOBAL selected)
  // CACHE: 7 days - Uses localStorage cache for instant display
  const { data: genresData } = useQuery({
    queryKey: ['/api/genres/all', selectedCountryCode],
    queryFn: () => {
      if (selectedCountryCode === 'GLOBAL') {
        return megaRadioApi.getAllGenres();
      }
      return megaRadioApi.getAllGenres(selectedCountryCode);
    },
    staleTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    initialData: cachedGenres,
  });

  // Fetch popular stations filtered by selected country (or global if GLOBAL selected)
  // CACHE: 24 hours - Uses localStorage cache for instant display
  const { data: popularStationsData } = useQuery({
    queryKey: ['/api/stations/popular', { limit: 12, country: selectedCountryCode }],
    queryFn: () => {
      if (selectedCountryCode === 'GLOBAL') {
        return megaRadioApi.getPopularStations({ limit: 12 });
      }
      return megaRadioApi.getPopularStations({ limit: 12, country: selectedCountryCode });
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    initialData: cachedPopularStations,
  });

  // Fetch initial 100 stations for TRUE infinite scroll (or global if GLOBAL selected)
  // Loads enough stations to fill the viewport, then lazy loads more as user scrolls
  // CACHE: 7 days - Uses localStorage cache for instant display
  const { data: initialStationsData, isLoading: isInitialLoading } = useQuery({
    queryKey: ['/api/stations/country/initial', selectedCountryCode, STATIONS_PER_LOAD],
    queryFn: () => {
      if (selectedCountryCode === 'GLOBAL') {
        return megaRadioApi.getWorkingStations({ limit: STATIONS_PER_LOAD });
      }
      return megaRadioApi.getWorkingStations({ limit: STATIONS_PER_LOAD, country: selectedCountryCode });
    },
    staleTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    retry: 2,
    initialData: cachedInitialStations,
  });

  // Save fetched data to localStorage cache for future warm-starts
  useEffect(() => {
    if (genresData?.genres && genresData.genres.length > 0) {
      cacheService.setGenres(selectedCountryCode, genresData.genres);
    }
  }, [genresData, selectedCountryCode]);

  useEffect(() => {
    if (popularStationsData?.stations && popularStationsData.stations.length > 0) {
      cacheService.setPopularStations(selectedCountryCode, popularStationsData.stations);
    }
  }, [popularStationsData, selectedCountryCode]);

  useEffect(() => {
    if (initialStationsData?.stations && initialStationsData.stations.length > 0) {
      cacheService.setInitialStations(selectedCountryCode, initialStationsData.stations);
      prefetchNextPage(selectedCountryCode, STATIONS_PER_LOAD);
    }
  }, [initialStationsData, selectedCountryCode]);

  // Background prefetch when country changes - preload cache for next visit
  useEffect(() => {
    cacheService.prefetchCountryData(
      selectedCountryCode,
      async () => {
        const result = selectedCountryCode === 'GLOBAL'
          ? await megaRadioApi.getAllGenres()
          : await megaRadioApi.getAllGenres(selectedCountryCode);
        return result.genres || [];
      },
      async () => {
        const result = selectedCountryCode === 'GLOBAL'
          ? await megaRadioApi.getPopularStations({ limit: 12 })
          : await megaRadioApi.getPopularStations({ limit: 12, country: selectedCountryCode });
        return result.stations || [];
      },
      async () => {
        const result = selectedCountryCode === 'GLOBAL'
          ? await megaRadioApi.getWorkingStations({ limit: STATIONS_PER_LOAD, offset: 0 })
          : await megaRadioApi.getWorkingStations({ limit: STATIONS_PER_LOAD, country: selectedCountryCode, offset: 0 });
        return result.stations || [];
      }
    );
  }, [selectedCountryCode]);

  const genres = genresData?.genres || []; // Show ALL genres, not just 8
  const popularStations = popularStationsData?.stations?.slice(0, 12) || [];

  // Calculate dynamic section boundaries (5 sidebar + 1 country selector = 6)
  const recentCount = recentStations.length;
  const recentStart = 6;
  const recentEnd = recentStart + recentCount - 1;
  const forYouCount = forYouStations.length;
  const forYouStart = recentCount > 0 ? recentEnd + 1 : 6;
  const forYouEnd = forYouStart + forYouCount - 1;
  const genresStart = forYouCount > 0 ? forYouEnd + 1 : (recentCount > 0 ? recentEnd + 1 : 6);
  const genresEnd = genresStart + genres.length - 1;
  const popularStationsStart = genresEnd + 1;
  const popularStationsEnd = popularStationsStart + popularStations.length - 1;
  const countryStationsStart = popularStationsEnd + 1;
  const recentOffset = recentStations.length > 0 ? 300 : 0;
  const forYouOffset = forYouStations.length > 0 ? 300 : 0;

  // Calculate dynamic totalItems using actual array lengths (5 sidebar + 1 country selector + content)
  const totalItems = 5 + 1 + recentCount + forYouCount + genres.length + popularStations.length + displayedStations.length;

  // Define sidebar routes (NO PROFILE - 5 items: Discover, Genres, Search, Favorites, Settings)
  const sidebarRoutes = ['/discover-no-user', '/genres', '/search', '/favorites', '/country-select', '/settings'];

  const scrollRecentIntoView = (recentIndex: number) => {
    if (!recentScrollRef.current) return;
    
    const children = recentScrollRef.current.children;
    if (recentIndex < 0 || recentIndex >= children.length) return;
    
    const child = children[recentIndex] as HTMLElement;
    const containerWidth = recentScrollRef.current.clientWidth;
    const currentScroll = recentScrollRef.current.scrollLeft;
    const itemLeft = child.offsetLeft;
    const itemRight = itemLeft + child.offsetWidth;
    
    if (itemRight > currentScroll + containerWidth) {
      recentScrollRef.current.scrollTo({
        left: itemRight - containerWidth + 20,
        behavior: 'smooth'
      });
    } else if (itemLeft < currentScroll) {
      recentScrollRef.current.scrollTo({
        left: itemLeft,
        behavior: 'smooth'
      });
    }
  };

  const scrollForYouIntoView = (forYouIndex: number) => {
    if (!forYouScrollRef.current) return;
    
    const children = forYouScrollRef.current.children;
    if (forYouIndex < 0 || forYouIndex >= children.length) return;
    
    const child = children[forYouIndex] as HTMLElement;
    const containerWidth = forYouScrollRef.current.clientWidth;
    const currentScroll = forYouScrollRef.current.scrollLeft;
    const itemLeft = child.offsetLeft;
    const itemRight = itemLeft + child.offsetWidth;
    
    if (itemRight > currentScroll + containerWidth) {
      forYouScrollRef.current.scrollTo({
        left: itemRight - containerWidth + 20,
        behavior: 'smooth'
      });
    } else if (itemLeft < currentScroll) {
      forYouScrollRef.current.scrollTo({
        left: itemLeft,
        behavior: 'smooth'
      });
    }
  };

  const scrollGenreIntoView = (genreIndex: number) => {
    if (!genreScrollRef.current) return;
    
    const children = genreScrollRef.current.children;
    if (genreIndex < 0 || genreIndex >= children.length) return;
    
    const child = children[genreIndex] as HTMLElement;
    const containerWidth = genreScrollRef.current.clientWidth;
    const currentScroll = genreScrollRef.current.scrollLeft;
    const itemLeft = child.offsetLeft;
    const itemRight = itemLeft + child.offsetWidth;
    
    if (itemRight > currentScroll + containerWidth) {
      genreScrollRef.current.scrollTo({
        left: itemRight - containerWidth + 20,
        behavior: 'smooth'
      });
    } else if (itemLeft < currentScroll) {
      genreScrollRef.current.scrollTo({
        left: itemLeft,
        behavior: 'smooth'
      });
    }
  };

  // Custom navigation logic for complex multi-section layout
  const customHandleNavigation = (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    const current = focusIndex;
    let newIndex = current;

    // Help button focus mode
    if (helpFocusedRef.current) {
      if (direction === 'UP') { setHF(false); }
      else if (direction === 'RIGHT') {
        setHF(false);
        if (recentCount > 0) { setFocusIndex(recentStart); } else if (forYouCount > 0) { setFocusIndex(forYouStart); } else { setFocusIndex(genresStart); }
      }
      return;
    }

    // Header CountryTrigger focus mode (index 5 reached from content area UP)
    if (isCountryHeaderFocused) {
      if (direction === 'DOWN') {
        setIsCountryHeaderFocused(false);
        if (recentCount > 0) { setFocusIndex(recentStart); } else if (forYouCount > 0) { setFocusIndex(forYouStart); } else { setFocusIndex(genresStart); }
      } else if (direction === 'LEFT') {
        setIsCountryHeaderFocused(false);
        setFocusIndex(0);
      }
      return;
    }

    // Sidebar section (0-5)
    if (current >= 0 && current <= 5) {
      if (direction === 'DOWN') {
        if (current < 5) { setIsCountryHeaderFocused(false); newIndex = current + 1; }
        else { setHF(true); return; }
      } else if (direction === 'UP') {
        setIsCountryHeaderFocused(false);
        newIndex = current > 0 ? current - 1 : current;
      } else if (direction === 'RIGHT') {
        if (current === 0 || current === 1) {
          if (recentCount > 0) {
            newIndex = recentStart;
            scrollRecentIntoView(0);
          } else if (forYouCount > 0) {
            newIndex = forYouStart;
            scrollForYouIntoView(0);
          } else {
            newIndex = genresStart;
            scrollGenreIntoView(0);
          }
        } else {
          newIndex = popularStationsStart;
        }
      }
    }
    // Country selector (5)
    else if (current === 5) {
      if (direction === 'DOWN') {
        if (recentCount > 0) {
          newIndex = recentStart;
        } else if (forYouCount > 0) {
          newIndex = forYouStart;
        } else {
          newIndex = genresStart;
        }
      } else if (direction === 'LEFT') {
        newIndex = 0;
      }
    }
    // Recently played section - horizontal scrolling
    else if (recentCount > 0 && current >= recentStart && current <= recentEnd) {
      const col = current - recentStart;

      if (direction === 'LEFT') {
        if (col > 0) {
          newIndex = current - 1;
          scrollRecentIntoView(col - 1);
        } else {
          newIndex = 0;
        }
      } else if (direction === 'RIGHT') {
        if (col < recentCount - 1) {
          newIndex = current + 1;
          scrollRecentIntoView(col + 1);
        }
      } else if (direction === 'UP') {
        setIsCountryHeaderFocused(true); newIndex = 5;
      } else if (direction === 'DOWN') {
        if (forYouCount > 0) {
          newIndex = forYouStart;
          scrollForYouIntoView(0);
        } else {
          newIndex = genresStart;
          scrollGenreIntoView(0);
        }
      }
    }
    // For You section - horizontal scrolling
    else if (forYouCount > 0 && current >= forYouStart && current <= forYouEnd) {
      const col = current - forYouStart;

      if (direction === 'LEFT') {
        if (col > 0) {
          newIndex = current - 1;
          scrollForYouIntoView(col - 1);
        } else {
          newIndex = 0;
        }
      } else if (direction === 'RIGHT') {
        if (col < forYouCount - 1) {
          newIndex = current + 1;
          scrollForYouIntoView(col + 1);
        }
      } else if (direction === 'UP') {
        if (recentCount > 0) {
          newIndex = recentStart + Math.min(col, recentCount - 1);
          scrollRecentIntoView(Math.min(col, recentCount - 1));
        } else {
          setIsCountryHeaderFocused(true); newIndex = 5;
        }
      } else if (direction === 'DOWN') {
        newIndex = genresStart;
        scrollGenreIntoView(0);
      }
    }
    // Genres section - dynamic boundaries (horizontal scrolling)
    else if (current >= genresStart && current <= genresEnd) {
      const col = current - genresStart;

      if (direction === 'LEFT') {
        if (col > 0) {
          newIndex = current - 1;
          scrollGenreIntoView(col - 1);
        } else {
          newIndex = 0;
        }
      } else if (direction === 'RIGHT') {
        if (col < genres.length - 1) {
          newIndex = current + 1;
          scrollGenreIntoView(col + 1);
        }
      } else if (direction === 'UP') {
        if (forYouCount > 0) {
          newIndex = forYouStart + Math.min(col, forYouCount - 1);
          scrollForYouIntoView(Math.min(col, forYouCount - 1));
        } else if (recentCount > 0) {
          newIndex = recentStart + Math.min(col, recentCount - 1);
          scrollRecentIntoView(Math.min(col, recentCount - 1));
        } else {
          setIsCountryHeaderFocused(true); newIndex = 5;
        }
      } else if (direction === 'DOWN') {
        newIndex = popularStationsStart + Math.min(col, Math.min(6, popularStations.length - 1));
      }
    }
    // Popular stations section - dynamic boundaries
    else if (current >= popularStationsStart && current <= popularStationsEnd) {
      const relIndex = current - popularStationsStart;
      const row = Math.floor(relIndex / 7);
      const col = relIndex % 7;

      if (direction === 'LEFT') {
        if (col > 0) {
          newIndex = current - 1;
        } else {
          newIndex = 2;
        }
      } else if (direction === 'RIGHT') {
        if (col < 6 && current + 1 <= popularStationsEnd) {
          newIndex = current + 1;
        }
      } else if (direction === 'UP') {
        if (row > 0) {
          newIndex = current - 7;
        } else {
          newIndex = genresStart + Math.min(col, genres.length - 1);
        }
      } else if (direction === 'DOWN') {
        const nextRow = current + 7;
        if (nextRow <= popularStationsEnd) {
          newIndex = nextRow;
        } else if (displayedStations.length > 0) {
          newIndex = countryStationsStart + col;
          if (newIndex >= totalItems) {
            newIndex = totalItems - 1;
          }
        }
      }
    }
    // Country stations section - dynamic boundary
    else if (current >= countryStationsStart) {
      const relIndex = current - countryStationsStart;
      const row = Math.floor(relIndex / 7);
      const col = relIndex % 7;

      if (direction === 'LEFT') {
        if (col > 0) {
          newIndex = current - 1;
        } else {
          newIndex = 0;
        }
      } else if (direction === 'RIGHT') {
        if (col < 6 && current < totalItems - 1) {
          newIndex = current + 1;
        }
      } else if (direction === 'UP') {
        if (row > 0) {
          newIndex = current - 7;
        } else {
          const targetCol = Math.min(col, 6);
          const lastRowStart = popularStationsEnd - (popularStations.length % 7 === 0 ? 6 : (popularStations.length % 7) - 1);
          newIndex = lastRowStart + targetCol;
          if (newIndex > popularStationsEnd) {
            newIndex = popularStationsEnd;
          }
        }
      } else if (direction === 'DOWN') {
        const nextIndex = current + 7;
        if (nextIndex < totalItems) {
          newIndex = nextIndex;
        }
      }
    }

    // Clamp to valid range
    newIndex = Math.max(0, Math.min(totalItems - 1, newIndex));
    setFocusIndex(newIndex);
  };

  // Focus management with custom navigation
  const { focusIndex, setFocusIndex, handleSelect, handleBack, isFocused } = useFocusManager({
    totalItems,
    cols: 1,
    initialIndex: 0,
    onSelect: (index) => {
      // Sidebar navigation (0-5) - 6 items
      // index 4 = Country sidebar (opens modal), index 5 = Settings OR header CountryTrigger
      if (index >= 0 && index <= 5) {
        if (index === 4) {
          setIsCountrySelectorOpen(true);
        } else if (index === 5 && isCountryHeaderFocused) {
          // User is on the header CountryTrigger button, navigate to country page
          window.location.hash = '#/country-select';
        } else {
          var route = sidebarRoutes[index];
          window.location.hash = '#' + route;
        }
      }
      // Recently played stations
      else if (recentCount > 0 && index >= recentStart && index <= recentEnd) {
        const stationIndex = index - recentStart;
        const station = recentStations[stationIndex];
        if (station) {
          setNavigationState(location, index);
          playStation(station);
          setLocation(`/radio-playing?station=${station._id}`);
        }
      }
      // For You stations
      else if (forYouCount > 0 && index >= forYouStart && index <= forYouEnd) {
        const stationIndex = index - forYouStart;
        const station = forYouStations[stationIndex];
        if (station) {
          setNavigationState(location, index);
          playStation(station);
          setLocation(`/radio-playing?station=${station._id}`);
        }
      }
      // Popular stations - dynamic boundaries
      else if (index >= popularStationsStart && index <= popularStationsEnd) {
        const stationIndex = index - popularStationsStart;
        const station = popularStations[stationIndex];
        if (station) {
          // Save navigation state before navigating
          setNavigationState(location, index);
          playStation(station);
          setLocation(`/radio-playing?station=${station._id}`);
        }
      }
      // Genres - dynamic boundaries
      else if (index >= genresStart && index <= genresEnd) {
        const genreIndex = index - genresStart;
        const genre = genres[genreIndex];
        if (genre) {
          setLocation(`/genre-list/${genre.slug}`);
        }
      }
      // Country stations - dynamic boundary
      else if (index >= countryStationsStart) {
        const stationIndex = index - countryStationsStart;
        const station = displayedStations[stationIndex];
        if (station) {
          // Save navigation state before navigating
          setNavigationState(location, index);
          playStation(station);
          setLocation(`/radio-playing?station=${station._id}`);
        }
      }
    },
    onBack: () => {
      // Show exit confirmation modal
      setIsExitModalOpen(true);
      setExitModalFocusIndex(0); // Focus on "Cancel" button
    }
  });

  // Register page-specific key handler with custom navigation
  usePageKeyHandler('/discover-no-user', (e) => {
    // Exit modal key handler (highest priority)
    if (isExitModalOpen) {
      const key = (window as any).tvKey;
      
      switch(e.keyCode) {
        case key?.LEFT:
        case 37:
          e.preventDefault();
          setExitModalFocusIndex(0); // Cancel button
          break;
        case key?.RIGHT:
        case 39:
          e.preventDefault();
          setExitModalFocusIndex(1); // Exit button
          break;
        case key?.ENTER:
        case 13:
          e.preventDefault();
          if (exitModalFocusIndex === 0) {
            // Cancel - close modal
            setIsExitModalOpen(false);
          } else {
            // Exit - actually close the app
            if (typeof window !== 'undefined' && (window as any).tizen) {
              try {
                (window as any).tizen.application.getCurrentApplication().exit();
              } catch (err) {
                window.close();
              }
            } else {
              window.close();
            }
          }
          break;
        case key?.RETURN:
        case 461:
        case 10009:
          e.preventDefault();
          // Back button also cancels the exit modal
          setIsExitModalOpen(false);
          break;
      }
      return; // Consume event
    }

    // Ignore all key events when country selector modal is open
    if (isCountrySelectorOpen) {
      return;
    }

    // Help modal open — block all page navigation; ENTER/BACK closes popup
    if (helpOpenRef.current) {
      e.preventDefault();
      const _k = e.keyCode; const _tvk = (window as any).tvKey;
      if (_k === 13 || _k === _tvk?.ENTER || _k === 461 || _k === 10009 || _k === _tvk?.RETURN) { closeHelp(); }
      return;
    }

    const key = (window as any).tvKey;
    
    switch(e.keyCode) {
      case key?.UP:
      case 38:
        customHandleNavigation('UP');
        break;
      case key?.DOWN:
      case 40:
        customHandleNavigation('DOWN');
        break;
      case key?.LEFT:
      case 37:
        customHandleNavigation('LEFT');
        break;
      case key?.RIGHT:
      case 39:
        customHandleNavigation('RIGHT');
        break;
      case key?.ENTER:
      case 13:
        e.preventDefault();
        if (helpFocusedRef.current) { openHelp(); } else { handleSelect(); }
        break;
      case key?.PAGE_DOWN:
      case 34:
      case key?.PAGE_UP:
      case 33:
      case 427: // CH_UP - Samsung TV remote
      case 428: // CH_DOWN - Samsung TV remote
        // Jump to global player controls if visible
        e.preventDefault();
        {
          const globalPlayerButton = document.querySelector('[data-testid="button-global-play-pause"]') as HTMLElement;
          if (globalPlayerButton) {
            globalPlayerButton.focus();
          }
        }
        break;
      case key?.RETURN:
      case 461:
      case 10009:
        e.preventDefault();
        if (helpFocusedRef.current) { setHF(false); } else { handleBack(); }
        break;
    }
  });

  // Reset loading state when country changes to prevent stale state
  useEffect(() => {
    isLoadingRef.current = false;
    currentOffsetRef.current = 0;
    hasMoreRef.current = true;
    displayedCountRef.current = 0;
    setIsLoadingMore(false);
    setHasMoreCountryStations(true);
    setCurrentOffset(0);
    setDisplayedStations([]);
    setFocusIndex(0);
  }, [selectedCountryCode]);

  // Initialize country stations when initial data is loaded
  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (initialStationsData?.stations && initialStationsData.stations.length > 0) {
      const stations = initialStationsData.stations;
      setDisplayedStations(stations);
      setCurrentOffset(stations.length);
      setHasMoreCountryStations(true);
      initialLoadDone.current = true;
    }
  }, [initialStationsData, selectedCountryCode]);

  // Load recently played stations on mount and after auth changes
  useEffect(function() {
    if (isAuthenticated) {
      var timer = setTimeout(function() {
        var stations = recentlyPlayedService.getStations();
        setRecentStations(stations);
      }, 2000);
      return function() { clearTimeout(timer); };
    } else {
      var stations = recentlyPlayedService.getStations();
      setRecentStations(stations);
    }
  }, [isAuthenticated]);

  // Load personalized recommendations on mount
  useEffect(() => {
    const loadRecommendations = async () => {
      if (!recommendationService.hasEnoughData()) return;
      
      const topGenres = recommendationService.getTopGenres(2);
      const allStations: Station[] = [];
      
      for (const genre of topGenres) {
        try {
          const result = await megaRadioApi.getStationsByGenre(genre, { limit: 10 });
          if (result?.stations) {
            allStations.push(...result.stations);
          }
        } catch {}
      }
      
      const uniqueIds = new Set<string>();
      const unique = allStations.filter(s => {
        if (uniqueIds.has(s._id)) return false;
        uniqueIds.add(s._id);
        return true;
      });
      
      for (let i = unique.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [unique[i], unique[j]] = [unique[j], unique[i]];
      }
      
      setForYouStations(unique.slice(0, 12));
    };
    
    loadRecommendations();
  }, []);

  // Restore focus when returning from RadioPlaying
  useEffect(() => {
    const navState = popNavigationState(); // Pop and clear in one atomic operation
    if (navState && navState.returnFocusIndex !== null) {
      // Refresh recently played when returning from RadioPlaying
      const stations = recentlyPlayedService.getStations();
      setRecentStations(stations);
      // Restore focus when returning from RadioPlaying
      setFocusIndex(navState.returnFocusIndex);
    }
  }, []); // Only run once on mount

  // Auto-play on app startup based on settings
  useEffect(() => {
    const handleAutoPlay = async () => {
      if (!autoPlayService.shouldAutoPlay()) {
        return;
      }

      if (isPlaying) {
        return;
      }

      const playMode = autoPlayService.getPlayAtStartMode();

      if (playMode === "none") {
        return;
      }

      const stationToPlay = await autoPlayService.getStationToPlay(playMode, selectedCountryCode);
      
      if (stationToPlay) {
        playStation(stationToPlay);
        setLocation(`/radio-playing?station=${stationToPlay._id}`);
      }
    };

    const timer = setTimeout(() => {
      handleAutoPlay();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const currentOffsetRef = useRef(0);
  const hasMoreRef = useRef(true);
  const displayedCountRef = useRef(0);
  const countryCodeRef = useRef(selectedCountryCode);

  useEffect(() => { currentOffsetRef.current = currentOffset; }, [currentOffset]);
  useEffect(() => { hasMoreRef.current = hasMoreCountryStations; }, [hasMoreCountryStations]);
  useEffect(() => { displayedCountRef.current = displayedStations.length; }, [displayedStations.length]);
  useEffect(() => { countryCodeRef.current = selectedCountryCode; }, [selectedCountryCode]);

  const fetchStationsPage = async (country: string, offset: number, limit: number) => {
    return country === 'GLOBAL'
      ? megaRadioApi.getWorkingStations({ limit, offset })
      : megaRadioApi.getWorkingStations({ limit, country, offset });
  };

  const prefetchNextPage = (country: string, nextOffset: number) => {
    const queryKey = ['/api/stations/page', country, nextOffset, STATIONS_PER_LOAD];
    queryClient.prefetchQuery({
      queryKey,
      queryFn: () => fetchStationsPage(country, nextOffset, STATIONS_PER_LOAD),
      staleTime: 7 * 24 * 60 * 60 * 1000,
    });
  };

  const loadMoreCountryStations = async (silent = false) => {
    if (isLoadingRef.current) return;
    if (!hasMoreRef.current) return;
    if (displayedCountRef.current >= MAX_STATIONS) {
      setHasMoreCountryStations(false);
      return;
    }

    isLoadingRef.current = true;
    if (!silent) setIsLoadingMore(true);
    
    try {
      const offsetToUse = currentOffsetRef.current;
      const countryToUse = countryCodeRef.current;
      const queryKey = ['/api/stations/page', countryToUse, offsetToUse, STATIONS_PER_LOAD];

      const result = await queryClient.fetchQuery({
        queryKey,
        queryFn: () => fetchStationsPage(countryToUse, offsetToUse, STATIONS_PER_LOAD),
        staleTime: 7 * 24 * 60 * 60 * 1000,
        gcTime: 7 * 24 * 60 * 60 * 1000,
      });
      
      if (countryToUse !== countryCodeRef.current) return;

      const newStations = result.stations || [];
      
      if (newStations.length === 0) {
        setHasMoreCountryStations(false);
      } else {
        setDisplayedStations(prev => {
          const existingIds = new Set(prev.map(s => s._id));
          const uniqueNewStations = newStations.filter(s => !existingIds.has(s._id));
          const combined = [...prev, ...uniqueNewStations].slice(0, MAX_STATIONS);
          displayedCountRef.current = combined.length;
          return combined;
        });
        const nextOffset = offsetToUse + STATIONS_PER_LOAD;
        setCurrentOffset(nextOffset);
        currentOffsetRef.current = nextOffset;
        
        if (newStations.length < STATIONS_PER_LOAD || 
            displayedCountRef.current >= MAX_STATIONS) {
          setHasMoreCountryStations(false);
        } else {
          prefetchNextPage(countryToUse, nextOffset);
        }
      }
    } catch (error) {
    } finally {
      isLoadingRef.current = false;
      setIsLoadingMore(false);
    }
  };

  loadMoreRef.current = loadMoreCountryStations;

  // Auto-hide header on scroll down + TRUE INFINITE SCROLL trigger (scroll-based)
  // THROTTLED: Only process scroll events every 100ms for performance
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const now = Date.now();
      // Throttle: Skip if less than 100ms since last scroll
      if (now - lastScrollTime.current < 100) {
        return;
      }
      lastScrollTime.current = now;
      
      const currentScrollY = scrollContainer.scrollTop;
      
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setShowHeader(false);
      } 
      else if (currentScrollY < lastScrollY.current) {
        setShowHeader(true);
      }
      
      lastScrollY.current = currentScrollY;

      const scrollHeight = scrollContainer.scrollHeight;
      const scrollTop = scrollContainer.scrollTop;
      const clientHeight = scrollContainer.clientHeight;
      
      if (scrollHeight - scrollTop - clientHeight < 1200 && !isLoadingRef.current) {
        loadMoreRef.current(true);
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!hasMoreCountryStations || isLoadingRef.current || displayedStations.length === 0) return;
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const timer = setTimeout(() => {
      const { scrollHeight, clientHeight, scrollTop } = scrollContainer;
      if (scrollHeight - scrollTop - clientHeight < 1200 && !isLoadingRef.current) {
        loadMoreRef.current(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [displayedStations.length, hasMoreCountryStations]);

  useEffect(() => {
    if (focusIndex >= countryStationsStart && displayedStations.length > 0) {
      const stationIndex = focusIndex - countryStationsStart;
      const distanceFromEnd = displayedStations.length - stationIndex;
      
      if (distanceFromEnd <= 21 && !isLoadingRef.current) {
        loadMoreRef.current(true);
      }
    }
  }, [focusIndex, countryStationsStart, displayedStations.length]);

  // Auto-scroll focused element into view - uses instant scroll for TV remote reliability
  const pendingScrollRef = useRef<number | null>(null);
  useEffect(() => {
    if (pendingScrollRef.current) cancelAnimationFrame(pendingScrollRef.current);
    
    pendingScrollRef.current = requestAnimationFrame(() => {
      if (!scrollContainerRef.current) return;
      
      const scrollContainer = scrollContainerRef.current;
      let focusedElement: HTMLElement | null = null;
      
      if (recentCount > 0 && focusIndex >= recentStart && focusIndex <= recentEnd) {
        focusedElement = scrollContainer.querySelector('[data-testid="section-recently-played"]') as HTMLElement;
      } else if (forYouCount > 0 && focusIndex >= forYouStart && focusIndex <= forYouEnd) {
        focusedElement = scrollContainer.querySelector('[data-testid="section-for-you"]') as HTMLElement;
      } else if (focusIndex >= genresStart && focusIndex <= genresEnd) {
        focusedElement = scrollContainer.querySelector('[data-testid="section-genres"]') as HTMLElement;
      } else {
        focusedElement = scrollContainer.querySelector(`[data-focus-idx="${focusIndex}"]`) as HTMLElement;
      }
      
      if (!focusedElement) return;
      
      const PADDING = 100;
      
      const containerRect = scrollContainer.getBoundingClientRect();
      const elementRect = focusedElement.getBoundingClientRect();
      
      if (elementRect.top < containerRect.top + PADDING) {
        const diff = containerRect.top + PADDING - elementRect.top;
        scrollContainer.scrollTop = scrollContainer.scrollTop - diff;
      } else if (elementRect.bottom > containerRect.bottom - PADDING) {
        const diff = elementRect.bottom - (containerRect.bottom - PADDING);
        scrollContainer.scrollTop = scrollContainer.scrollTop + diff;
      }
    });

    return () => {
      if (pendingScrollRef.current) {
        cancelAnimationFrame(pendingScrollRef.current);
        pendingScrollRef.current = null;
      }
    };
  }, [focusIndex]);

  const FALLBACK_IMAGE = assetPath('images/fallback-station.png');

  const getStationImage = (station: Station) => {
    return resolveStationImageUrl(station.favicon) || FALLBACK_IMAGE;
  };

  const getStationTags = (station: Station): string[] => {
    if (!station.tags) return [];
    if (Array.isArray(station.tags)) return station.tags;
    return station.tags.split(',').map(tag => tag.trim());
  };

  const getStationCategory = (station: Station): string => {
    const tags = getStationTags(station);
    if (tags.length > 0) return tags[0];
    return station.country || 'Radio';
  };

  const stationRow1Positions = [236, 466, 696, 926, 1156, 1386, 1616];
  const stationRow2Positions = [236, 466, 696, 926, 1156, 1386, 1616];

  return (
    <div className="absolute inset-0 w-[1920px] h-[1080px] bg-[#0e0e0e] overflow-hidden" data-testid="page-discover-no-user">
      {/* Background Image */}
      <div className="absolute h-[1292px] left-[-10px] top-[-523px] w-[1939px] z-0">
        <img
          alt=""
          className="absolute inset-0 max-w-none object-cover pointer-events-none w-full h-full"
          src={assetPath("images/hand-crowd-disco-1.png")}
        />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute bg-gradient-to-b from-[0.88%] from-[rgba(14,14,14,0)] h-[1080px] left-0 to-[#0e0e0e] to-[48.611%] top-0 w-[1920px] z-0" />

      {/* Logo - ALWAYS VISIBLE, NEVER HIDES */}
      <div className="absolute h-[57px] left-[30px] top-[64px] w-[164.421px] z-50 pointer-events-auto">
        <p className="absolute bottom-0 font-['Ubuntu',Helvetica] leading-normal left-[18.67%] not-italic right-0 text-[27.029px] text-white top-[46.16%] whitespace-pre-wrap">
          <span className="font-bold">mega</span>radio
        </p>
        <div className="absolute bottom-[2.84%] left-0 right-[65.2%] top-0">
          <img
            alt=""
            className="block max-w-none w-full h-full"
            src={assetPath("images/path-8.svg")}
          />
        </div>
      </div>

      {/* Header Controls Section - Auto-hides on scroll down (Equalizer, Country, Login) */}
      <div 
        className="absolute top-0 left-0 w-[1920px] h-[242px] z-50 pointer-events-none transition-transform duration-300 ease-in-out"
        style={{ transform: showHeader ? 'translateY(0)' : 'translateY(-100%)' }}
      >
        {/* Country Selector */}
        <CountryTrigger
          selectedCountry={selectedCountry}
          selectedCountryCode={selectedCountryCode}
          onClick={() => setIsCountrySelectorOpen(true)}
          focusClasses={getFocusClasses(isCountryHeaderFocused)}
          className="absolute left-[1453px] top-[67px] pointer-events-auto"
        />

        {/* Login/Profile Button - Right of Country Selector */}
        <div
          className="absolute top-[67px] flex h-[51px] rounded-[30px] cursor-pointer transition-colors pointer-events-auto flex-shrink-0"
          style={{
            left: '1694px',
            backgroundColor: isAuthenticated ? 'rgba(255,255,255,0.1)' : '#ff4199',
            padding: '8px 16px',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
          }}
          onClick={function() { setLocation(isAuthenticated ? '/settings' : '/login'); }}
          data-testid="button-header-login"
          data-tv-focusable="true"
        >
          {isAuthenticated && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {user.avatar ? (
                <img src={user.avatar} alt="" style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#ff4199', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontSize: '16px', fontWeight: 700, fontFamily: "'Ubuntu', Helvetica" }}>{user.name.charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="#ffffff" strokeWidth="1.5" fill="none" />
                <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              </svg>
              <p className="font-['Ubuntu',Helvetica] font-bold text-[18px] text-white whitespace-nowrap">Login</p>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Left Sidebar */}
      <Sidebar activePage="discover" isFocused={helpFocused ? () => false : isFocused} getFocusClasses={getFocusClasses} isHelpFocused={helpFocused} />

      {/* Scrollable Content Area - Moves to top when header hides */}
      <div 
        ref={scrollContainerRef}
        className="absolute left-[162px] w-[1758px] overflow-y-auto overflow-x-hidden z-1 scrollbar-hide transition-all duration-300 ease-in-out"
        style={{
          top: showHeader ? '242px' : '64px',
          height: showHeader ? '838px' : '1016px'
        }}
      >
        <div 
          className="relative pb-[100px]"
          style={{
            minHeight: `${1013 + recentOffset + forYouOffset + (Math.ceil(displayedStations.length / 7) * 294) + 364}px`
          }}
        >
        {/* Recently Played Section */}
        {recentStations.length > 0 && (
          <div data-testid="section-recently-played">
            <p className="absolute font-['Ubuntu',Helvetica] font-bold leading-normal left-[74px] not-italic text-[32px] text-white top-0">
              {t('recently_played') || 'Recently Played'}
            </p>
            <div 
              ref={recentScrollRef}
              className="absolute left-[74px] top-[50px] w-[1580px] overflow-x-auto overflow-y-visible scrollbar-hide scroll-smooth"
            >
              <div className="flex py-[10px] px-[10px]" style={{ gap: '16px' }}>
                {recentStations.map((station, index) => {
                  const focusIdx = recentStart + index;
                  return (
                    <div
                      key={`recent-${station._id}-${index}`}
                      className={`relative bg-[rgba(255,255,255,0.14)] h-[220px] overflow-clip rounded-[11px] w-[180px] cursor-pointer hover:bg-[rgba(255,255,255,0.2)] transition-colors flex-shrink-0 ${getFocusClasses(isFocused(focusIdx))}`}
                      data-testid={`card-recent-station-${station._id}`}
                      data-focus-idx={focusIdx}
                      onClick={() => {
                        setNavigationState(location, focusIdx);
                        playStation(station);
                        setLocation(`/radio-playing?station=${station._id}`);
                      }}
                    >
                      <div className="absolute bg-white left-[30px] overflow-clip rounded-[6.6px] w-[120px] h-[120px] top-[20px]">
                        <img
                          alt={station.name}
                          className="absolute inset-0 max-w-none object-cover pointer-events-none w-full h-full"
                          src={getStationImage(station)}
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                          }}
                        />
                      </div>
                      <p className="absolute font-['Ubuntu',Helvetica] font-medium leading-normal left-[90px] not-italic text-[18px] text-center text-white top-[152px] translate-x-[-50%] truncate px-2 max-w-[160px]">
                        {station.name}
                      </p>
                      <p className="absolute font-['Ubuntu',Helvetica] font-light leading-normal left-[90px] not-italic text-[14px] text-center text-white top-[178px] translate-x-[-50%] truncate px-2 max-w-[160px]">
                        {getStationCategory(station)}
                      </p>
                      <div className="absolute inset-0 pointer-events-none shadow-[inset_1.1px_1.1px_12.1px_0px_rgba(255,255,255,0.12)]" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* For You Section */}
        {forYouStations.length > 0 && (
          <div data-testid="section-for-you" style={{ position: 'absolute', top: `${recentOffset}px`, left: 0, right: 0 }}>
            <p className="absolute font-['Ubuntu',Helvetica] font-bold leading-normal left-[74px] not-italic text-[32px] text-white top-0">
              {t('for_you') || 'For You'}
            </p>
            <div 
              ref={forYouScrollRef}
              className="absolute left-[74px] top-[50px] w-[1580px] overflow-x-auto overflow-y-visible scrollbar-hide scroll-smooth"
            >
              <div className="flex py-[10px] px-[10px]" style={{ gap: '16px' }}>
                {forYouStations.map((station, index) => {
                  const focusIdx = forYouStart + index;
                  return (
                    <div
                      key={`foryou-${station._id}-${index}`}
                      className={`relative bg-[rgba(255,255,255,0.14)] h-[220px] overflow-clip rounded-[11px] w-[180px] cursor-pointer hover:bg-[rgba(255,255,255,0.2)] transition-colors flex-shrink-0 ${getFocusClasses(isFocused(focusIdx))}`}
                      data-testid={`card-foryou-station-${station._id}`}
                      data-focus-idx={focusIdx}
                      onClick={() => {
                        setNavigationState(location, focusIdx);
                        playStation(station);
                        setLocation(`/radio-playing?station=${station._id}`);
                      }}
                    >
                      <div className="absolute bg-white left-[30px] overflow-clip rounded-[6.6px] w-[120px] h-[120px] top-[20px]">
                        <img
                          alt={station.name}
                          className="absolute inset-0 max-w-none object-cover pointer-events-none w-full h-full"
                          src={getStationImage(station)}
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                          }}
                        />
                      </div>
                      <p className="absolute font-['Ubuntu',Helvetica] font-medium leading-normal left-[90px] not-italic text-[18px] text-center text-white top-[152px] translate-x-[-50%] truncate px-2 max-w-[160px]">
                        {station.name}
                      </p>
                      <p className="absolute font-['Ubuntu',Helvetica] font-light leading-normal left-[90px] not-italic text-[14px] text-center text-white top-[178px] translate-x-[-50%] truncate px-2 max-w-[160px]">
                        {getStationCategory(station)}
                      </p>
                      <div className="absolute inset-0 pointer-events-none shadow-[inset_1.1px_1.1px_12.1px_0px_rgba(255,255,255,0.12)]" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Popular Genres Section */}
        <div data-testid="section-genres" style={{ position: 'absolute', top: `${recentOffset + forYouOffset}px`, left: 0, right: 0 }}>
        <p className="absolute font-['Ubuntu',Helvetica] font-bold leading-normal left-[74px] not-italic text-[32px] text-white top-0">
          {selectedCountryCode === 'GLOBAL' 
            ? `${t('popular_genres')} (Global)` 
            : t('popular_genres')}
        </p>

        {/* Genre Pills - Horizontal Scrollable */}
        <div 
          ref={genreScrollRef}
          className="absolute left-[74px] top-[59px] w-[1580px] overflow-x-auto overflow-y-visible scrollbar-hide scroll-smooth"
          data-genre-container
        >
          <div className="flex py-[15px] px-[10px]" style={{ gap: '20px' }}>
            {genres.map((genre, index) => {
              const focusIdx = genresStart + index;
              return (
                <Link 
                  key={`${genre.slug}-${index}`} 
                  href={`/genre-list/${genre.slug}`}
                  style={{ marginRight: '20px', display: 'inline-block', flexShrink: 0 }}
                >
                  <div 
                    className={`relative bg-[rgba(255,255,255,0.14)] flex gap-[10px] items-center px-[72px] py-[28px] rounded-[20px] cursor-pointer hover:bg-[rgba(255,255,255,0.2)] transition-colors ${getFocusClasses(isFocused(focusIdx))}`}
                    data-testid={genre.slug}
                    data-genre-pill
                    style={{ display: 'inline-flex', whiteSpace: 'nowrap' }}
                  >
                    <p className="font-['Ubuntu',Helvetica] font-medium leading-normal not-italic text-[22px] text-center text-white whitespace-nowrap">
                      {genre.name}
                    </p>
                    <div className="absolute inset-0 pointer-events-none shadow-[inset_1.1px_1.1px_12.1px_0px_rgba(255,255,255,0.12)] rounded-[20px]" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
        </div>

        {/* Popular Radios Section */}
        <p className="absolute font-['Ubuntu',Helvetica] font-bold leading-normal left-[74px] not-italic text-[32px] text-white" style={{ top: `${223 + recentOffset + forYouOffset}px` }}>
          {selectedCountryCode === 'GLOBAL' 
            ? `${t('homepage_popular_stations')} (Global)` 
            : t('homepage_popular_stations')}
        </p>

        {/* Skeleton Loading for Popular Stations - only shown during active loading */}
        {!popularStationsData && popularStations.length === 0 && Array.from({ length: 14 }).map((_, index) => {
          const row = Math.floor(index / 7);
          const col = index % 7;
          return (
            <div
              key={`skeleton-pop-${index}`}
              className="absolute bg-[rgba(255,255,255,0.08)] h-[264px] rounded-[11px] w-[200px] animate-pulse"
              style={{ left: `${stationRow1Positions[col] - 162}px`, top: `${297 + recentOffset + forYouOffset + row * 294}px` }}
            >
              <div className="absolute bg-[rgba(255,255,255,0.1)] left-[34px] rounded-[6.6px] w-[132px] h-[132px] top-[34px]" />
              <div className="absolute bg-[rgba(255,255,255,0.1)] left-[16px] right-[16px] h-[14px] rounded top-[186px]" />
              <div className="absolute bg-[rgba(255,255,255,0.06)] left-[16px] w-[80px] h-[12px] rounded top-[210px]" />
            </div>
          );
        })}

        {/* Skeleton Loading for Country Stations - only shown during active loading */}
        {isInitialLoading && displayedStations.length === 0 && Array.from({ length: 7 }).map((_, index) => (
          <div
            key={`skeleton-country-${index}`}
            className="absolute bg-[rgba(255,255,255,0.08)] h-[264px] rounded-[11px] w-[200px] animate-pulse"
            style={{ left: `${stationRow1Positions[index] - 162}px`, top: `${1013 + recentOffset + forYouOffset}px` }}
          >
            <div className="absolute bg-[rgba(255,255,255,0.1)] left-[34px] rounded-[6.6px] w-[132px] h-[132px] top-[34px]" />
            <div className="absolute bg-[rgba(255,255,255,0.1)] left-[16px] right-[16px] h-[14px] rounded top-[186px]" />
            <div className="absolute bg-[rgba(255,255,255,0.06)] left-[16px] w-[80px] h-[12px] rounded top-[210px]" />
          </div>
        ))}

        {/* Popular Radio Station Cards - Row 1 */}
        {popularStations.slice(0, 7).map((station, index) => {
          const focusIdx = popularStationsStart + index;
          return (
            <Link 
              key={station._id || index} 
              href={`/radio-playing?station=${station._id}`}
              onClick={() => {
                setNavigationState(location, focusIdx);
                playStation(station);
              }}
            >
              <div 
                className={`absolute bg-[rgba(255,255,255,0.14)] h-[264px] overflow-clip rounded-[11px] w-[200px] cursor-pointer hover:bg-[rgba(255,255,255,0.2)] transition-colors ${getFocusClasses(isFocused(focusIdx))}`}
                style={{ left: `${stationRow1Positions[index] - 162}px`, top: `${297 + recentOffset + forYouOffset}px` }}
                data-testid={`card-station-${station._id}`}
                data-focus-idx={focusIdx}
              >
                <div className="absolute bg-white left-[34px] overflow-clip rounded-[6.6px] w-[132px] h-[132px] top-[34px]">
                  <img
                    alt={station.name}
                    className="absolute inset-0 max-w-none object-cover pointer-events-none w-full h-full"
                    src={getStationImage(station)}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                    }}
                  />
                </div>
                <p className="absolute font-['Ubuntu',Helvetica] font-medium leading-normal left-[100px] not-italic text-[22px] text-center text-white top-[187px] translate-x-[-50%] truncate px-2 max-w-[180px]">
                  {station.name}
                </p>
                <p className="absolute font-['Ubuntu',Helvetica] font-light leading-normal left-[100px] not-italic text-[18px] text-center text-white top-[218.2px] translate-x-[-50%] truncate px-2 max-w-[180px]">
                  {getStationCategory(station)}
                </p>
                <div className="absolute inset-0 pointer-events-none shadow-[inset_1.1px_1.1px_12.1px_0px_rgba(255,255,255,0.12)]" />
              </div>
            </Link>
          );
        })}

        {/* Popular Radio Station Cards - Row 2 */}
        {popularStations.slice(7, 14).map((station, index) => {
          const focusIdx = popularStationsStart + 7 + index;
          return (
            <Link 
              key={station._id || index} 
              href={`/radio-playing?station=${station._id}`}
              onClick={() => {
                setNavigationState(location, focusIdx);
                playStation(station);
              }}
            >
              <div 
                className={`absolute bg-[rgba(255,255,255,0.14)] h-[264px] overflow-clip rounded-[11px] w-[200px] cursor-pointer hover:bg-[rgba(255,255,255,0.2)] transition-colors ${getFocusClasses(isFocused(focusIdx))}`}
                style={{ left: `${stationRow2Positions[index] - 162}px`, top: `${591 + recentOffset + forYouOffset}px` }}
                data-testid={`card-station-${station._id}`}
                data-focus-idx={focusIdx}
              >
                <div className="absolute bg-white left-[34px] overflow-clip rounded-[6.6px] w-[132px] h-[132px] top-[34px]">
                  <img
                    alt={station.name}
                    className="absolute inset-0 max-w-none object-cover pointer-events-none w-full h-full"
                    src={getStationImage(station)}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                    }}
                  />
                </div>
                <p className="absolute font-['Ubuntu',Helvetica] font-medium leading-normal left-[100px] not-italic text-[22px] text-center text-white top-[187px] translate-x-[-50%] truncate px-2 max-w-[180px]">
                  {station.name}
                </p>
                <p className="absolute font-['Ubuntu',Helvetica] font-light leading-normal left-[100px] not-italic text-[18px] text-center text-white top-[218.2px] translate-x-[-50%] truncate px-2 max-w-[180px]">
                  {getStationCategory(station)}
                </p>
                <div className="absolute inset-0 pointer-events-none shadow-[inset_1.1px_1.1px_12.1px_0px_rgba(255,255,255,0.12)]" />
              </div>
            </Link>
          );
        })}

        {/* More From [Country] Section */}
        <p className="absolute font-['Ubuntu',Helvetica] font-bold leading-normal left-[74px] not-italic text-[32px] text-white" style={{ top: `${939 + recentOffset + forYouOffset}px` }}>
          {t('more_from')} {selectedCountry}
        </p>

        {/* Loading Spinner for lazy loading */}
        {isLoadingMore && displayedStations.length > 0 && (
          <div 
            className="absolute left-[236px] w-[1580px] h-[80px] flex items-center justify-center gap-4"
            style={{ top: `${1013 + recentOffset + forYouOffset + (Math.ceil(displayedStations.length / 7) * 294)}px` }}
          >
            <div className="animate-spin rounded-full h-10 w-10 border-t-3 border-b-3 border-[#ff4199]"></div>
          </div>
        )}

        {/* Country Stations - Dynamic Rows with Infinite Scroll */}
        {displayedStations.map((station, index) => {
          const row = Math.floor(index / 7);
          const col = index % 7;
          const positions = [236, 466, 696, 926, 1156, 1386, 1616];
          const topPosition = 1013 + recentOffset + forYouOffset + (row * 294);
          const focusIdx = countryStationsStart + index;
          
          return (
            <Link 
              key={station._id || index} 
              href={`/radio-playing?station=${station._id}`}
              onClick={() => {
                setNavigationState(location, focusIdx);
                playStation(station);
              }}
            >
              <div 
                className={`absolute bg-[rgba(255,255,255,0.14)] h-[264px] overflow-clip rounded-[11px] w-[200px] cursor-pointer hover:bg-[rgba(255,255,255,0.2)] transition-colors ${getFocusClasses(isFocused(focusIdx))}`}
                style={{ 
                  left: `${positions[col] - 162}px`,
                  top: `${topPosition}px`
                }}
                data-testid={`card-country-station-${station._id}`}
                data-focus-idx={focusIdx}
              >
                <div className="absolute bg-white left-[34px] overflow-clip rounded-[6.6px] w-[132px] h-[132px] top-[34px]">
                  <img
                    alt={station.name}
                    className="absolute inset-0 max-w-none object-cover pointer-events-none w-full h-full"
                    src={getStationImage(station)}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                    }}
                  />
                </div>
                <p className="absolute font-['Ubuntu',Helvetica] font-medium leading-normal left-[100px] not-italic text-[22px] text-center text-white top-[187px] translate-x-[-50%] truncate px-2 max-w-[180px]">
                  {station.name}
                </p>
                <p className="absolute font-['Ubuntu',Helvetica] font-light leading-normal left-[100px] not-italic text-[18px] text-center text-white top-[218.2px] translate-x-[-50%] truncate px-2 max-w-[180px]">
                  {getStationCategory(station)}
                </p>
                <div className="absolute inset-0 pointer-events-none shadow-[inset_1.1px_1.1px_12.1px_0px_rgba(255,255,255,0.12)]" />
              </div>
            </Link>
          );
        })}

        
        </div>
      </div>

      {/* Country Selector Modal */}
      <CountrySelector
        isOpen={isCountrySelectorOpen}
        onClose={() => setIsCountrySelectorOpen(false)}
        selectedCountry={selectedCountry}
        onSelectCountry={(country) => {
          setCountry(country.name, country.code, country.flag);
        }}
      />

      {/* Exit Confirmation Modal - Centered like Country Selector */}
      {isExitModalOpen && (
        <div className="absolute top-0 left-0 w-[1920px] h-[1080px] z-[100]">
          {/* Backdrop */}
          <div className="absolute top-0 left-0 w-[1920px] h-[1080px] bg-black/80 backdrop-blur-[7px]" />
          
          {/* Modal Container - Centered */}
          <div 
            className="absolute bg-[#1a1a1a] rounded-[20px] border-2 border-[rgba(255,255,255,0.1)]"
            style={{ left: '660px', top: '340px', width: '600px', height: '400px' }}
            data-testid="modal-exit-confirmation"
          >
            {/* Title */}
            <div className="absolute top-[50px] left-[50px] right-[50px]">
              <h2 className="font-['Ubuntu',Helvetica] font-bold text-[36px] text-white text-center">
                {t('exit_app') || 'Exit App?'}
              </h2>
            </div>
            
            {/* Message */}
            <div className="absolute top-[130px] left-[50px] right-[50px]">
              <p className="font-['Ubuntu',Helvetica] font-normal text-[24px] text-white/70 text-center">
                {t('are_you_sure_exit') || 'Are you sure you want to exit MegaRadio?'}
              </p>
            </div>
            
            {/* Buttons */}
            <div className="absolute bottom-[50px] left-[50px] right-[50px] flex gap-6 justify-center">
              {/* Cancel Button */}
              <button
                className={`px-12 py-4 rounded-[30px] font-['Ubuntu',Helvetica] font-bold text-[24px] transition-all ${
                  exitModalFocusIndex === 0
                    ? 'bg-white text-black border-4 border-[#ff4199]'
                    : 'bg-[rgba(255,255,255,0.1)] text-white border-2 border-[rgba(255,255,255,0.2)]'
                }`}
                onClick={() => setIsExitModalOpen(false)}
                data-testid="button-exit-cancel"
              >
                {t('cancel') || 'Cancel'}
              </button>
              
              {/* Exit Button */}
              <button
                className={`px-12 py-4 rounded-[30px] font-['Ubuntu',Helvetica] font-bold text-[24px] transition-all ${
                  exitModalFocusIndex === 1
                    ? 'bg-[#ff4199] text-white border-4 border-[#ff4199]'
                    : 'bg-[rgba(255,65,153,0.3)] text-white border-2 border-[rgba(255,65,153,0.5)]'
                }`}
                onClick={() => {
                  if (typeof window !== 'undefined' && (window as any).tizen) {
                    try {
                      (window as any).tizen.application.getCurrentApplication().exit();
                    } catch (e) {
                      window.close();
                    }
                  } else {
                    window.close();
                  }
                }}
                data-testid="button-exit-confirm"
              >
                {t('exit') || 'Exit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

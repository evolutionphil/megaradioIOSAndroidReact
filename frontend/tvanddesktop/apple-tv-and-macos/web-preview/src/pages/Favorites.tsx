import { Link, useLocation } from "wouter";
import { useState, useRef } from "react";
import { resolveStationImageUrl } from "@/lib/imageUtils";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useLocalization } from "@/contexts/LocalizationContext";
import { Station } from "@/services/megaRadioApi";
import { usePageKeyHandler } from "@/contexts/FocusRouterContext";
import { useFocusManager, getFocusClasses } from "@/hooks/useFocusManager";
import { Sidebar } from "@/components/Sidebar";
import { assetPath } from "@/lib/assetPath";
import { useHelp } from "@/contexts/HelpContext";

export const Favorites = (): JSX.Element => {
  const { favorites } = useFavorites();
  const { t } = useLocalization();
  const [, setLocation] = useLocation();
  
  // Define sidebar routes (6 items: 0-5)
  const sidebarRoutes = ['/discover-no-user', '/genres', '/search', '/favorites', '/country-select', '/settings'];
  
  // Safely get favorites array with null checks
  const favoritesArray = Array.isArray(favorites) ? favorites : [];
  const { openHelp, closeHelp, helpOpen } = useHelp();
  const [helpFocused, setHelpFocused] = useState(false);
  const helpFocusedRef = useRef(false);
  const helpOpenRef = useRef(false);
  helpFocusedRef.current = helpFocused;
  helpOpenRef.current = helpOpen;
  const setHF = (v: boolean) => { helpFocusedRef.current = v; setHelpFocused(v); };
  
  // 0-5 = sidebar nav items, 6+ = favorites content (Help uses helpFocused state, not focusIndex)
  const favoritesStart = 6;
  const totalItems = 6 + (favoritesArray.length || 1);
  
  // Focus management with custom navigation
  const { focusIndex, handleNavigation: baseHandleNavigation, handleSelect, handleBack, isFocused, setFocusIndex } = useFocusManager({
    totalItems,
    cols: 1,
    initialIndex: favoritesStart,
    onSelect: (index) => {
      // Sidebar navigation (0-5)
      if (index >= 0 && index <= 5) {
        window.location.hash = '#' + sidebarRoutes[index];
      }
      // Favorites section
      else if (index >= favoritesStart) {
        if (favoritesArray.length === 0) {
          // Empty state: go to discover
          setLocation('/discover-no-user');
        } else {
          // Navigate to radio playing page
          const stationIndex = index - favoritesStart;
          if (stationIndex >= 0 && stationIndex < favoritesArray.length) {
            const station = favoritesArray[stationIndex];
            if (station && station._id) {
              setLocation(`/radio-playing?station=${station._id}`);
            }
          }
        }
      }
    },
    onBack: () => setLocation('/discover-no-user')
  });

  // Custom navigation logic
  const customHandleNavigation = (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    const current = focusIndex;
    let newIndex = current;

    // Help button focus mode
    if (helpFocusedRef.current) {
      if (direction === 'UP') { setHF(false); }
      else if (direction === 'RIGHT') { setHF(false); setFocusIndex(favoritesStart); }
      return;
    }

    // Sidebar section (0-5)
    if (current >= 0 && current <= 5) {
      if (direction === 'DOWN') {
        if (current < 5) newIndex = current + 1;
        else { setHF(true); return; }
      } else if (direction === 'UP') {
        newIndex = current > 0 ? current - 1 : current;
      } else if (direction === 'RIGHT') {
        newIndex = favoritesStart;
      }
    }
    // Favorites section
    else if (current >= favoritesStart) {
      const relIndex = current - favoritesStart;
      const row = Math.floor(relIndex / 7);
      const col = relIndex % 7;
      const favoritesLength = favoritesArray.length || 0;

      if (direction === 'LEFT') {
        if (col > 0) {
          newIndex = current - 1;
        } else {
          newIndex = 3; // Jump to Favorites sidebar item
        }
      } else if (direction === 'RIGHT') {
        if (col < 6 && current < totalItems - 1) {
          newIndex = current + 1;
        }
      } else if (direction === 'UP') {
        if (row > 0) {
          newIndex = current - 7;
        }
      } else if (direction === 'DOWN') {
        const nextRow = current + 7;
        if (nextRow < totalItems) {
          newIndex = nextRow;
        }
      }
    }

    // Clamp to valid range
    newIndex = Math.max(0, Math.min(totalItems - 1, newIndex));
    setFocusIndex(newIndex);
  };

  // Register page-specific key handler
  usePageKeyHandler('/favorites', (e) => {
    const key = (window as any).tvKey;

    // Help modal open — block all page navigation; ENTER/BACK closes popup
    if (helpOpenRef.current) {
      e.preventDefault();
      const _k = e.keyCode;
      if (_k === 13 || _k === key?.ENTER || _k === 461 || _k === 10009 || _k === key?.RETURN) { closeHelp(); }
      return;
    }
    
    switch(e.keyCode) {
      case key?.UP:
      case 38:
        e.preventDefault();
        customHandleNavigation('UP');
        break;
      case key?.DOWN:
      case 40:
        e.preventDefault();
        customHandleNavigation('DOWN');
        break;
      case key?.LEFT:
      case 37:
        e.preventDefault();
        customHandleNavigation('LEFT');
        break;
      case key?.RIGHT:
      case 39:
        e.preventDefault();
        customHandleNavigation('RIGHT');
        break;
      case key?.ENTER:
      case 13:
        e.preventDefault();
        if (helpFocusedRef.current) { openHelp(); } else { handleSelect(); }
        break;
      case key?.RETURN:
      case 461:
      case 10009:
        e.preventDefault();
        if (helpFocusedRef.current) { setHF(false); } else { handleBack(); }
        break;
    }
  });

  // Fallback image - music note on pink gradient background
  const FALLBACK_IMAGE = assetPath('images/fallback-station.png');

  // Helper function to get station image
  const getStationImage = (station: Station) => {
    return resolveStationImageUrl(station.favicon) || FALLBACK_IMAGE;
  };

  // Helper function to get station tags as array
  const getStationTags = (station: Station): string[] => {
    if (!station.tags) return [];
    if (Array.isArray(station.tags)) return station.tags;
    return station.tags.split(',').map(tag => tag.trim());
  };

  // Helper function to get first category/tag
  const getStationCategory = (station: Station): string => {
    const tags = getStationTags(station);
    if (tags.length > 0) return tags[0];
    return station.country || 'Radio';
  };

  return (
    <>
      <div className="absolute inset-0 w-[1920px] h-[1080px] overflow-hidden" data-testid="page-favorites">
        {/* Background Image */}
        <div className="absolute h-[1292px] left-[-10px] top-[-523px] w-[1939px]">
          <img
            alt=""
            className="absolute inset-0 max-w-none object-cover pointer-events-none w-full h-full"
            src={assetPath("images/hand-crowd-disco-1.png")}
          />
        </div>

        {/* Gradient Overlay */}
        <div className="absolute bg-gradient-to-b from-[18.704%] from-[rgba(14,14,14,0)] h-[1080px] left-0 to-[#0e0e0e] to-[25.787%] top-0 w-[1920px]" />

        {/* Logo - Top Left - Matching AppLayout */}
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

        {/* Page Title */}
        <p className="absolute font-['Ubuntu',Helvetica] font-bold leading-normal left-[236px] not-italic text-[32px] text-white top-[242px]">
          {t('your_favorites') || 'Your Favorites'}
        </p>

        {/* Empty State or Station Grid */}
        {favoritesArray.length === 0 ? (
          <>
            {/* Heart Icon - Centered */}
            <div className="absolute left-[986px] w-[124px] h-[124px] top-[365px]">
              <svg viewBox="0 0 124 124" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <circle cx="62" cy="62" r="62" fill="rgba(255, 255, 255, 0.1)"/>
                <path d="M62 85.25C61.2396 85.25 60.4792 85.0208 59.8604 84.5625C55.4375 81.2292 51.4479 78.3021 48.4792 75.4167C43.9479 70.9729 40.75 66.8896 40.75 61.25C40.75 53.2917 47 47 54.5625 47C58.1042 47 61.4167 48.7708 63.625 51.7604C65.8333 48.7708 69.1458 47 72.6875 47C80.25 47 86.5 53.2917 86.5 61.25C86.5 66.8896 83.3021 70.9729 78.7708 75.4375C75.8021 78.3229 71.8125 81.25 67.3896 84.5833C66.7708 85.0208 66.0104 85.25 65.25 85.25H62Z" fill="#FF4199"/>
              </svg>
            </div>

            {/* Text Message - Centered */}
            <div className="absolute font-['Ubuntu',Helvetica] font-medium leading-normal left-[1047.5px] not-italic text-[32px] text-center text-white top-[504px] translate-x-[-50%]">
              <p>{t('no_favorites_yet') || "You don't have any favorites yet"}</p>
            </div>

            {/* Call to Action */}
            <Link href="/discover-no-user">
              <div className={`absolute left-[calc(50%+87.5px)] top-[calc(50%+98px)] translate-x-[-50%] cursor-pointer hover:opacity-80 transition-opacity ${getFocusClasses(isFocused(favoritesStart))}`} data-testid="button-discover-cta" onClick={() => setLocation('/discover-no-user')}>
                <p className="font-['Ubuntu',Helvetica] font-medium leading-normal not-italic text-[#ff4199] text-[24px] text-center">
                  {t('discover_stations_near_you') || 'Discover stations near to you!'}
                </p>
                <div className="absolute left-[calc(100%+10px)] top-[50%] translate-y-[-50%] w-[38px] h-[38px]">
                  <svg viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <path d="M14.25 28.5L23.75 19L14.25 9.5" stroke="#FF4199" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </Link>
          </>
        ) : (
          <>
            {/* Radio Station Cards - Dynamic Grid (7 columns like GenreList) */}
            {Array.isArray(favoritesArray) && favoritesArray.length > 0 && favoritesArray.map((station, index) => {
              if (!station || !station._id) return null;
              const row = Math.floor(index / 7);
              const col = index % 7;
              const leftPosition = 236 + (col * 230); // 236px start, 230px between columns
              const topPosition = 316 + (row * 294); // 316px start, 294px between rows
              
              return (
                <Link key={station._id} href={`/radio-playing?station=${station._id}`}>
                  <div 
                    className={`absolute bg-[rgba(255,255,255,0.14)] h-[264px] overflow-clip rounded-[11px] w-[200px] cursor-pointer hover:bg-[rgba(255,255,255,0.2)] transition-colors ${getFocusClasses(isFocused(favoritesStart + index))}`}
                    style={{ left: `${leftPosition}px`, top: `${topPosition}px` }}
                    data-testid={`station-card-${index}`}
                    onClick={() => setLocation(`/radio-playing?station=${station._id}`)}
                  >
                    <div className="absolute bg-white left-[34px] overflow-clip rounded-[6.6px] w-[132px] h-[132px] top-[34px]">
                      <img
                        alt={station.name || 'Station'}
                        className="absolute inset-0 max-w-none object-cover pointer-events-none w-full h-full"
                        src={getStationImage(station)}
                    loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                        }}
                      />
                    </div>
                    <p className="absolute font-['Ubuntu',Helvetica] font-medium leading-normal left-[100px] not-italic text-[22px] text-center text-white top-[187px] translate-x-[-50%] truncate px-2 max-w-[180px]">
                      {station.name || 'Unknown'}
                    </p>
                    <p className="absolute font-['Ubuntu',Helvetica] font-light leading-normal left-[100px] not-italic text-[18px] text-center text-white top-[218.2px] translate-x-[-50%] truncate px-2 max-w-[180px]">
                      {getStationCategory(station)}
                    </p>
                    <div className="absolute inset-0 pointer-events-none shadow-[inset_1.1px_1.1px_12.1px_0px_rgba(255,255,255,0.12)]" />
                  </div>
                </Link>
              );
            })}
          </>
        )}
      </div>

      {/* Sidebar */}
      <Sidebar activePage="favorites" isFocused={helpFocused ? () => false : isFocused} getFocusClasses={getFocusClasses} isHelpFocused={helpFocused} />
    </>
  );
};

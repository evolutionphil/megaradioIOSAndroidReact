import { Link } from "wouter";
import { assetPath } from "@/lib/assetPath";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useHelp } from "@/contexts/HelpContext";

interface SidebarProps {
  activePage: 'discover' | 'genres' | 'search' | 'favorites' | 'settings' | 'country';
  isFocused: (index: number) => boolean;
  getFocusClasses: (focused: boolean) => string;
  isHelpFocused?: boolean;
}

interface SidebarItemProps {
  href: string;
  icon: string;
  label: string;
  index: number;
  page: SidebarProps['activePage'];
  activePage: SidebarProps['activePage'];
  isFocused: boolean;
  testId: string;
}

function SidebarItem({ href, icon, label, isFocused: focused, activePage, page, testId }: SidebarItemProps) {
  var isActive = activePage === page;
  return (
    <Link href={href}>
      <div
        style={{
          width: '120px',
          height: '100px',
          position: 'relative',
          borderRadius: '10px',
          overflow: 'hidden',
          backgroundColor: focused ? 'rgba(255,65,153,0.25)' : isActive ? 'rgba(255,65,153,0.2)' : 'transparent',
          boxShadow: focused ? '0 0 16px rgba(255,65,153,0.5)' : 'none',
          opacity: focused ? 1 : 0.85,
          transition: 'background-color 0.2s, box-shadow 0.2s, opacity 0.2s',
        }}
        data-testid={testId}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', padding: '14px 8px' }}>
          <div style={{ width: '28px', height: '28px', marginBottom: '6px', flexShrink: 0 }}>
            <img
              alt=""
              style={{ display: 'block', width: '100%', height: '100%', maxWidth: 'none' }}
              src={assetPath(icon)}
            />
          </div>
          <p
            style={{
              fontFamily: "'Ubuntu', Helvetica, sans-serif",
              fontSize: '16px',
              fontWeight: 500,
              color: '#ffffff',
              textAlign: 'center',
              lineHeight: '1.2',
              width: '104px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              margin: 0,
              padding: 0
            }}
          >
            {label}
          </p>
        </div>
      </div>
    </Link>
  );
}


export const Sidebar = ({ activePage, isFocused, getFocusClasses, isHelpFocused }: SidebarProps): JSX.Element => {
  const { t } = useLocalization();
  const { openHelp } = useHelp();
  var setShowHelp = (v: boolean) => { if (v) openHelp(); };

  var items = [
    { href: '/discover-no-user', icon: 'images/radio-icon.svg', label: t('nav_discover') || 'Discover', page: 'discover' as const, testId: 'button-discover' },
    { href: '/genres', icon: 'images/music-icon.svg', label: t('nav_genres') || 'Genres', page: 'genres' as const, testId: 'button-genres' },
    { href: '/search', icon: 'images/search-icon.svg', label: t('nav_search') || 'Search', page: 'search' as const, testId: 'button-search' },
    { href: '/favorites', icon: 'images/heart-icon.svg', label: t('nav_favorites') || 'Favorites', page: 'favorites' as const, testId: 'button-favorites' },
    { href: '/country-select', icon: 'images/globe-icon.svg', label: t('nav_country') || 'Country', page: 'country' as const, testId: 'button-country' },
    { href: '/settings', icon: 'images/settings-icon.svg', label: t('nav_settings') || 'Settings', page: 'settings' as const, testId: 'button-settings' },
  ];

  var helpIndex = items.length;

  return (
    <div style={{ position: 'fixed', left: '48px', top: '170px', width: '120px', height: '760px', zIndex: 60, pointerEvents: 'auto' }}>
      {items.map(function(item, index) {
        return (
          <div key={item.page} style={{ position: 'absolute', left: 0, top: (index * 108) + 'px' }}>
            <SidebarItem
              href={item.href}
              icon={item.icon}
              label={item.label}
              index={index}
              page={item.page}
              activePage={activePage}
              isFocused={isFocused(index)}
              testId={item.testId}
            />
          </div>
        );
      })}

      <div style={{ position: 'absolute', left: 0, top: (helpIndex * 108) + 'px' }}>
        <div
          tabIndex={0}
          onClick={function() { setShowHelp(true); }}
          onKeyDown={function(e: any) { if (e.key === 'Enter' || e.keyCode === 13) { setShowHelp(true); } }}
          style={{
            width: '120px',
            height: '100px',
            position: 'relative',
            borderRadius: '10px',
            overflow: 'hidden',
            backgroundColor: isHelpFocused ? 'rgba(255,65,153,0.25)' : 'transparent',
            boxShadow: isHelpFocused ? '0 0 16px rgba(255,65,153,0.5)' : 'none',
            opacity: isHelpFocused ? 1 : 0.85,
            transition: 'background-color 0.2s, box-shadow 0.2s, opacity 0.2s',
            cursor: 'pointer',
          }}
          data-testid="button-help"
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', padding: '14px 8px' }}>
            <div style={{ width: '28px', height: '28px', marginBottom: '6px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <p
              style={{
                fontFamily: "'Ubuntu', Helvetica, sans-serif",
                fontSize: '16px',
                fontWeight: 500,
                color: '#ffffff',
                textAlign: 'center',
                lineHeight: '1.2',
                width: '104px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                margin: 0,
                padding: 0
              }}
            >
              {t('nav_help') || 'Help'}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

import { useLocation } from "wouter";
import { useLocalization } from "@/contexts/LocalizationContext";
import { usePageKeyHandler } from "@/contexts/FocusRouterContext";
import { assetPath } from "@/lib/assetPath";

export const Guide4 = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const { t } = useLocalization();

  // Register with FocusRouter (LGTV pattern)
  usePageKeyHandler('/guide-4', (e) => {
    const key = (window as any).tvKey;
    
    // OK/Enter key (13) on Samsung TV
    if (e.keyCode === 13 || e.keyCode === key?.ENTER) {
      e.preventDefault();
      
      try {
        localStorage.setItem('onboardingCompleted', 'true');
      } catch (error) {
        // Could not save to localStorage
      }
      
      setLocation('/discover-no-user');
    }
  });

  const handleClick = () => {
    try {
      localStorage.setItem('onboardingCompleted', 'true');
    } catch (error) {
      // Could not save to localStorage
    }
    
    setLocation('/discover-no-user');
  };

  return (
      <div 
        className="absolute inset-0 w-[1920px] h-[1080px] overflow-hidden cursor-pointer" 
        data-testid="page-guide-4"
        onClick={handleClick}
      >
        {/* Background Image with Dark Overlay */}
        <div 
          className="absolute h-[1080px] left-0 top-0 w-[1920px]"
          style={{
            background: `linear-gradient(0deg, rgba(0, 0, 0, 0.20) 0%, rgba(0, 0, 0, 0.20) 100%), url(${assetPath("images/discover-background.png")}) center top / cover no-repeat`,
            opacity: 0.70
          }}
        />

        {/* Arrow pointing to Favorites button */}
        <div className="absolute flex items-center justify-center left-[188px] top-[596px] z-20">
          <div className="rotate-[1.292deg]">
            <div className="h-[31.65px] relative w-[130.979px]">
              <img 
                alt="" 
                className="block max-w-none w-full h-full" 
                src={assetPath("images/arrow.svg")}
              />
            </div>
          </div>
        </div>

        {/* Tooltip Box */}
        <div className="absolute bg-black h-[115px] left-[340px] overflow-clip rounded-[10px] top-[555px] w-[597px] z-20">
          <div className="absolute font-['Ubuntu',Helvetica] font-medium leading-normal left-[67px] not-italic text-[24px] text-white top-[29px] whitespace-nowrap">
            <p className="mb-0">{t('guide_favorites_description') || 'Your favorite radios will be here.'}</p>
            <p>{t('guide_favorites_yellow_button') || 'Press yellow on the remote.'}</p>
          </div>
          <div className="absolute bg-[#f4ec2d] left-[24px] rounded-[40px] w-[18.667px] h-[18.667px] top-[48px]" />
        </div>

        {/* Highlighted Favorites Button */}
        <div className="absolute bg-[rgba(255,255,255,0.2)] left-[62px] overflow-clip rounded-[10px] w-[98px] h-[98px] top-[565px] z-20" data-testid="button-favorites-highlighted">
          <div className="absolute h-[61px] left-[11px] top-[19px] w-[77px]">
            <p className="absolute font-['Ubuntu',Helvetica] font-medium leading-normal left-[38.5px] not-italic text-[18px] text-center text-white top-[40px] translate-x-[-50%]">
              {t('guide_favorites_title') || t('nav_your_favorites') || 'Favorites'}
            </p>
            <div className="absolute left-[23px] w-[32px] h-[32px] top-0">
              <img 
                alt="" 
                className="block max-w-none w-full h-full" 
                src={assetPath("images/heart-icon.svg")}
              />
            </div>
          </div>
        </div>
      </div>
  );
};

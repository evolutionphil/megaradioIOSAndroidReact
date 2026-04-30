import { assetPath } from '@/lib/assetPath';

interface CountryTriggerProps {
  selectedCountry: string;
  selectedCountryCode: string;
  onClick: () => void;
  focusClasses?: string;
  className?: string;
}

export const CountryTrigger = ({ 
  selectedCountry, 
  selectedCountryCode, 
  onClick,
  focusClasses = '',
  className = ''
}: CountryTriggerProps) => {
  const isGlobal = selectedCountryCode === 'GLOBAL';
  const globeIcon = assetPath('images/globe-icon.svg');
  
  return (
    <div 
      className={`flex w-[223px] h-[51px] rounded-[30px] bg-[#6b4f8a] pointer-events-auto cursor-pointer hover:bg-[#7d5fa0] transition-colors flex-shrink-0 ${focusClasses} ${className}`}
      style={{ padding: '11px 14.316px 11px 15px', justifyContent: 'center', alignItems: 'center' }}
      onClick={onClick}
      data-testid="button-country-selector"
    >
      <div className="flex items-center gap-[10.66px] w-full">
        <div className="w-[28.421px] h-[28.421px] rounded-full overflow-hidden flex-shrink-0">
          <img 
            src={isGlobal ? globeIcon : `https://flagcdn.com/w40/${selectedCountryCode.toLowerCase()}.png`}
            alt={selectedCountry}
            className="w-full h-full object-cover"
          />
        </div>
        <p className="font-['Ubuntu',Helvetica] font-bold leading-normal text-[24px] text-white truncate flex-1 min-w-0">
          {selectedCountry}
        </p>
        <div className="flex items-center justify-center flex-shrink-0">
          <div className="rotate-[270deg]">
            <div className="relative w-[23.684px] h-[23.684px]">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

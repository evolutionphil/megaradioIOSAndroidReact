import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTVNavigation } from "@/hooks/useTVNavigation";
import { assetPath } from "@/lib/assetPath";

export const Splash = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const [isReady, setIsReady] = useState(false);
  
  useTVNavigation();

  useEffect(() => {
    var loader = document.getElementById('app-loader');
    if (loader) {
      loader.style.display = 'none';
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsReady(true);
      });
    });
  }, []);

  useEffect(() => {
    if (!isReady) return;

    try {
      const onboardingCompleted = localStorage.getItem('onboardingCompleted');
      if (onboardingCompleted) {
        setLocation("/discover-no-user");
        return;
      }
    } catch (error) {
    }
    
    const timer = setTimeout(() => {
      setLocation("/guide-1");
    }, 1500);
    return () => clearTimeout(timer);
  }, [isReady, setLocation]);

  return (
    <div className="bg-[#0e0e0e] absolute inset-0 w-[1920px] h-[1080px] overflow-hidden" data-testid="page-splash">
      {/* Animated Waves - Center Background */}
      <div 
        className="absolute inset-[34.91%_41.51%] animate-pulse"
        style={{ 
          animationDuration: '3s',
          animationTimingFunction: 'ease-in-out'
        }}
      >
        <img 
          alt="" 
          className="block max-w-none w-full h-full opacity-40" 
          src={assetPath("images/waves.svg")}
        />
      </div>

      {/* Logo */}
      <div className="absolute h-[111.999px] left-[798px] top-[484px] w-[323.069px]">
        <p className="absolute bottom-0 font-['Ubuntu',Helvetica] font-normal leading-normal left-[18.67%] not-italic right-0 text-[53.108px] text-white top-[46.16%] whitespace-pre-wrap">
          <span className="font-['Ubuntu',Helvetica] font-bold">mega</span>radio
        </p>
        <div className="absolute bottom-[2.84%] left-0 right-[65.2%] top-0">
          <img 
            alt="" 
            className="block max-w-none w-full h-full" 
            src={assetPath("images/path-8.svg")}
          />
        </div>
      </div>

      {/* Pink Glow Circle - Left Side */}
      <div 
        className="absolute left-[-377px] w-[781.011px] h-[781.011px] top-[510.99px] animate-pulse"
        style={{ 
          animationDuration: '4s',
          animationTimingFunction: 'ease-in-out'
        }}
      >
        <div className="absolute inset-[-82.95%]">
          <img 
            alt="" 
            className="block max-w-none w-full h-full opacity-30" 
            src={assetPath("images/ellipse2.svg")}
          />
        </div>
      </div>

      {/* "Listen freely" text */}
      <p className="absolute font-['Ubuntu',Helvetica] font-medium leading-normal left-[901px] not-italic text-[#9b9b9b] text-[20px] top-[624px]">
        Listen freely
      </p>

      {/* megaradio.live text */}
      <p className="absolute font-['Ubuntu',Helvetica] font-medium leading-normal left-[960px] not-italic text-[22px] text-center text-white top-[984px] translate-x-[-50%]">
        megaradio.live
      </p>

      {/* Device Icons Group (Monitor, Tablet, Phone) */}
      <div className="absolute h-[45.683px] left-[916px] top-[911px] w-[88px]">
        {/* Monitor Icon */}
        <div className="absolute bottom-0 left-0 right-[29.66%] top-0">
          <img 
            alt="" 
            className="block max-w-none w-full h-full" 
            src={assetPath("images/monitor.svg")}
          />
        </div>
        
        {/* Tablet Icon */}
        <div className="absolute inset-[24.7%_9.75%_0.21%_61.02%]">
          <div className="absolute inset-[-8.7%_-11.59%]">
            <img 
              alt="" 
              className="block max-w-none w-full h-full" 
              src={assetPath("images/tablet.svg")}
            />
          </div>
        </div>
        
        {/* Phone Icon */}
        <div className="absolute bottom-[0.21%] left-[83.76%] right-0 top-[49.73%]">
          <img 
            alt="" 
            className="block max-w-none w-full h-full" 
            src={assetPath("images/phone.svg")}
          />
        </div>
      </div>

      {/* Dotted Pattern - Bottom Left */}
      <div 
        className="absolute h-[614px] left-[-16px] top-[466px] w-[667px] animate-[fadeInFloat_3s_ease-in-out_infinite]"
      >
        <img 
          alt="" 
          className="absolute inset-0 max-w-none object-center object-cover pointer-events-none w-full h-full opacity-20" 
          src={assetPath("images/frame445.png")}
        />
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes fadeInFloat {
          0% {
            opacity: 0.15;
            transform: translateY(0px) scale(1);
          }
          50% {
            opacity: 0.25;
            transform: translateY(-10px) scale(1.02);
          }
          100% {
            opacity: 0.15;
            transform: translateY(0px) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

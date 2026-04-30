import { createContext, useContext, useEffect, ReactNode } from "react";

interface AppLifecycleContextType {
  // Context can be extended later if needed
}

const AppLifecycleContext = createContext<AppLifecycleContextType | undefined>(undefined);

export function AppLifecycleProvider({ children }: { children: ReactNode }) {
  
  // Handle app visibility changes - Samsung TV certification requirement
  useEffect(() => {
    const hasTizen = typeof (window as any).tizen !== 'undefined';
    
    let visibilityTimeout: NodeJS.Timeout | null = null;
    
    // Handle visibility change (Samsung TV only - browser has issues with SPA navigation)
    const handleVisibilityChange = () => {
      // IMPORTANT: Only use visibility change on actual Samsung TV
      // In browser/emulator, hash changes cause false visibility changes
      const isWebOS = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('webos');
      if (!hasTizen && !isWebOS) {
        return;
      }
      
      const isHidden = document.hidden;
      
      // Clear any pending timeout
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
        visibilityTimeout = null;
      }
      
      if (isHidden) {
        // On real Samsung TV, pause immediately (no delay needed)
        if ((window as any).globalPlayer?.pause) {
          (window as any).globalPlayer.pause();
        }
      }
    };
    
    // Samsung Tizen app lifecycle events (certification requirement)
    if (hasTizen) {
      const listenerIds: number[] = [];
      
      try {
        // Method 1: webapis.appcommon events (preferred for Samsung TVs)
        if ((window as any).webapis?.appcommon?.addAppEventListener) {
          const handleAppSuspend = () => {
            if ((window as any).globalPlayer?.pause) {
              (window as any).globalPlayer.pause();
            }
          };
          
          const handleAppResume = () => {
            // Don't auto-resume - let user manually resume playback
          };
          
          const handleAppHide = () => {
            if ((window as any).globalPlayer?.pause) {
              (window as any).globalPlayer.pause();
            }
          };
          
          const handleAppShow = () => {
          };
          
          // Register Samsung lifecycle listeners using correct API (CamelCase event names)
          listenerIds.push((window as any).webapis.appcommon.addAppEventListener('AppSuspend', handleAppSuspend));
          listenerIds.push((window as any).webapis.appcommon.addAppEventListener('AppResume', handleAppResume));
          listenerIds.push((window as any).webapis.appcommon.addAppEventListener('AppHide', handleAppHide));
          listenerIds.push((window as any).webapis.appcommon.addAppEventListener('AppShow', handleAppShow));
          
          // Store cleanup function
          (window as any).__appLifecycleCleanup = () => {
            listenerIds.forEach(id => {
              try {
                (window as any).webapis.appcommon.removeAppEventListener(id);
              } catch (err) {
                // Failed to remove listener
              }
            });
          };
        }
        
        // Method 2: Tizen application events (fallback)
        if ((window as any).tizen?.application?.getCurrentApplication) {
          const app = (window as any).tizen.application.getCurrentApplication();
          
          if (app.addEventListener) {
            // Low memory handler
            app.addEventListener('lowmemory', () => {
              if ((window as any).globalPlayer?.pause) {
                (window as any).globalPlayer.pause();
              }
            });
          }
        }
      } catch (err) {
        // Failed to register Samsung lifecycle events
      }
    }
    
    // Add visibility change listener (all platforms)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup
    return () => {
      // Clear visibility timeout if pending
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Samsung-specific cleanup
      if ((window as any).__appLifecycleCleanup) {
        (window as any).__appLifecycleCleanup();
        delete (window as any).__appLifecycleCleanup;
      }
    };
  }, []);
  
  return (
    <AppLifecycleContext.Provider value={{}}>
      {children}
    </AppLifecycleContext.Provider>
  );
}

export function useAppLifecycle() {
  const context = useContext(AppLifecycleContext);
  if (!context) {
    throw new Error("useAppLifecycle must be used within AppLifecycleProvider");
  }
  return context;
}

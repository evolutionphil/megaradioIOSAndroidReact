import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface NetworkStatusContextType {
  isConnected: boolean;
  isNetworkModalOpen: boolean;
  closeNetworkModal: () => void;
}

const NetworkStatusContext = createContext<NetworkStatusContextType | undefined>(undefined);

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(true);
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);

  useEffect(() => {
    let networkListenerId: number | null = null;
    
    // Check if Samsung TV webapis is available
    if (typeof window !== 'undefined' && (window as any).webapis?.network) {
      // Add network state change listener
      try {
        const networkCallback = (value: number) => {
          const NetworkState = (window as any).webapis.network.NetworkState;
          
          if (value === NetworkState.GATEWAY_DISCONNECTED) {
            setIsConnected(false);
            setIsNetworkModalOpen(true);
            
            // Pause audio playback (Samsung requirement)
            if ((window as any).globalPlayer?.pause) {
              (window as any).globalPlayer.pause();
            }
          } else if (value === NetworkState.GATEWAY_CONNECTED) {
            setIsConnected(true);
            setIsNetworkModalOpen(false);
            if ((window as any).globalPlayer?.resume) {
              (window as any).globalPlayer.resume();
            }
          }
        };
        
        networkListenerId = (window as any).webapis.network.addNetworkStateChangeListener(networkCallback);
        
        // Check initial network status
        const isCurrentlyConnected = (window as any).webapis.network.isConnectedToGateway();
        
        if (!isCurrentlyConnected) {
          setIsConnected(false);
          setIsNetworkModalOpen(true);
        }
      } catch (error) {
        // Failed to setup network listener
      }
      
      // Cleanup for Samsung TV
      return () => {
        if (networkListenerId !== null && (window as any).webapis?.network?.removeNetworkStateChangeListener) {
          try {
            (window as any).webapis.network.removeNetworkStateChangeListener(networkListenerId);
          } catch (error) {
            // Failed to remove network listener
          }
        }
      };
    } else {
      // Fallback for non-Samsung platforms (web, LG webOS)
      const handleOnline = () => {
        setIsConnected(true);
        setIsNetworkModalOpen(false);
        if ((window as any).globalPlayer?.resume) {
          (window as any).globalPlayer.resume();
        }
      };
      
      const handleOffline = () => {
        setIsConnected(false);
        setIsNetworkModalOpen(true);
        
        // Pause audio playback (Samsung requirement)
        if ((window as any).globalPlayer?.pause) {
          (window as any).globalPlayer.pause();
        }
      };
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      // Check initial status
      if (!navigator.onLine) {
        setIsConnected(false);
        setIsNetworkModalOpen(true);
      }
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const closeNetworkModal = () => {
    setIsNetworkModalOpen(false);
  };

  return (
    <NetworkStatusContext.Provider value={{ isConnected, isNetworkModalOpen, closeNetworkModal }}>
      {children}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatus() {
  const context = useContext(NetworkStatusContext);
  if (context === undefined) {
    throw new Error('useNetworkStatus must be used within a NetworkStatusProvider');
  }
  return context;
}

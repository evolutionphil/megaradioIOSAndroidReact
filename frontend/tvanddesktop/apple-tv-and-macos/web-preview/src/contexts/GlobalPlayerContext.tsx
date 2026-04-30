import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { Station, megaRadioApi } from "@/services/megaRadioApi";
import { recentlyPlayedService } from "@/services/recentlyPlayedService";
import { recommendationService } from "@/services/recommendationService";
import { trackStationPlay, trackError } from "@/lib/analytics";
import { useAuth } from "@/contexts/AuthContext";

interface GlobalPlayerContextType {
  currentStation: Station | null;
  isPlaying: boolean;
  isBuffering: boolean;
  nowPlayingMetadata: string | null;
  streamError: string | null;
  playStation: (station: Station) => void;
  pauseStation: () => void;
  resumeStation: () => void;
  stopStation: () => void;
  togglePlayPause: () => void;
  clearStreamError: () => void;
  retryCurrentStation: () => void;
}

const GlobalPlayerContext = createContext<GlobalPlayerContextType | undefined>(undefined);

const isTizen = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('tizen');
const isWebOS = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('webos');
const isTV = isTizen || isWebOS;

function getProxiedUrl(url: string): string {
  if (!url) return url;
  const isHttpStream = url.startsWith('http://');
  const isPageHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

  if (isHttpStream && isPageHttps && !isTV) {
    return `/api/stream-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

async function resolveStreamUrl(url: string): Promise<{ resolvedUrl: string; isPlaylist: boolean; isHLS: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/stream-resolve?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      return { resolvedUrl: url, isPlaylist: false, isHLS: false, error: `HTTP ${response.status}` };
    }
    const data = await response.json();
    return {
      resolvedUrl: data.resolvedUrl || url,
      isPlaylist: data.isPlaylist || false,
      isHLS: data.isHLS || false,
      error: data.error || undefined,
    };
  } catch (err: any) {
    console.warn('[RESOLVE] Failed to resolve URL, using original:', err.message);
    return { resolvedUrl: url, isPlaylist: false, isHLS: false, error: err.message };
  }
}

export function GlobalPlayerProvider({ children }: { children: ReactNode }) {
  var { isAuthenticated, token } = useAuth();
  const [currentStation, setCurrentStation] = useState<Station | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [nowPlayingMetadata, setNowPlayingMetadata] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const audioPlayerRef = useRef<any>(null);
  const metadataIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const screenLockActiveRef = useRef(false);
  
  // Error recovery state
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentStationRef = useRef<Station | null>(null);

  // Initialize TV audio player once
  useEffect(() => {
    let playerInstance: any = null;
    
    if (typeof (window as any).TVAudioPlayer !== 'undefined' && !audioPlayerRef.current) {
      playerInstance = new (window as any).TVAudioPlayer('global-audio-container');
      audioPlayerRef.current = playerInstance;
      
      playerInstance.onPlay = () => {
        console.log('[✅ EVENT] onPlay - Stream playing successfully');
        setIsPlaying(true);
        setIsBuffering(false);
        setStreamError(null);
        retryCountRef.current = 0;
      };
      
      playerInstance.onPause = () => {
        console.log('[⏸️ EVENT] onPause');
        setIsPlaying(false);
      };
      
      playerInstance.onStop = () => {
        console.log('[⏹️ EVENT] onStop');
        setIsPlaying(false);
      };
      
      playerInstance.onBuffering = () => {
        console.log('[⏳ EVENT] onBuffering - Loading stream data...');
        setIsBuffering(true);
      };
      
      playerInstance.onReady = () => {
        console.log('[✅ EVENT] onReady - Stream ready');
        setIsBuffering(false);
      };
      
      playerInstance.onError = (error: any) => {
        const stationName = currentStationRef.current?.name || 'Unknown';
        const stationUrl = currentStationRef.current?.url_resolved || currentStationRef.current?.url || 'no-url';
        const errorMsg = error?.message || error?.type || (typeof error === 'string' ? error : JSON.stringify(error));
        const errorCode = error?.code || error?.target?.error?.code || 'N/A';
        
        console.error('[🔴 ERROR] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('[🔴 ERROR] Station:', stationName);
        console.error('[🔴 ERROR] URL:', stationUrl.substring(0, 120));
        console.error('[🔴 ERROR] Error:', errorMsg);
        console.error('[🔴 ERROR] Error code:', errorCode);
        console.error('[🔴 ERROR] Retry count:', retryCountRef.current, '/', maxRetries);
        console.error('[🔴 ERROR] Full error object:', error);
        
        setIsBuffering(false);
        trackError(`Audio playback error: ${errorMsg}`, 'GlobalPlayer');
        
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
        
        const currentStationToRetry = currentStationRef.current;
        if (currentStationToRetry && retryCountRef.current < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
          console.log(`[🔄 RETRY] Will retry in ${delay}ms (attempt ${retryCountRef.current + 1}/${maxRetries})`);
          
          retryTimeoutRef.current = setTimeout(async () => {
            retryCountRef.current++;
            
            if (audioPlayerRef.current && currentStationToRetry) {
              let rawUrl: string;
              
              if (retryCountRef.current === 2 && currentStationToRetry.url_resolved && currentStationToRetry.url !== currentStationToRetry.url_resolved) {
                rawUrl = currentStationToRetry.url;
                console.log(`[🔄 RETRY] Trying original url instead of url_resolved`);
              } else {
                rawUrl = currentStationToRetry.url_resolved || currentStationToRetry.url;
              }

              if (retryCountRef.current >= 2 && !isTV) {
                const proxyUrl = `/api/stream-proxy?url=${encodeURIComponent(rawUrl)}`;
                console.log(`[🔄 RETRY] Force-proxying on retry ${retryCountRef.current}`);
                audioPlayerRef.current.play(proxyUrl);
              } else {
                const playUrl = getProxiedUrl(rawUrl);
                audioPlayerRef.current.play(playUrl);
              }
              console.log(`[🔄 RETRY] Retrying: ${currentStationToRetry.name}`);
            }
          }, delay);
        } else if (retryCountRef.current >= maxRetries) {
          console.error('[🔴 FAILED] Max retries reached. Giving up on:', stationName);
          setStreamError('This station is currently unavailable');
          setIsPlaying(false);
          retryCountRef.current = 0;
        }
      };

      playerInstance.onMetadata = (metadata: string) => {
        setNowPlayingMetadata(metadata);
      };
    }

    return () => {
      // Clear retry timeout on unmount
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      // Clear event handlers to prevent memory leaks
      if (playerInstance) {
        playerInstance.onPlay = null;
        playerInstance.onPause = null;
        playerInstance.onStop = null;
        playerInstance.onBuffering = null;
        playerInstance.onReady = null;
        playerInstance.onError = null;
        playerInstance.onMetadata = null;
        
        if (typeof playerInstance.stop === 'function') {
          try {
            playerInstance.stop();
          } catch (err) {
            // Silently ignore cleanup errors
          }
        }
      }
      
      audioPlayerRef.current = null;
    };
  }, []);

  // Fetch metadata for current station
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!currentStation?._id || !isPlaying) return;

      try {
        const result = await megaRadioApi.getStationMetadata(currentStation._id);
        if (result?.metadata?.title) {
          setNowPlayingMetadata(result.metadata.title);
        }
      } catch (error) {
        // Metadata fetch failed (non-critical)
      }
    };

    // Clear previous interval
    if (metadataIntervalRef.current) {
      clearInterval(metadataIntervalRef.current);
    }

    // Fetch immediately and then every 30 seconds
    if (currentStation && isPlaying) {
      fetchMetadata();
      metadataIntervalRef.current = setInterval(fetchMetadata, 30000);
    } else {
      setNowPlayingMetadata(null);
    }

    // Cleanup on unmount or station change
    return () => {
      if (metadataIntervalRef.current) {
        clearInterval(metadataIntervalRef.current);
      }
    };
  }, [currentStation, isPlaying]);

  // Screensaver prevention - Samsung TV certification requirement
  useEffect(() => {
    const hasTizen = typeof (window as any).tizen !== 'undefined';
    let wakeLock: any = null;
    let releaseHandler: (() => void) | null = null;
    
    if (!hasTizen) {
      // Use Web Wake Lock API for non-Samsung platforms (if supported)
      if ('wakeLock' in navigator && isPlaying) {
        const requestWakeLock = async () => {
          try {
            wakeLock = await (navigator as any).wakeLock.request('screen');
            
            releaseHandler = () => {
            };
            wakeLock.addEventListener('release', releaseHandler);
          } catch (err) {
          }
        };
        
        requestWakeLock();
        
        return () => {
          if (wakeLock) {
            if (releaseHandler) {
              wakeLock.removeEventListener('release', releaseHandler);
            }
            wakeLock.release().catch(() => {});
            wakeLock = null;
          }
        };
      }
      return;
    }
    
    // Samsung Tizen implementation
    if (isPlaying && !screenLockActiveRef.current) {
      try {
        (window as any).tizen.power.request('SCREEN', 'SCREEN_NORMAL');
        screenLockActiveRef.current = true;
      } catch (err) {
        trackError('Failed to request screen lock', 'screensaverPrevention');
      }
    } else if (!isPlaying && screenLockActiveRef.current) {
      try {
        (window as any).tizen.power.release('SCREEN');
        screenLockActiveRef.current = false;
      } catch (err) {
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (screenLockActiveRef.current && hasTizen) {
        try {
          (window as any).tizen.power.release('SCREEN');
          screenLockActiveRef.current = false;
        } catch (err) {
        }
      }
    };
  }, [isPlaying]);

  const playStation = (station: Station) => {
    if (!audioPlayerRef.current) {
      console.error('[🔴 PLAY] Audio player not initialized');
      trackError('Audio player not initialized', 'playStation');
      return;
    }

    const rawUrl = station.url_resolved || station.url;
    
    console.log('[🎵 PLAY] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[🎵 PLAY] Station:', station.name);
    console.log('[🎵 PLAY] ID:', station._id);
    console.log('[🎵 PLAY] Raw URL:', rawUrl);
    console.log('[🎵 PLAY] URL type:', rawUrl?.startsWith('https') ? 'HTTPS' : rawUrl?.startsWith('http') ? 'HTTP' : 'OTHER');
    console.log('[🎵 PLAY] Codec:', station.codec || 'unknown');
    console.log('[🎵 PLAY] Bitrate:', station.bitrate || 'unknown');
    
    try {
      if (audioPlayerRef.current && typeof audioPlayerRef.current.stop === 'function') {
        audioPlayerRef.current.stop();
      }
    } catch (err) {
      // ignore cleanup errors
    }
    
    setCurrentStation(station);
    currentStationRef.current = station;
    setIsBuffering(true);
    setStreamError(null);
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    retryCountRef.current = 0;

    const startPlayback = (finalUrl: string) => {
      const playUrl = getProxiedUrl(finalUrl);
      console.log('[🎵 PLAY] Final play URL:', playUrl.substring(0, 120));
      
      setTimeout(() => {
        if (audioPlayerRef.current && currentStationRef.current?._id === station._id) {
          audioPlayerRef.current.play(playUrl);
        }
      }, 50);
    };

    const urlLower = rawUrl.toLowerCase();
    const needsResolve = urlLower.endsWith('.m3u') || urlLower.endsWith('.pls') || 
      urlLower.includes('.m3u?') || urlLower.includes('.pls?');

    if (needsResolve && !isTV) {
      console.log('[🎵 PLAY] URL looks like a playlist, resolving first...');
      resolveStreamUrl(rawUrl).then(result => {
        if (currentStationRef.current?._id !== station._id) {
          setIsBuffering(false);
          return;
        }
        if (result.error) {
          console.warn('[🎵 PLAY] Resolve had error:', result.error, '- using resolved anyway');
        }
        console.log('[🎵 PLAY] Resolved:', rawUrl.substring(0, 60), '→', result.resolvedUrl.substring(0, 60));
        startPlayback(result.resolvedUrl);
      }).catch(() => {
        if (currentStationRef.current?._id === station._id) {
          startPlayback(rawUrl);
        } else {
          setIsBuffering(false);
        }
      });
    } else {
      startPlayback(rawUrl);
    }

    trackStationPlay(station.name, station.country || '', station.tags?.[0] || '');

    try {
      localStorage.setItem("lastPlayedStation", JSON.stringify(station));
    } catch (err) {
      trackError('Failed to save station to localStorage', 'playStation');
    }

    recentlyPlayedService.addStation(station, token);
    recommendationService.trackListen(station);
  };

  const pauseStation = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
  };

  const resumeStation = () => {
    if (audioPlayerRef.current && currentStation) {
      // Use resume() function instead of play() to continue from pause
      if (typeof audioPlayerRef.current.resume === 'function') {
        audioPlayerRef.current.resume();
      } else {
        const rawUrl = currentStation.url_resolved || currentStation.url;
        const playUrl = getProxiedUrl(rawUrl);
        audioPlayerRef.current.play(playUrl);
      }
    }
  };

  const stopStation = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stop();
      setCurrentStation(null);
      setIsPlaying(false);
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseStation();
    } else {
      resumeStation();
    }
  };

  const retryCurrentStation = () => {
    if (currentStation) {
      setStreamError(null);
      retryCountRef.current = 0;
      playStation(currentStation);
    }
  };

  const clearStreamError = () => {
    setStreamError(null);
  };

  useEffect(function() {
    if (isAuthenticated && token) {
      recentlyPlayedService.syncFromApi(token);
    }
  }, [isAuthenticated, token]);

  // Expose player controls to window for TV remote media buttons
  useEffect(() => {
    (window as any).globalPlayer = {
      togglePlayPause,
      pause: pauseStation,
      resume: resumeStation,
      stop: stopStation,
      isPlaying,
      currentStation,
    };
    
    // Cleanup: remove globalPlayer from window on unmount
    return () => {
      if ((window as any).globalPlayer) {
        delete (window as any).globalPlayer;
      }
    };
  }, [isPlaying, currentStation]);

  return (
    <GlobalPlayerContext.Provider
      value={{
        currentStation,
        isPlaying,
        isBuffering,
        nowPlayingMetadata,
        streamError,
        playStation,
        pauseStation,
        resumeStation,
        stopStation,
        togglePlayPause,
        clearStreamError,
        retryCurrentStation,
      }}
    >
      {/* Hidden audio container */}
      <div id="global-audio-container" style={{ display: 'none' }} />
      {children}
    </GlobalPlayerContext.Provider>
  );
}

export function useGlobalPlayer() {
  const context = useContext(GlobalPlayerContext);
  if (!context) {
    throw new Error("useGlobalPlayer must be used within a GlobalPlayerProvider");
  }
  return context;
}

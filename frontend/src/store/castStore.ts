// Cast Store - State management for TV casting
import { create } from 'zustand';
import { castService } from '../services/castService';

interface CastState {
  // Session state
  isConnected: boolean;
  isPaired: boolean;
  isCasting: boolean;
  sessionId: string | null;
  pairingCode: string | null;
  
  // TV info
  tvDeviceId: string | null;
  tvDeviceName: string | null;
  
  // Cast playback state
  castStation: {
    stationId: string;
    name: string;
    favicon: string;
  } | null;
  castIsPlaying: boolean;
  castNowPlaying: {
    title: string;
    artist: string;
  } | null;
  
  // UI state
  showCastModal: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setShowCastModal: (show: boolean) => void;
  startCastSession: (token: string) => Promise<void>;
  endCastSession: () => Promise<void>;
  castToTV: (stationId: string) => Promise<void>;
  pauseOnTV: () => Promise<void>;
  resumeOnTV: () => Promise<void>;
  stopOnTV: () => Promise<void>;
  setVolumeOnTV: (volume: number) => Promise<void>;
  reset: () => void;
}

export const useCastStore = create<CastState>((set, get) => ({
  // Initial state
  isConnected: false,
  isPaired: false,
  isCasting: false,
  sessionId: null,
  pairingCode: null,
  tvDeviceId: null,
  tvDeviceName: null,
  castStation: null,
  castIsPlaying: false,
  castNowPlaying: null,
  showCastModal: false,
  isLoading: false,
  error: null,

  setShowCastModal: (show) => set({ showCastModal: show }),

  startCastSession: async (token: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Set token in service
      castService.setToken(token);
      
      // Create session
      const session = await castService.createSession();
      
      set({
        sessionId: session.sessionId,
        pairingCode: session.pairingCode,
        isLoading: false,
      });

      // Setup event listeners
      castService.onPaired((data) => {
        console.log('[CastStore] TV Paired!', data);
        set({
          isPaired: true,
          tvDeviceId: data.tvDeviceId,
          isConnected: true,
        });
      });

      castService.onPeerConnected((data) => {
        console.log('[CastStore] Peer connected:', data.peerRole);
        if (data.peerRole === 'tv') {
          set({ isConnected: true });
        }
      });

      castService.onPeerDisconnected((data) => {
        console.log('[CastStore] Peer disconnected:', data.peerRole);
        if (data.peerRole === 'tv') {
          set({ isConnected: false, isCasting: false });
        }
      });

      castService.onNowPlaying((data) => {
        set({
          castNowPlaying: {
            title: data.title,
            artist: data.artist,
          },
          castIsPlaying: data.isPlaying,
        });
      });

      castService.onSessionEnded(() => {
        console.log('[CastStore] Session ended');
        get().reset();
      });

      castService.onError((error) => {
        console.log('[CastStore] Error:', error);
        // Only set error if not already in error state to prevent loops
        const currentState = get();
        if (!currentState.error) {
          set({ error, isLoading: false });
        }
      });

      // Connect WebSocket
      castService.connectWebSocket(session.sessionId);
      
    } catch (error: any) {
      console.error('[CastStore] Failed to start session:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to start cast session',
      });
    }
  },

  endCastSession: async () => {
    const { sessionId } = get();
    
    if (sessionId) {
      try {
        await castService.terminateSession(sessionId);
      } catch (e) {
        console.log('[CastStore] Error terminating session:', e);
      }
    }
    
    castService.disconnect();
    get().reset();
  },

  castToTV: async (stationId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      await castService.sendCommand('play', { stationId });
      set({
        isCasting: true,
        castIsPlaying: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to cast',
      });
    }
  },

  pauseOnTV: async () => {
    try {
      await castService.sendCommand('pause');
      set({ castIsPlaying: false });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  resumeOnTV: async () => {
    try {
      await castService.sendCommand('resume');
      set({ castIsPlaying: true });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  stopOnTV: async () => {
    try {
      await castService.sendCommand('stop');
      set({ isCasting: false, castIsPlaying: false, castStation: null });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  setVolumeOnTV: async (volume: number) => {
    try {
      await castService.sendCommand('set_volume', { volume });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  reset: () => {
    set({
      isConnected: false,
      isPaired: false,
      isCasting: false,
      sessionId: null,
      pairingCode: null,
      tvDeviceId: null,
      tvDeviceName: null,
      castStation: null,
      castIsPlaying: false,
      castNowPlaying: null,
      showCastModal: false,
      isLoading: false,
      error: null,
    });
  },
}));

export default useCastStore;

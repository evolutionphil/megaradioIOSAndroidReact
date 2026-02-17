// Cast Service - TV Cast API Integration
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://themegaradio.com';
const CAST_TOKEN_KEY = '@megaradio_cast_token';

interface CastSession {
  sessionId: string;
  pairingCode: string;
  wsUrl: string;
  expiresIn: string;
}

interface SessionStatus {
  sessionId: string;
  status: 'waiting_for_pair' | 'paired' | 'active' | 'ended';
  isPlaying: boolean;
  currentStation?: {
    stationId: string;
    name: string;
    slug: string;
    favicon: string;
  };
  mobileConnected: boolean;
  tvConnected: boolean;
  createdAt: string;
  pairedAt?: string;
  expiresAt: string;
}

interface CastDevice {
  deviceId: string;
  deviceName: string;
  platform: 'tizen' | 'webos';
  lastConnected?: string;
}

class CastService {
  private token: string | null = null;
  private ws: WebSocket | null = null;
  private currentSessionId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  // Event callbacks
  private onPairedCallback: ((data: any) => void) | null = null;
  private onPlayCallback: ((data: any) => void) | null = null;
  private onPauseCallback: (() => void) | null = null;
  private onStopCallback: (() => void) | null = null;
  private onNowPlayingCallback: ((data: any) => void) | null = null;
  private onPeerConnectedCallback: ((data: any) => void) | null = null;
  private onPeerDisconnectedCallback: ((data: any) => void) | null = null;
  private onSessionEndedCallback: (() => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;

  // Set auth token
  setToken(token: string) {
    this.token = token;
    console.log('[CastService] Token set');
  }

  // Get headers with auth
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // Create a new cast session
  async createSession(mobileDeviceId?: string): Promise<CastSession> {
    console.log('[CastService] Creating cast session...');
    
    const response = await fetch(`${BASE_URL}/api/cast/session/create`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ mobileDeviceId }),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to create session');
    }

    this.currentSessionId = data.sessionId;
    console.log('[CastService] Session created:', data.sessionId, 'Code:', data.pairingCode);
    
    return data;
  }

  // Get session status
  async getSessionStatus(sessionId: string): Promise<SessionStatus> {
    const response = await fetch(`${BASE_URL}/api/cast/session/${sessionId}/status`, {
      headers: this.getHeaders(),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get session status');
    }

    return data;
  }

  // List user's active sessions
  async listSessions(): Promise<{ sessions: SessionStatus[] }> {
    const response = await fetch(`${BASE_URL}/api/cast/sessions`, {
      headers: this.getHeaders(),
    });

    return response.json();
  }

  // Terminate a session
  async terminateSession(sessionId: string): Promise<void> {
    console.log('[CastService] Terminating session:', sessionId);
    
    await fetch(`${BASE_URL}/api/cast/session/${sessionId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (this.currentSessionId === sessionId) {
      this.disconnect();
    }
  }

  // Send command to TV
  async sendCommand(
    command: 'play' | 'pause' | 'resume' | 'stop' | 'change_station' | 'volume_up' | 'volume_down' | 'set_volume',
    data?: { stationId?: string; volume?: number }
  ): Promise<void> {
    if (!this.currentSessionId) {
      throw new Error('No active session');
    }

    console.log('[CastService] Sending command:', command, data);

    // Send via REST API
    const response = await fetch(`${BASE_URL}/api/cast/command`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        sessionId: this.currentSessionId,
        command,
        data,
      }),
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Command failed');
    }

    // Also send via WebSocket if connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'cast:command',
        command,
        data,
      }));
    }
  }

  // Direct cast to a previously paired device
  async directCast(deviceId: string, stationId?: string): Promise<CastSession> {
    console.log('[CastService] Direct cast to device:', deviceId);
    
    const response = await fetch(`${BASE_URL}/api/cast/direct`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ deviceId, stationId }),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Direct cast failed');
    }

    this.currentSessionId = data.sessionId;
    return data;
  }

  // Get user's registered devices
  async getDevices(): Promise<CastDevice[]> {
    const response = await fetch(`${BASE_URL}/api/user/devices`, {
      headers: this.getHeaders(),
    });

    const data = await response.json();
    return data.devices || [];
  }

  // Remove a device
  async removeDevice(deviceId: string): Promise<void> {
    await fetch(`${BASE_URL}/api/user/devices/${deviceId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
  }

  // Connect to WebSocket
  connectWebSocket(sessionId: string): void {
    if (this.ws) {
      this.ws.close();
    }

    this.currentSessionId = sessionId;
    const wsUrl = `wss://themegaradio.com/ws/cast?sessionId=${sessionId}&role=mobile&token=${this.token}`;
    
    console.log('[CastService] Connecting to WebSocket...');
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('[CastService] WebSocket connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (e) {
        console.error('[CastService] Failed to parse message:', e);
      }
    };

    this.ws.onclose = () => {
      console.log('[CastService] WebSocket closed');
      this.stopHeartbeat();
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('[CastService] WebSocket error:', error);
      this.onErrorCallback?.('Connection error');
    };
  }

  // Handle incoming WebSocket messages
  private handleMessage(message: any) {
    console.log('[CastService] Received:', message.type);

    switch (message.type) {
      case 'cast:connected':
        console.log('[CastService] Connected to session');
        break;
        
      case 'cast:paired':
        console.log('[CastService] TV paired!');
        this.onPairedCallback?.(message);
        break;
        
      case 'cast:peer_connected':
        console.log('[CastService] Peer connected:', message.peerRole);
        this.onPeerConnectedCallback?.(message);
        break;
        
      case 'cast:peer_disconnected':
        console.log('[CastService] Peer disconnected:', message.peerRole);
        this.onPeerDisconnectedCallback?.(message);
        break;
        
      case 'cast:play':
        this.onPlayCallback?.(message);
        break;
        
      case 'cast:pause':
        this.onPauseCallback?.();
        break;
        
      case 'cast:stop':
        this.onStopCallback?.();
        break;
        
      case 'cast:now_playing':
        this.onNowPlayingCallback?.(message);
        break;
        
      case 'cast:session_ended':
        console.log('[CastService] Session ended');
        this.onSessionEndedCallback?.();
        this.disconnect();
        break;
        
      case 'cast:heartbeat_ack':
        // Heartbeat acknowledged
        break;
        
      case 'error':
        console.error('[CastService] Error:', message.message);
        this.onErrorCallback?.(message.message);
        break;
    }
  }

  // Start heartbeat
  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'cast:heartbeat' }));
      }
    }, 30000); // Every 30 seconds
  }

  // Stop heartbeat
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Attempt reconnection - limited attempts
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[CastService] Max reconnect attempts reached, stopping');
      this.onErrorCallback?.('Bağlantı kurulamadı');
      this.currentSessionId = null;
      return;
    }

    this.reconnectAttempts++;
    console.log('[CastService] Reconnecting... attempt', this.reconnectAttempts);
    
    setTimeout(() => {
      if (this.currentSessionId && this.token) {
        this.connectWebSocket(this.currentSessionId);
      }
    }, 5000 * this.reconnectAttempts); // Exponential backoff
  }

  // Disconnect
  disconnect() {
    console.log('[CastService] Disconnecting...');
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.currentSessionId = null;
  }

  // Check if connected
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // Get current session ID
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  // Event listeners
  onPaired(callback: (data: any) => void) {
    this.onPairedCallback = callback;
  }

  onPlay(callback: (data: any) => void) {
    this.onPlayCallback = callback;
  }

  onPause(callback: () => void) {
    this.onPauseCallback = callback;
  }

  onStop(callback: () => void) {
    this.onStopCallback = callback;
  }

  onNowPlaying(callback: (data: any) => void) {
    this.onNowPlayingCallback = callback;
  }

  onPeerConnected(callback: (data: any) => void) {
    this.onPeerConnectedCallback = callback;
  }

  onPeerDisconnected(callback: (data: any) => void) {
    this.onPeerDisconnectedCallback = callback;
  }

  onSessionEnded(callback: () => void) {
    this.onSessionEndedCallback = callback;
  }

  onError(callback: (error: string) => void) {
    this.onErrorCallback = callback;
  }
}

// Export singleton instance
export const castService = new CastService();
export default castService;

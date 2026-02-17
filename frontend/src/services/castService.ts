// Cast Service - Simple polling-based TV Cast
// No pairing code needed - same account = automatic cast

const API_BASE = 'https://themegaradio.com';

export const castService = {
  // TV'ye istasyon gönder
  async castStation(token: string, station: any): Promise<boolean> {
    try {
      console.log('[CastService] Sending station to TV:', station.name);
      
      const response = await fetch(`${API_BASE}/api/cast/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'cast:play',
          station: {
            _id: station._id || station.id,
            name: station.name,
            url: station.url,
            url_resolved: station.url_resolved || station.urlResolved || station.url,
            favicon: station.favicon || station.logo,
            country: station.country,
            language: station.language,
            tags: Array.isArray(station.tags) ? station.tags.join(',') : station.tags,
          },
        }),
      });
      
      const data = await response.json();
      console.log('[CastService] Cast response:', data);
      
      return response.ok && data.success;
    } catch (error) {
      console.error('[CastService] Cast error:', error);
      return false;
    }
  },

  // TV'yi duraklat
  async sendPause(token: string): Promise<boolean> {
    try {
      console.log('[CastService] Sending pause command to TV');
      
      const response = await fetch(`${API_BASE}/api/cast/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'cast:pause' }),
      });
      
      return response.ok;
    } catch (error) {
      console.error('[CastService] Pause error:', error);
      return false;
    }
  },

  // TV'de devam ettir
  async sendResume(token: string): Promise<boolean> {
    try {
      console.log('[CastService] Sending resume command to TV');
      
      const response = await fetch(`${API_BASE}/api/cast/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'cast:resume' }),
      });
      
      return response.ok;
    } catch (error) {
      console.error('[CastService] Resume error:', error);
      return false;
    }
  },

  // TV'yi tamamen durdur
  async sendStop(token: string): Promise<boolean> {
    try {
      console.log('[CastService] Sending stop command to TV');
      
      const response = await fetch(`${API_BASE}/api/cast/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'cast:stop' }),
      });
      
      return response.ok;
    } catch (error) {
      console.error('[CastService] Stop error:', error);
      return false;
    }
  },

  // TV'de şu an ne çalıyor bilgisini al (opsiyonel)
  async getNowPlaying(token: string): Promise<any | null> {
    try {
      const response = await fetch(`${API_BASE}/api/cast/now-playing`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('[CastService] Get now playing error:', error);
      return null;
    }
  },
};

export default castService;

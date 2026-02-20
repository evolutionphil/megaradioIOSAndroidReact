import AsyncStorage from '@react-native-async-storage/async-storage';

const STATS_KEY = 'listening_stats';
const HISTORY_KEY = 'listening_history';
const LAST_SESSION_KEY = 'last_listening_session';

export interface ListeningStats {
  totalMinutes: number;
  totalStations: number;
  musicPlayed: number;  // This tracks the number of different songs played (from metadata changes)
  lastUpdated: string;
}

export interface ListeningSession {
  stationId: string;
  stationName: string;
  stationLogo?: string;
  startTime: number;
  endTime?: number;
  durationMinutes: number;
}

const defaultStats: ListeningStats = {
  totalMinutes: 0,
  totalStations: 136000, // Total available stations
  musicPlayed: 0,
  lastUpdated: new Date().toISOString(),
};

/**
 * Stats Service - Tracks user listening statistics
 */
export const statsService = {
  /**
   * Get current listening stats
   */
  async getStats(): Promise<ListeningStats> {
    try {
      const stored = await AsyncStorage.getItem(STATS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return defaultStats;
    } catch (error) {
      console.error('Failed to load stats:', error);
      return defaultStats;
    }
  },

  /**
   * Save stats to storage
   */
  async saveStats(stats: ListeningStats): Promise<void> {
    try {
      await AsyncStorage.setItem(STATS_KEY, JSON.stringify({
        ...stats,
        lastUpdated: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Failed to save stats:', error);
    }
  },

  /**
   * Start a listening session
   * Call this when playback starts
   */
  async startSession(stationId: string, stationName: string, stationLogo?: string): Promise<void> {
    const session: ListeningSession = {
      stationId,
      stationName,
      stationLogo,
      startTime: Date.now(),
      durationMinutes: 0,
    };
    
    try {
      await AsyncStorage.setItem(LAST_SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  },

  /**
   * End the current listening session
   * Call this when playback stops or station changes
   */
  async endSession(): Promise<void> {
    try {
      const sessionStr = await AsyncStorage.getItem(LAST_SESSION_KEY);
      if (!sessionStr) return;
      
      const session: ListeningSession = JSON.parse(sessionStr);
      const endTime = Date.now();
      const durationMs = endTime - session.startTime;
      const durationMinutes = Math.floor(durationMs / 60000);
      
      // Only count if listened for at least 1 minute
      if (durationMinutes >= 1) {
        // Update session
        session.endTime = endTime;
        session.durationMinutes = durationMinutes;
        
        // Update stats
        const stats = await this.getStats();
        stats.totalMinutes += durationMinutes;
        stats.musicPlayed += 1;
        await this.saveStats(stats);
        
        // Add to history
        await this.addToHistory(session);
      }
      
      // Clear current session
      await AsyncStorage.removeItem(LAST_SESSION_KEY);
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  },

  /**
   * Add session to listening history
   */
  async addToHistory(session: ListeningSession): Promise<void> {
    try {
      const historyStr = await AsyncStorage.getItem(HISTORY_KEY);
      const history: ListeningSession[] = historyStr ? JSON.parse(historyStr) : [];
      
      // Add new session at the beginning
      history.unshift(session);
      
      // Keep only last 100 sessions
      const trimmedHistory = history.slice(0, 100);
      
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));
    } catch (error) {
      console.error('Failed to add to history:', error);
    }
  },

  /**
   * Get listening history
   */
  async getHistory(): Promise<ListeningSession[]> {
    try {
      const historyStr = await AsyncStorage.getItem(HISTORY_KEY);
      return historyStr ? JSON.parse(historyStr) : [];
    } catch (error) {
      console.error('Failed to get history:', error);
      return [];
    }
  },

  /**
   * Update stats in real-time while listening
   * Call this periodically (e.g., every minute)
   */
  async updateListeningTime(): Promise<void> {
    try {
      const sessionStr = await AsyncStorage.getItem(LAST_SESSION_KEY);
      if (!sessionStr) return;
      
      const session: ListeningSession = JSON.parse(sessionStr);
      const currentTime = Date.now();
      const durationMs = currentTime - session.startTime;
      const durationMinutes = Math.floor(durationMs / 60000);
      
      // Update session start time to track incremental minutes
      if (durationMinutes >= 1) {
        // Add 1 minute to total
        const stats = await this.getStats();
        stats.totalMinutes += 1;
        await this.saveStats(stats);
        
        // Update session start time for next increment
        session.startTime = currentTime;
        await AsyncStorage.setItem(LAST_SESSION_KEY, JSON.stringify(session));
      }
    } catch (error) {
      console.error('Failed to update listening time:', error);
    }
  },

  /**
   * Get unique stations listened to
   */
  async getUniqueStationsCount(): Promise<number> {
    try {
      const history = await this.getHistory();
      const uniqueStations = new Set(history.map(s => s.stationId));
      return uniqueStations.size;
    } catch (error) {
      return 0;
    }
  },

  /**
   * Reset all stats (for testing)
   */
  async resetStats(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([STATS_KEY, HISTORY_KEY, LAST_SESSION_KEY]);
    } catch (error) {
      console.error('Failed to reset stats:', error);
    }
  },

  /**
   * Increment music played count
   * Call this when metadata changes (new song starts)
   */
  async incrementMusicPlayed(): Promise<void> {
    try {
      const stats = await this.getStats();
      stats.musicPlayed += 1;
      await this.saveStats(stats);
    } catch (error) {
      console.error('Failed to increment music played:', error);
    }
  },
};

export default statsService;

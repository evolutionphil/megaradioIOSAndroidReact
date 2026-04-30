import { Station } from "./megaRadioApi";

const LISTENING_HISTORY_KEY = "listeningHistory";
const MAX_HISTORY = 50;

interface ListeningEntry {
  stationId: string;
  genre: string;
  country: string;
  timestamp: number;
}

export const recommendationService = {
  trackListen(station: Station): void {
    try {
      const history = this.getHistory();
      const tags = station.tags ? (Array.isArray(station.tags) ? station.tags : station.tags.split(',').map(t => t.trim())) : [];
      const genre = tags[0] || 'unknown';
      
      history.unshift({
        stationId: station._id,
        genre,
        country: station.country || 'unknown',
        timestamp: Date.now(),
      });
      
      localStorage.setItem(LISTENING_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
    } catch (err) {}
  },

  getHistory(): ListeningEntry[] {
    try {
      const data = localStorage.getItem(LISTENING_HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  },

  getTopGenres(limit = 3): string[] {
    const history = this.getHistory();
    const counts: Record<string, number> = {};
    history.forEach(e => {
      if (e.genre !== 'unknown') counts[e.genre] = (counts[e.genre] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([genre]) => genre);
  },

  getTopCountries(limit = 2): string[] {
    const history = this.getHistory();
    const counts: Record<string, number> = {};
    history.forEach(e => {
      if (e.country !== 'unknown') counts[e.country] = (counts[e.country] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([country]) => country);
  },

  hasEnoughData(): boolean {
    return this.getHistory().length >= 3;
  }
};

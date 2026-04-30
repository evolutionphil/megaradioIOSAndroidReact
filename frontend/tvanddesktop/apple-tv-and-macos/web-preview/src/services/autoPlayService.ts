import { Station, megaRadioApi } from "./megaRadioApi";

export type PlayAtStartMode = "last-played" | "random" | "favorite" | "none";

export const autoPlayService = {
  /**
   * Get the play at start preference from localStorage
   */
  getPlayAtStartMode(): PlayAtStartMode {
    const mode = localStorage.getItem("playAtStart");
    if (mode && ["last-played", "random", "favorite", "none"].includes(mode)) {
      return mode as PlayAtStartMode;
    }
    return "none"; // default - no auto-play
  },

  /**
   * Get the last played station from localStorage
   */
  getLastPlayedStation(): Station | null {
    try {
      const stationJson = localStorage.getItem("lastPlayedStation");
      if (stationJson) {
        return JSON.parse(stationJson) as Station;
      }
    } catch (err) {
      // Failed to parse last played station
    }
    return null;
  },

  /**
   * Get all favorite stations from localStorage
   */
  getFavoriteStations(): Station[] {
    try {
      const favoritesJson = localStorage.getItem("mega_radio_favorites");
      if (favoritesJson) {
        return JSON.parse(favoritesJson) as Station[];
      }
    } catch (err) {
      // Failed to parse favorites
    }
    return [];
  },

  /**
   * Get a random station from the API
   */
  async getRandomStation(countryCode: string = "US"): Promise<Station | null> {
    try {
      const response = await megaRadioApi.getAllStations({ country: countryCode, limit: 50 });
      const stations = response.stations;
      if (stations && stations.length > 0) {
        const randomIndex = Math.floor(Math.random() * stations.length);
        return stations[randomIndex];
      }
    } catch (err) {
      // Failed to fetch random station
    }
    return null;
  },

  /**
   * Get the station to play based on the play at start mode
   */
  async getStationToPlay(mode: PlayAtStartMode, countryCode: string = "US"): Promise<Station | null> {
    switch (mode) {
      case "last-played":
        return this.getLastPlayedStation();
      
      case "random":
        return await this.getRandomStation(countryCode);
      
      case "favorite":
        const favorites = this.getFavoriteStations();
        if (favorites.length > 0) {
          const randomIndex = Math.floor(Math.random() * favorites.length);
          return favorites[randomIndex];
        }
        return null;
      
      case "none":
        return null;
      
      default:
        return null;
    }
  },

  /**
   * Check if auto-play should happen on this session
   * Returns true only on first app load (not on every page navigation)
   */
  shouldAutoPlay(): boolean {
    // Check if we've already auto-played in this session
    const hasAutoPlayed = sessionStorage.getItem("hasAutoPlayed");
    if (hasAutoPlayed === "true") {
      return false;
    }
    
    // Mark that we're about to auto-play
    sessionStorage.setItem("hasAutoPlayed", "true");
    return true;
  }
};

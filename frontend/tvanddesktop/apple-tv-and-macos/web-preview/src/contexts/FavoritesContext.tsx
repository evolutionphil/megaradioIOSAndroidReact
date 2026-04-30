import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { Station } from "@/services/megaRadioApi";
import { trackFavoriteToggle } from "@/lib/analytics";
import { useAuth } from "@/contexts/AuthContext";

var API_BASE = 'https://api.themegaradio.com';
var FAVORITES_STORAGE_KEY = "mega_radio_favorites";

interface FavoritesContextType {
  favorites: Station[];
  addFavorite: (station: Station) => void;
  removeFavorite: (stationId: string) => void;
  isFavorite: (stationId: string) => boolean;
  toggleFavorite: (station: Station) => void;
}

var FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  var [favorites, setFavorites] = useState<Station[]>([]);
  var { isAuthenticated, token } = useAuth();
  var hasSyncedRef = useRef(false);

  useEffect(function() {
    try {
      var stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        var parsed = JSON.parse(stored);
        setFavorites(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {}
  }, []);

  useEffect(function() {
    if (!isAuthenticated || !token || hasSyncedRef.current) return;
    hasSyncedRef.current = true;

    fetch(API_BASE + '/api/user/favorites', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(response) {
      if (!response.ok) throw new Error('Failed to fetch favorites');
      return response.json();
    })
    .then(function(data) {
      var apiFavorites = Array.isArray(data) ? data : (data.favorites || data.stations || []);
      var localFavs: Station[] = [];
      try {
        var stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
        if (stored) localFavs = JSON.parse(stored) || [];
      } catch(e) {}

      // Merge: combine API and local favorites
      var mergedMap: Record<string, Station> = {};
      localFavs.forEach(function(s: Station) { mergedMap[s._id] = s; });
      apiFavorites.forEach(function(s: Station) { mergedMap[s._id] = s; });
      var merged = Object.keys(mergedMap).map(function(k) { return mergedMap[k]; });

      if (merged.length > 0) {
        setFavorites(merged);
        saveFavorites(merged);
      }

      // Push local-only favorites to API
      var apiIds: Record<string, boolean> = {};
      apiFavorites.forEach(function(s: Station) { apiIds[s._id] = true; });
      localFavs.forEach(function(s: Station) {
        if (!apiIds[s._id]) {
          fetch(API_BASE + '/api/user/favorites', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ stationId: s._id })
          }).catch(function() {});
        }
      });
    })
    .catch(function(err) {
      console.warn('[Favorites] Failed to sync with API:', err);
    });
  }, [isAuthenticated, token]);

  useEffect(function() {
    if (!isAuthenticated) {
      hasSyncedRef.current = false;
    }
  }, [isAuthenticated]);

  var saveFavorites = function(newFavorites: Station[]) {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
    } catch (error) {}
  };

  var addFavorite = function(station: Station) {
    setFavorites(function(prev) {
      var exists = prev.some(function(s) { return s._id === station._id; });
      if (exists) return prev;
      var newFavorites = prev.concat([station]);
      saveFavorites(newFavorites);
      trackFavoriteToggle(station.name, true);

      if (isAuthenticated && token) {
        fetch(API_BASE + '/api/user/favorites', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ stationId: station._id })
        }).catch(function() {});
      }

      return newFavorites;
    });
  };

  var removeFavorite = function(stationId: string) {
    setFavorites(function(prev) {
      var station = prev.find(function(s) { return s._id === stationId; });
      var newFavorites = prev.filter(function(s) { return s._id !== stationId; });
      saveFavorites(newFavorites);
      if (station) {
        trackFavoriteToggle(station.name, false);
      }

      if (isAuthenticated && token) {
        fetch(API_BASE + '/api/user/favorites/' + stationId, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + token }
        }).catch(function() {});
      }

      return newFavorites;
    });
  };

  var isFavorite = function(stationId: string) {
    return favorites.some(function(s) { return s._id === stationId; });
  };

  var toggleFavorite = function(station: Station) {
    if (isFavorite(station._id)) {
      removeFavorite(station._id);
    } else {
      addFavorite(station);
    }
  };

  return (
    <FavoritesContext.Provider
      value={{ favorites: favorites, addFavorite: addFavorite, removeFavorite: removeFavorite, isFavorite: isFavorite, toggleFavorite: toggleFavorite }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  var context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import stationService, { StationQueryParams } from '../services/stationService';
import genreService from '../services/genreService';
import userService from '../services/userService';
import api from '../services/api';
import { getCachedPopularStations, getCachedGenres } from '../services/tvInitService';
import type { Station } from '../types';

// Cache TTL Configuration (based on backend developer recommendations)
// staleTime: How long data is considered fresh (won't refetch)
// gcTime: How long to keep unused data in memory cache
export const CACHE_TTL = {
  // Static data - changes rarely (24 hours)
  GENRES_ALL: 24 * 60 * 60 * 1000,        // 24 hours
  COUNTRIES: 24 * 60 * 60 * 1000,          // 24 hours
  TRANSLATIONS: 24 * 60 * 60 * 1000,       // 24 hours
  
  // Semi-static data (30 min - 1 hour)
  STATION_DETAIL: 30 * 60 * 1000,          // 30 minutes
  GENRE_STATIONS: 60 * 60 * 1000,          // 1 hour
  SIMILAR_STATIONS: 30 * 60 * 1000,        // 30 minutes
  
  // Dynamic lists (5-10 minutes)
  STATIONS_LIST: 10 * 60 * 1000,           // 10 minutes
  POPULAR_STATIONS: 10 * 60 * 1000,        // 10 minutes
  TRENDING: 5 * 60 * 1000,                 // 5 minutes
  TOP_100: 10 * 60 * 1000,                 // 10 minutes
  NEARBY_STATIONS: 10 * 60 * 1000,         // 10 minutes
  
  // User-specific data (30 sec - 2 min)
  RECENTLY_PLAYED: 30 * 1000,              // 30 seconds
  FAVORITES: 60 * 1000,                    // 1 minute
  USER_PROFILE: 2 * 60 * 1000,             // 2 minutes
  FOLLOWERS: 2 * 60 * 1000,                // 2 minutes
  FOLLOWING: 2 * 60 * 1000,                // 2 minutes
  IS_FOLLOWING: 2 * 60 * 1000,             // 2 minutes
  NOTIFICATIONS: 30 * 1000,                // 30 seconds
  
  // Search - short cache for fresh results
  SEARCH: 2 * 60 * 1000,                   // 2 minutes
  
  // Community data
  COMMUNITY_FAVORITES: 5 * 60 * 1000,      // 5 minutes
  PUBLIC_PROFILES: 5 * 60 * 1000,          // 5 minutes
};

// gcTime multiplier (2x staleTime for most cases)
const GC_MULTIPLIER = 2;

// Query keys
export const queryKeys = {
  stations: ['stations'] as const,
  popularStations: ['stations', 'popular'] as const,
  nearbyStations: (lat: number, lng: number) => ['stations', 'nearby', lat, lng] as const,
  precomputedStations: (country?: string) => ['stations', 'precomputed', country] as const,
  station: (id: string) => ['station', id] as const,
  similarStations: (id: string) => ['stations', 'similar', id] as const,
  searchStations: (query: string) => ['stations', 'search', query] as const,
  top100: (country?: string) => ['stations', 'top100', country] as const,
  genres: ['genres'] as const,
  precomputedGenres: (country?: string) => ['genres', 'precomputed', country] as const,
  genreStations: (slug: string) => ['genres', slug, 'stations'] as const,
  favorites: ['user', 'favorites'] as const,
  recentlyPlayed: ['recentlyPlayed'] as const,
  communityFavorites: ['communityFavorites'] as const,
};

// Station hooks with backend-recommended caching
export const useStations = (params: StationQueryParams = {}) => {
  return useQuery({
    queryKey: [...queryKeys.stations, params],
    queryFn: () => stationService.getStations(params),
    staleTime: CACHE_TTL.STATIONS_LIST,
    gcTime: CACHE_TTL.STATIONS_LIST * GC_MULTIPLIER,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const usePopularStations = (country?: string, limit: number = 12) => {
  return useQuery({
    queryKey: ['popularStations', country || 'global', limit],
    queryFn: async () => {
      // First try to get from TV init cache (instant, no network)
      const cachedStations = getCachedPopularStations(limit);
      if (cachedStations && cachedStations.length > 0) {
        console.log('[useQueries] Using cached popular stations from TV init:', cachedStations.length);
        return cachedStations as unknown as Station[];
      }
      // Fallback to API call
      console.log('[useQueries] Fetching popular stations from API');
      return stationService.getPopularStations(country, limit);
    },
    staleTime: CACHE_TTL.POPULAR_STATIONS,
    gcTime: CACHE_TTL.POPULAR_STATIONS * GC_MULTIPLIER,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useNearbyStations = (lat: number | null, lng: number | null, radius: number = 150, limit: number = 12) => {
  return useQuery({
    queryKey: [...queryKeys.nearbyStations(lat || 0, lng || 0), radius, limit],
    queryFn: () => stationService.getNearbyStations(lat!, lng!, radius, limit),
    enabled: lat !== null && lng !== null,
    staleTime: CACHE_TTL.NEARBY_STATIONS,
    gcTime: CACHE_TTL.NEARBY_STATIONS * GC_MULTIPLIER,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const usePrecomputedStations = (
  country?: string,
  countryName?: string,
  page: number = 1,
  limit: number = 33
) => {
  return useQuery({
    queryKey: [...queryKeys.precomputedStations(country), page, limit],
    queryFn: () => stationService.getPrecomputedStations(country, countryName, page, limit),
    staleTime: CACHE_TTL.STATIONS_LIST,
    gcTime: CACHE_TTL.STATIONS_LIST * GC_MULTIPLIER,
    refetchOnWindowFocus: false,
  });
};

export const useStation = (identifier: string) => {
  return useQuery({
    queryKey: queryKeys.station(identifier),
    queryFn: () => stationService.getStation(identifier),
    enabled: !!identifier,
    staleTime: CACHE_TTL.STATION_DETAIL,
    gcTime: CACHE_TTL.STATION_DETAIL * GC_MULTIPLIER,
    refetchOnWindowFocus: false,
  });
};

export const useSimilarStations = (stationId: string, limit: number = 12) => {
  return useQuery({
    queryKey: queryKeys.similarStations(stationId),
    queryFn: () => stationService.getSimilarStations(stationId, limit),
    enabled: stationId.length > 0,
    staleTime: CACHE_TTL.SIMILAR_STATIONS,
    gcTime: CACHE_TTL.SIMILAR_STATIONS * GC_MULTIPLIER,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });
};

export const useSearchStations = (query: string, limit: number = 20) => {
  return useQuery({
    queryKey: queryKeys.searchStations(query),
    queryFn: () => stationService.searchStations(query, limit),
    enabled: query.length >= 2,
    staleTime: CACHE_TTL.SEARCH,
    gcTime: CACHE_TTL.SEARCH * GC_MULTIPLIER,
    refetchOnWindowFocus: false,
  });
};

export const useTop100 = (country?: string) => {
  return useQuery({
    queryKey: queryKeys.top100(country),
    queryFn: () => stationService.getTop100(country),
    staleTime: CACHE_TTL.TOP_100,
    gcTime: CACHE_TTL.TOP_100 * GC_MULTIPLIER,
    refetchOnWindowFocus: false,
  });
};

// Genre hooks with backend-recommended caching
export const useGenres = (page: number = 1, limit: number = 50) => {
  return useQuery({
    queryKey: [...queryKeys.genres, page, limit],
    queryFn: () => genreService.getGenres(page, limit),
    staleTime: CACHE_TTL.GENRES_ALL,
    gcTime: CACHE_TTL.GENRES_ALL * GC_MULTIPLIER,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const usePrecomputedGenres = (country?: string) => {
  return useQuery({
    queryKey: ['precomputedGenres', country],
    queryFn: async () => {
      // First try to get from TV init cache (instant, no network)
      const cachedGenres = getCachedGenres();
      if (cachedGenres && cachedGenres.length > 0) {
        console.log('[useQueries] Using cached genres from TV init:', cachedGenres.length);
        return cachedGenres;
      }
      // Fallback to API call
      console.log('[useQueries] Fetching genres from API');
      return genreService.getPrecomputedGenres(country);
    },
    staleTime: CACHE_TTL.GENRES_ALL,
    gcTime: CACHE_TTL.GENRES_ALL * GC_MULTIPLIER,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useGenreStations = (
  slug: string,
  page: number = 1,
  limit: number = 25,
  country?: string,
  sort?: 'votes' | 'name' | 'createdAt',
  order?: 'asc' | 'desc'
) => {
  return useQuery({
    queryKey: [...queryKeys.genreStations(slug), page, limit, country, sort, order],
    queryFn: () => genreService.getGenreStations(slug, page, limit, country, sort, order),
    enabled: !!slug,
    staleTime: CACHE_TTL.GENRE_STATIONS,
    gcTime: CACHE_TTL.GENRE_STATIONS * GC_MULTIPLIER,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useDiscoverableGenres = () => {
  return useQuery({
    queryKey: ['discoverableGenres'],
    queryFn: async () => {
      // First try to get from TV init cache (instant, no network)
      const cachedGenres = getCachedGenres();
      if (cachedGenres && cachedGenres.length > 0) {
        console.log('[useQueries] Using cached discoverable genres from TV init:', cachedGenres.length);
        return cachedGenres;
      }
      // Fallback to API call
      console.log('[useQueries] Fetching discoverable genres from API');
      return genreService.getDiscoverableGenres();
    },
    staleTime: CACHE_TTL.GENRES_ALL,
    gcTime: CACHE_TTL.GENRES_ALL * GC_MULTIPLIER,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

// User hooks with backend-recommended caching
export const useFavorites = () => {
  return useQuery({
    queryKey: queryKeys.favorites,
    queryFn: () => userService.getFavorites(),
    staleTime: CACHE_TTL.FAVORITES,
    gcTime: CACHE_TTL.FAVORITES * GC_MULTIPLIER,
    refetchOnWindowFocus: false,
  });
};

export const useRecentlyPlayed = () => {
  // Use hook to get reactive auth state
  const { useAuthStore } = require('../store/authStore');
  const isAuthenticated = useAuthStore((state: any) => state.isAuthenticated);
  const userId = useAuthStore((state: any) => state.user?._id);
  
  return useQuery({
    queryKey: [...queryKeys.recentlyPlayed, isAuthenticated, userId],
    queryFn: () => stationService.getRecentlyPlayed(),
    retry: false,
    staleTime: CACHE_TTL.RECENTLY_PLAYED,
    gcTime: CACHE_TTL.RECENTLY_PLAYED * GC_MULTIPLIER,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
};

export const useCommunityFavorites = (limit: number = 20) => {
  return useQuery({
    queryKey: [...queryKeys.communityFavorites, limit],
    queryFn: () => stationService.getCommunityFavorites(limit),
    staleTime: CACHE_TTL.COMMUNITY_FAVORITES,
    gcTime: CACHE_TTL.COMMUNITY_FAVORITES * GC_MULTIPLIER,
    refetchOnWindowFocus: false,
  });
};

export const usePublicProfiles = (limit: number = 10) => {
  return useQuery({
    queryKey: ['publicProfiles', limit],
    queryFn: () => stationService.getPublicProfiles(limit),
    staleTime: CACHE_TTL.PUBLIC_PROFILES,
    gcTime: CACHE_TTL.PUBLIC_PROFILES * GC_MULTIPLIER,
    refetchOnWindowFocus: false,
  });
};

// User profile favorites hook with preloading support
export const useUserFavorites = (userId: string) => {
  return useQuery({
    queryKey: ['userFavorites', userId],
    queryFn: async () => {
      const response = await api.get(`https://themegaradio.com/api/users/${userId}/favorites`);
      return response.data?.favorites || response.data || [];
    },
    enabled: !!userId,
    staleTime: CACHE_TTL.COMMUNITY_FAVORITES,
    gcTime: CACHE_TTL.COMMUNITY_FAVORITES * GC_MULTIPLIER,
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Use cached/preloaded data
  });
};

// User profile info hook
export const useUserProfile = (userId: string) => {
  return useQuery({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      const response = await api.get(`https://themegaradio.com/api/user-profile/${userId}`);
      return response.data;
    },
    enabled: !!userId,
    staleTime: CACHE_TTL.USER_PROFILE,
    gcTime: CACHE_TTL.USER_PROFILE * GC_MULTIPLIER,
    refetchOnWindowFocus: false,
  });
};

// Mutations
export const useAddFavorite = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (stationId: string) => userService.addFavorite(stationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.favorites });
    },
  });
};

export const useRemoveFavorite = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (stationId: string) => userService.removeFavorite(stationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.favorites });
    },
  });
};

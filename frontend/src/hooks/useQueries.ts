import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import stationService, { StationQueryParams } from '../services/stationService';
import genreService from '../services/genreService';
import userService from '../services/userService';
import api from '../services/api';
import type { Station } from '../types';

// NO LOCAL CACHING - Always fetch fresh data from API
// React Query is only used for state management, not caching
const FRESH_DATA = {
  staleTime: 0,    // Always consider data stale - refetch on every mount
  gcTime: 5 * 60 * 1000, // Keep in memory for 5 mins to avoid unnecessary re-renders
};

// Query keys
export const queryKeys = {
  stations: ['stations'] as const,
  popularStations: (country?: string) => ['popularStations', country || 'global'] as const,
  nearbyStations: (lat: number, lng: number) => ['stations', 'nearby', lat, lng] as const,
  precomputedStations: (country?: string) => ['stations', 'precomputed', country] as const,
  station: (id: string) => ['station', id] as const,
  similarStations: (id: string) => ['stations', 'similar', id] as const,
  searchStations: (query: string) => ['stations', 'search', query] as const,
  top100: (country?: string) => ['stations', 'top100', country] as const,
  genres: ['genres'] as const,
  precomputedGenres: (country?: string) => ['precomputedGenres', country || 'global'] as const,
  discoverableGenres: ['discoverableGenres'] as const,
  genreStations: (slug: string) => ['genreStations', slug] as const,
  favorites: ['user', 'favorites'] as const,
  recentlyPlayed: ['recentlyPlayed'] as const,
  communityFavorites: ['communityFavorites'] as const,
};

// Station hooks - ALWAYS FRESH DATA
export const useStations = (params: StationQueryParams = {}) => {
  return useQuery({
    queryKey: [...queryKeys.stations, params],
    queryFn: () => {
      console.log('[useQueries] useStations - params:', params);
      return stationService.getStations(params);
    },
    ...FRESH_DATA,
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: false,
  });
};

export const usePopularStations = (country?: string, limit: number = 12) => {
  return useQuery({
    queryKey: queryKeys.popularStations(country),
    queryFn: async () => {
      console.log('[useQueries] usePopularStations - fetching from API, country:', country || 'global');
      const result = await stationService.getPopularStations(country, limit);
      return { stations: result.stations || [] };
    },
    ...FRESH_DATA,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
};

export const useNearbyStations = (lat: number | null, lng: number | null, radius: number = 150, limit: number = 12) => {
  return useQuery({
    queryKey: [...queryKeys.nearbyStations(lat || 0, lng || 0), radius, limit],
    queryFn: () => {
      console.log('[useQueries] useNearbyStations - fetching from API, lat:', lat, 'lng:', lng);
      return stationService.getNearbyStations(lat!, lng!, radius, limit);
    },
    enabled: lat !== null && lng !== null,
    ...FRESH_DATA,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
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
    queryFn: () => {
      console.log('[useQueries] usePrecomputedStations - fetching from API, country:', country);
      return stationService.getPrecomputedStations(country, countryName, page, limit);
    },
    ...FRESH_DATA,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
};

export const useStation = (identifier: string) => {
  return useQuery({
    queryKey: queryKeys.station(identifier),
    queryFn: () => stationService.getStation(identifier),
    enabled: !!identifier,
    ...FRESH_DATA,
    refetchOnWindowFocus: false,
  });
};

export const useSimilarStations = (stationId: string, limit: number = 12) => {
  return useQuery({
    queryKey: queryKeys.similarStations(stationId),
    queryFn: () => stationService.getSimilarStations(stationId, limit),
    enabled: stationId.length > 0,
    ...FRESH_DATA,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useSearchStations = (query: string, limit: number = 20) => {
  return useQuery({
    queryKey: queryKeys.searchStations(query),
    queryFn: () => stationService.searchStations(query, limit),
    enabled: query.length >= 2,
    ...FRESH_DATA,
    refetchOnWindowFocus: false,
  });
};

export const useTop100 = (country?: string) => {
  return useQuery({
    queryKey: queryKeys.top100(country),
    queryFn: () => {
      console.log('[useQueries] useTop100 - fetching from API, country:', country);
      return stationService.getTop100(country);
    },
    ...FRESH_DATA,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
};

// Genre hooks - ALWAYS FRESH DATA
export const useGenres = (page: number = 1, limit: number = 50) => {
  return useQuery({
    queryKey: [...queryKeys.genres, page, limit],
    queryFn: () => {
      console.log('[useQueries] useGenres - fetching from API');
      return genreService.getGenres(page, limit);
    },
    ...FRESH_DATA,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
};

export const usePrecomputedGenres = (country?: string) => {
  return useQuery({
    queryKey: queryKeys.precomputedGenres(country),
    queryFn: async () => {
      console.log('[useQueries] usePrecomputedGenres - fetching from API, country:', country || 'global');
      const result = await genreService.getPrecomputedGenres(country);
      console.log('[useQueries] usePrecomputedGenres result:', result?.data?.length || 0, 'genres');
      return result;
    },
    ...FRESH_DATA,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
};

export const useGenreStations = (
  slug: string,
  page: number = 1,
  limit: number = 25,
  country?: string, // Native country name (e.g., "Türkiye", "Austria"), NOT ISO code!
  sort?: 'votes' | 'name' | 'createdAt',
  order?: 'asc' | 'desc'
) => {
  return useQuery({
    queryKey: [...queryKeys.genreStations(slug), page, limit, country || 'global', sort, order],
    queryFn: () => {
      console.log('[useQueries] useGenreStations - slug:', slug, 'country:', country || 'global');
      return genreService.getGenreStations(slug, page, limit, country, sort, order);
    },
    enabled: !!slug,
    ...FRESH_DATA,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
};

export const useDiscoverableGenres = () => {
  return useQuery({
    queryKey: queryKeys.discoverableGenres,
    queryFn: async () => {
      console.log('[useQueries] useDiscoverableGenres - fetching from API');
      const result = await genreService.getDiscoverableGenres();
      console.log('[useQueries] useDiscoverableGenres result:', result?.length || 0, 'genres');
      return Array.isArray(result) ? result : (result?.data || []);
    },
    ...FRESH_DATA,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
};

// User hooks - keep some caching for user data
export const useFavorites = () => {
  return useQuery({
    queryKey: queryKeys.favorites,
    queryFn: () => userService.getFavorites(),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
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
    queryFn: () => userService.getRecentlyPlayed(),
    retry: false,
    staleTime: 30 * 1000,  // 30 seconds
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
};

export const useCommunityFavorites = (limit: number = 20) => {
  return useQuery({
    queryKey: [...queryKeys.communityFavorites, limit],
    queryFn: () => stationService.getCommunityFavorites(limit),
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const usePublicProfiles = (limit: number = 10) => {
  return useQuery({
    queryKey: ['publicProfiles', limit],
    queryFn: () => stationService.getPublicProfiles(limit),
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// User profile favorites hook
export const useUserFavorites = (userId: string) => {
  return useQuery({
    queryKey: ['userFavorites', userId],
    queryFn: async () => {
      const response = await api.get(`https://themegaradio.com/api/users/${userId}/favorites`);
      return response.data?.favorites || response.data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
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
    staleTime: 2 * 60 * 1000,  // 2 minutes
    gcTime: 10 * 60 * 1000,
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

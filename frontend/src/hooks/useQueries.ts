import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import stationService, { StationQueryParams } from '../services/stationService';
import genreService from '../services/genreService';
import userService from '../services/userService';
import type { Station } from '../types';

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

// Station hooks
// Station hooks with performance optimizations
export const useStations = (params: StationQueryParams = {}) => {
  return useQuery({
    queryKey: [...queryKeys.stations, params],
    queryFn: () => stationService.getStations(params),
    staleTime: 5 * 60 * 1000, // 5 minutes - data doesn't change frequently
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch if data exists
  });
};

export const usePopularStations = (country?: string, limit: number = 12) => {
  return useQuery({
    queryKey: [...queryKeys.popularStations, country, limit],
    queryFn: () => stationService.getPopularStations(country, limit),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useNearbyStations = (lat: number | null, lng: number | null, radius: number = 150, limit: number = 12) => {
  return useQuery({
    queryKey: [...queryKeys.nearbyStations(lat || 0, lng || 0), radius, limit],
    queryFn: () => stationService.getNearbyStations(lat!, lng!, radius, limit),
    enabled: lat !== null && lng !== null,
    staleTime: 10 * 60 * 1000,
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
    queryFn: () => stationService.getPrecomputedStations(country, countryName, page, limit),
  });
};

export const useStation = (identifier: string) => {
  return useQuery({
    queryKey: queryKeys.station(identifier),
    queryFn: () => stationService.getStation(identifier),
    enabled: !!identifier,
  });
};

export const useSimilarStations = (stationId: string, limit: number = 12) => {
  return useQuery({
    queryKey: queryKeys.similarStations(stationId),
    queryFn: () => stationService.getSimilarStations(stationId, limit),
    enabled: stationId.length > 0, // Only fetch when stationId is not empty
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false, // Don't retry to prevent flickering
  });
};

export const useSearchStations = (query: string, limit: number = 20) => {
  return useQuery({
    queryKey: queryKeys.searchStations(query),
    queryFn: () => stationService.searchStations(query, limit),
    enabled: query.length >= 2,
  });
};

export const useTop100 = (country?: string) => {
  return useQuery({
    queryKey: queryKeys.top100(country),
    queryFn: () => stationService.getTop100(country),
  });
};

// Genre hooks with performance optimizations
export const useGenres = (page: number = 1, limit: number = 50) => {
  return useQuery({
    queryKey: [...queryKeys.genres, page, limit],
    queryFn: () => genreService.getGenres(page, limit),
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
  });
};

export const usePrecomputedGenres = (country?: string) => {
  return useQuery({
    queryKey: queryKeys.precomputedGenres(country),
    queryFn: () => genreService.getPrecomputedGenres(country),
    staleTime: 15 * 60 * 1000, // 15 minutes - genres change rarely
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
    refetchOnWindowFocus: false,
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false,
  });
};

export const useDiscoverableGenres = () => {
  return useQuery({
    queryKey: ['genres', 'discoverable'],
    queryFn: () => genreService.getDiscoverableGenres(),
  });
};

// User hooks
export const useFavorites = () => {
  return useQuery({
    queryKey: queryKeys.favorites,
    queryFn: () => userService.getFavorites(),
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
    staleTime: 2 * 60 * 1000, // 2 minutes
    // Refetch when auth changes
    refetchOnMount: true,
  });
};

export const useCommunityFavorites = (limit: number = 20) => {
  return useQuery({
    queryKey: [...queryKeys.communityFavorites, limit],
    queryFn: () => stationService.getCommunityFavorites(limit),
  });
};

export const usePublicProfiles = (limit: number = 10) => {
  return useQuery({
    queryKey: ['publicProfiles', limit],
    queryFn: () => stationService.getPublicProfiles(limit),
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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import stationService, { StationQueryParams } from '../services/stationService';
import genreService from '../services/genreService';
import userService from '../services/userService';
import type { Station } from '../types';

// Query keys
export const queryKeys = {
  stations: ['stations'] as const,
  popularStations: ['stations', 'popular'] as const,
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
export const useStations = (params: StationQueryParams = {}) => {
  return useQuery({
    queryKey: [...queryKeys.stations, params],
    queryFn: () => stationService.getStations(params),
  });
};

export const usePopularStations = (country?: string, limit: number = 12) => {
  return useQuery({
    queryKey: [...queryKeys.popularStations, country, limit],
    queryFn: () => stationService.getPopularStations(country, limit),
    staleTime: 10 * 60 * 1000, // 10 minutes
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
    enabled: !!stationId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
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

// Genre hooks
export const useGenres = (page: number = 1, limit: number = 50) => {
  return useQuery({
    queryKey: [...queryKeys.genres, page, limit],
    queryFn: () => genreService.getGenres(page, limit),
  });
};

export const usePrecomputedGenres = (country?: string) => {
  return useQuery({
    queryKey: queryKeys.precomputedGenres(country),
    queryFn: () => genreService.getPrecomputedGenres(country),
  });
};

export const useGenreStations = (
  slug: string,
  page: number = 1,
  limit: number = 25,
  country?: string
) => {
  return useQuery({
    queryKey: [...queryKeys.genreStations(slug), page, limit, country],
    queryFn: () => genreService.getGenreStations(slug, page, limit, country),
    enabled: !!slug,
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
  return useQuery({
    queryKey: queryKeys.recentlyPlayed,
    queryFn: () => stationService.getRecentlyPlayed(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
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

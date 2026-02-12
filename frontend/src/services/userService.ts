import api from './api';
import { API_ENDPOINTS } from '../constants/api';
import type { Station, FavoritesResponse, User } from '../types';

export const userService = {
  // Get user's favorites
  async getFavorites(): Promise<FavoritesResponse> {
    const response = await api.get(API_ENDPOINTS.user.favorites);
    return response.data;
  },

  // Add station to favorites
  async addFavorite(stationId: string): Promise<{ message: string; favorites: string[] }> {
    const response = await api.post(API_ENDPOINTS.user.favorites, { stationId });
    return response.data;
  },

  // Remove station from favorites
  async removeFavorite(stationId: string): Promise<{ message: string }> {
    const response = await api.delete(API_ENDPOINTS.user.removeFavorite(stationId));
    return response.data;
  },

  // Check if station is favorited
  async checkFavorite(stationId: string): Promise<{ isFavorite: boolean }> {
    const response = await api.get(API_ENDPOINTS.user.checkFavorite(stationId));
    return response.data;
  },

  // Get recently played stations
  async getRecentlyPlayed(): Promise<Station[]> {
    const response = await api.get(API_ENDPOINTS.recentlyPlayed);
    return response.data;
  },

  // Record recently played
  async recordRecentlyPlayed(stationId: string): Promise<{ message: string }> {
    const response = await api.post(API_ENDPOINTS.recentlyPlayed, { stationId });
    return response.data;
  },

  // Record listening duration
  async recordListening(
    stationId: string,
    duration: number,
    startedAt: string
  ): Promise<void> {
    await api.post(API_ENDPOINTS.listening.record, {
      stationId,
      duration,
      startedAt,
    });
  },

  // Get user profile
  async getProfile(idOrSlug: string): Promise<User> {
    const response = await api.get(API_ENDPOINTS.profile(idOrSlug));
    return response.data;
  },

  // Get user's public favorites
  async getUserFavorites(idOrSlug: string): Promise<Station[]> {
    const response = await api.get(API_ENDPOINTS.userFavorites(idOrSlug));
    return response.data;
  },

  // Follow user
  async followUser(userId: string): Promise<{ message: string }> {
    const response = await api.post(API_ENDPOINTS.user.follow(userId));
    return response.data;
  },

  // Unfollow user
  async unfollowUser(userId: string): Promise<{ message: string }> {
    const response = await api.delete(API_ENDPOINTS.user.unfollow(userId));
    return response.data;
  },

  // Check if following user
  async isFollowing(userId: string): Promise<{ isFollowing: boolean }> {
    const response = await api.get(API_ENDPOINTS.user.isFollowing(userId));
    return response.data;
  },

  // Get followers
  async getFollowers(userId: string): Promise<User[]> {
    const response = await api.get(API_ENDPOINTS.user.followers(userId));
    return response.data;
  },

  // Get following
  async getFollowing(userId: string): Promise<User[]> {
    const response = await api.get(API_ENDPOINTS.user.following(userId));
    return response.data;
  },
};

export default userService;

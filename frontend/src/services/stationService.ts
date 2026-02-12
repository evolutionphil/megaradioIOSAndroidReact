import api from './api';
import { API_ENDPOINTS } from '../constants/api';
import type {
  Station,
  StationResponse,
  PrecomputedStationResponse,
  StreamResolveResponse,
  NowPlayingMetadata,
} from '../types';

export interface StationQueryParams {
  page?: number;
  limit?: number;
  country?: string;
  state?: string;
  genre?: string;
  tags?: string;
  language?: string;
  search?: string;
  sort?: 'votes' | 'clickCount' | 'name' | 'createdAt';
  order?: 'asc' | 'desc';
  excludeBroken?: boolean;
  minVotes?: number;
  timePeriod?: '24h' | '7d' | '30d' | 'all';
}

export const stationService = {
  // Get list of stations with filtering
  async getStations(params: StationQueryParams = {}): Promise<StationResponse> {
    const response = await api.get(API_ENDPOINTS.stations.list, { params });
    return response.data;
  },

  // Get precomputed stations (faster, sorted by logo/votes)
  async getPrecomputedStations(
    country?: string,
    countryName?: string,
    page: number = 1,
    limit: number = 33
  ): Promise<PrecomputedStationResponse> {
    const response = await api.get(API_ENDPOINTS.stations.precomputed, {
      params: { country, countryName, page, limit },
    });
    return response.data;
  },

  // Get popular stations
  async getPopularStations(
    country?: string,
    limit: number = 12
  ): Promise<{ stations: Station[]; count: number }> {
    const response = await api.get(API_ENDPOINTS.stations.popular, {
      params: { country, limit, excludeBroken: true },
    });
    return response.data;
  },

  // Get single station by slug or ID
  async getStation(identifier: string): Promise<Station> {
    const response = await api.get(API_ENDPOINTS.stations.single(identifier));
    return response.data;
  },

  // Get nearby stations by GPS coordinates
  async getNearbyStations(
    lat: number,
    lng: number,
    radius: number = 100,
    limit: number = 20
  ): Promise<{ stations: Station[]; count: number }> {
    const response = await api.get(API_ENDPOINTS.stations.nearby, {
      params: { lat, lng, radius, limit },
    });
    return response.data;
  },

  // Get similar stations
  async getSimilarStations(
    stationId: string,
    limit: number = 12
  ): Promise<{ stations: Station[] }> {
    const response = await api.get(API_ENDPOINTS.stations.similar(stationId), {
      params: { limit },
    });
    return response.data;
  },

  // Resolve stream URL
  async resolveStream(url: string): Promise<StreamResolveResponse> {
    const response = await api.get(API_ENDPOINTS.stream.resolve, {
      params: { url },
    });
    return response.data;
  },

  // Get now playing metadata
  async getNowPlaying(stationId: string): Promise<NowPlayingMetadata> {
    const response = await api.get(API_ENDPOINTS.metadata.nowPlaying(stationId));
    return response.data;
  },

  // Record a click on station
  async recordClick(stationId: string): Promise<{ clickCount: number }> {
    const response = await api.post(API_ENDPOINTS.stations.click(stationId));
    return response.data;
  },

  // Search stations
  async searchStations(
    query: string,
    limit: number = 20
  ): Promise<Station[]> {
    const response = await api.get(API_ENDPOINTS.discover.search, {
      params: { q: query, limit },
    });
    return response.data;
  },

  // Get top 100 stations
  async getTop100(country?: string): Promise<Station[]> {
    const response = await api.get(API_ENDPOINTS.discover.top100, {
      params: { country },
    });
    return response.data;
  },

  // Get station stats
  async getStats(): Promise<{ total: number; working: number; broken: number }> {
    const response = await api.get(API_ENDPOINTS.stations.stats);
    return response.data;
  },

  // Get stream proxy URL for HTTP streams
  getProxyUrl(streamUrl: string): string {
    const encodedUrl = encodeURIComponent(streamUrl);
    return `${api.defaults.baseURL}${API_ENDPOINTS.stream.proxy(encodedUrl)}`;
  },

  // Get HLS stream URL
  getHlsUrl(stationId: string): string {
    return `${api.defaults.baseURL}${API_ENDPOINTS.stream.hls(stationId)}`;
  },
};

export default stationService;

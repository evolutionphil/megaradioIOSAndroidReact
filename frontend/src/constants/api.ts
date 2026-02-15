// MegaRadio API Configuration
export const API_BASE_URL = 'https://themegaradio.com';

export const API_ENDPOINTS = {
  // Auth endpoints
  auth: {
    signup: '/api/auth/signup',
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
    google: '/api/auth/google',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: '/api/auth/reset-password',
    profile: '/api/auth/profile',
  },
  
  // Station endpoints
  stations: {
    list: '/api/stations',
    single: (identifier: string) => `/api/station/${identifier}`,
    popular: '/api/stations/popular',
    precomputed: '/api/stations/precomputed',
    working: '/api/stations/working',
    nearby: '/api/stations/nearby',
    withGeo: '/api/stations/with-geo',
    similar: (stationId: string) => `/api/stations/similar/${stationId}`,
    countryRandom: '/api/stations/country-random',
    stats: '/api/stations/stats',
    click: (id: string) => `/api/stations/${id}/click`,
    vote: (id: string) => `/api/stations/${id}/vote`,
    rate: (id: string) => `/api/stations/${id}/rate`,
    ratings: (id: string) => `/api/stations/${id}/ratings`,
    userRating: (id: string) => `/api/stations/${id}/user-rating`,
    reportError: '/api/stations/report-error',
    nowPlaying: (id: string) => `/api/stations/${id}/metadata`,
  },
  
  // Streaming endpoints
  stream: {
    resolve: '/api/stream/resolve',
    proxy: (encodedUrl: string) => `/api/stream/${encodedUrl}`,
    hls: (stationId: string) => `/api/stream-hls/${stationId}`,
  },
  
  // Metadata endpoints
  metadata: {
    nowPlaying: (stationId: string) => `/api/stations/${stationId}/metadata`,
  },
  
  // Genre endpoints
  genres: {
    list: '/api/genres',
    precomputed: '/api/genres/precomputed',
    discoverable: '/api/genres/discoverable',
    bySlug: (slug: string) => `/api/genres/slug/${slug}`,
    stations: (slug: string) => `/api/genres/${slug}/stations`,
  },
  
  // Filter endpoints
  filters: {
    countries: '/api/filters/countries',
    languages: '/api/filters/languages',
    genres: '/api/filters/genres',
  },
  
  // Location endpoints
  location: '/api/location',
  countries: '/api/countries',
  
  // User endpoints
  user: {
    favorites: '/api/user/favorites',
    checkFavorite: (stationId: string) => `/api/user/favorites/check/${stationId}`,
    removeFavorite: (stationId: string) => `/api/user/favorites/${stationId}`,
    follow: (userId: string) => `/api/user/follow/${userId}`,
    unfollow: (userId: string) => `/api/user/unfollow/${userId}`,
    isFollowing: (userId: string) => `/api/user/is-following/${userId}`,
    followers: (userId: string) => `/api/user/followers/${userId}`,
    following: (userId: string) => `/api/user/following/${userId}`,
    notifications: '/api/user/notifications',
    markNotificationRead: (id: string) => `/api/user/notifications/${id}/read`,
    markAllNotificationsRead: '/api/user/notifications/read-all',
  },
  
  // Profile endpoints
  profile: (idOrSlug: string) => `/api/user-profile/${idOrSlug}`,
  userFavorites: (idOrSlug: string) => `/api/users/${idOrSlug}/favorites`,
  publicProfiles: '/api/public-profiles',
  
  // Listening/Recording
  recentlyPlayed: '/api/recently-played',
  listening: {
    record: '/api/listening/record',
  },
  
  // Discovery endpoints
  discover: {
    search: '/api/discover/search',
    top100: '/api/discover/top100',
  },
  
  // Community
  communityFavorites: '/api/community-favorites',
  
  // Recommendations
  recommendations: {
    diverse: '/api/recommendations/diverse',
  },
  
  // ML
  ml: {
    trackInteraction: '/api/ml/track-interaction',
    recommendations: (sessionId: string) => `/api/ml/recommendations/${sessionId}`,
  },
  
  // Translations
  translations: (lang: string) => `/api/translations/${lang}`,
  translationsCritical: (lang: string) => `/api/translations/${lang}/critical`,
  
  // Image proxy
  image: (encodedUrl: string) => `/api/image/${encodedUrl}`,
  
  // Public profiles
  publicProfiles: '/api/public-profiles',
  
  // Advertisements
  advertisements: '/api/advertisements',
};

export default API_ENDPOINTS;

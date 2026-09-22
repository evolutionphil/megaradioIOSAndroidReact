import api from './api';
import stationService from './stationService';
import genreService from './genreService';
import watchService from './watchService';
import wearOSService from './wearOSService';
import { normalizeCompanionCountries } from '../utils/companionCountries';

let pending: Promise<void> | null = null;
export function syncCompanionCatalog(platform: 'ios' | 'android'): Promise<void> {
  if (pending) return pending;
  pending = (async () => {
    const [genres, countries, stations] = await Promise.allSettled([
      genreService.getPrecomputedGenres(undefined, 40),
      api.get('/api/filters/countries'),
      stationService.getPopularStations(undefined, 30),
    ]);
    const target = platform === 'ios' ? watchService : wearOSService;
    if (genres.status === 'fulfilled') target.updateGenres(genres.value.data || []);
    if (countries.status === 'fulfilled') {
      target.updateCountries(normalizeCompanionCountries(countries.value.data));
    }
    if (platform === 'android' && stations.status === 'fulfilled') wearOSService.updateStations(stations.value.stations || []);
  })().finally(() => { pending = null; });
  return pending;
}
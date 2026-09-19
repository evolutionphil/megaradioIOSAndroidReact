import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';

export interface ListeningStats {
  totalMinutes: number;
  totalStations: number;
  musicPlayed: number;
  uniqueStationsListened: number;
  lastUpdated: string;
  totalSeconds?: number;
}
export interface ListeningSession {
  stationId: string;
  stationName: string;
  stationLogo?: string;
  startTime: number;
  accountedUntil?: number;
  endTime?: number;
  durationMinutes: number;
}
export type StatsOwner = string | null;
export const getStatsOwner = (): StatsOwner => {
  const auth = useAuthStore.getState();
  return auth.isAuthenticated ? auth.user?._id || (auth.user as any)?.id || null : null;
};
export const emptyStats = (): ListeningStats => ({
  totalMinutes: 0, totalStations: 136000, musicPlayed: 0,
  uniqueStationsListened: 0, lastUpdated: new Date().toISOString(),
});

// Legacy device-wide keys have no reliable owner. Leave them untouched, but do
// not copy possibly mixed account history into whichever account logs in next.
const key = (owner: StatsOwner, name: string) =>
  `@megaradio/stats-v2/${owner ? `user:${encodeURIComponent(owner)}` : 'guest'}/${name}`;
const queues = new Map<string, Promise<unknown>>();
const liveSessions = new Set<string>();

// Capture owner at invocation, BEFORE awaiting anything. Serialize read-modify-
// write per account so parallel minute/song/unique updates cannot lose counts.
function queued<T>(owner: StatsOwner, work: () => Promise<T>): Promise<T> {
  const scope = key(owner, 'queue');
  const prior = queues.get(scope) || Promise.resolve();
  const next = prior.catch(() => {}).then(work);
  queues.set(scope, next);
  void next.finally(() => { if (queues.get(scope) === next) queues.delete(scope); }).catch(() => {});
  return next;
}
async function read<T>(owner: StatsOwner, name: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key(owner, name));
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}
const write = (owner: StatsOwner, name: string, value: unknown) =>
  AsyncStorage.setItem(key(owner, name), JSON.stringify(value));
const readStats = (owner: StatsOwner) => read(owner, 'totals', emptyStats());
async function saveStats(owner: StatsOwner, stats: ListeningStats) {
  await write(owner, 'totals', { ...stats, lastUpdated: new Date().toISOString() });
}
async function accrue(owner: StatsOwner, session: ListeningSession, now: number) {
  const from = session.accountedUntil ?? session.startTime;
  const seconds = Math.max(0, (now - from) / 1000);
  if (seconds) {
    const stats = await readStats(owner);
    stats.totalSeconds = (stats.totalSeconds ?? stats.totalMinutes * 60) + seconds;
    stats.totalMinutes = Math.floor(stats.totalSeconds / 60);
    await saveStats(owner, stats);
    session.accountedUntil = now;
  }
}
async function end(owner: StatsOwner) {
  const session = await read<ListeningSession | null>(owner, 'session', null);
  if (!session) return;
  if (!liveSessions.has(key(owner, 'session'))) {
    await AsyncStorage.removeItem(key(owner, 'session'));
    return; // A previous process's stale timestamp is not listening time.
  }
  const now = Date.now();
  await accrue(owner, session, now);
  const history = await read<ListeningSession[]>(owner, 'history', []);
  const durationMinutes = Math.max(0, Math.floor((now - session.startTime) / 60000));
  if (durationMinutes) await write(owner, 'history', [
    { ...session, endTime: now, durationMinutes }, ...history,
  ].slice(0, 100));
  // Ending a station session is NOT a new song.
  await AsyncStorage.removeItem(key(owner, 'session'));
  liveSessions.delete(key(owner, 'session'));
}

export const statsService = {
  getStats(owner: StatsOwner = getStatsOwner()): Promise<ListeningStats> {
    return queued(owner, () => readStats(owner));
  },
  saveStats(stats: ListeningStats, owner: StatsOwner = getStatsOwner()): Promise<void> {
    return queued(owner, () => saveStats(owner, stats));
  },
  startSession(stationId: string, stationName: string, stationLogo?: string,
    owner: StatsOwner = getStatsOwner()): Promise<void> {
    return queued(owner, async () => {
      const existing = await read<ListeningSession | null>(owner, 'session', null);
      if (existing?.stationId === stationId && liveSessions.has(key(owner, 'session'))) return;
      await end(owner);
      const now = Date.now();
      await write(owner, 'session', {
        stationId, stationName, stationLogo, startTime: now,
        accountedUntil: now, durationMinutes: 0,
      });
      liveSessions.add(key(owner, 'session'));
    });
  },
  endSession(owner: StatsOwner = getStatsOwner()): Promise<void> {
    return queued(owner, () => end(owner));
  },
  addToHistory(session: ListeningSession, owner: StatsOwner = getStatsOwner()): Promise<void> {
    return queued(owner, async () => {
      const history = await read<ListeningSession[]>(owner, 'history', []);
      await write(owner, 'history', [session, ...history].slice(0, 100));
    });
  },
  getHistory(owner: StatsOwner = getStatsOwner()): Promise<ListeningSession[]> {
    return queued(owner, () => read<ListeningSession[]>(owner, 'history', []));
  },
  updateListeningTime(owner: StatsOwner = getStatsOwner()): Promise<void> {
    return queued(owner, async () => {
      const session = await read<ListeningSession | null>(owner, 'session', null);
      if (!session || !liveSessions.has(key(owner, 'session'))) return;
      await accrue(owner, session, Date.now());
      await write(owner, 'session', session);
    });
  },
  resetStats(owner: StatsOwner = getStatsOwner()): Promise<void> {
    return queued(owner, async () => {
      liveSessions.delete(key(owner, 'session'));
      await AsyncStorage.multiRemove(['totals', 'history', 'session', 'unique'].map(name => key(owner, name)));
    });
  },
  incrementMusicPlayed(owner: StatsOwner = getStatsOwner()): Promise<void> {
    return queued(owner, async () => {
      const stats = await readStats(owner);
      stats.musicPlayed++;
      await saveStats(owner, stats);
    });
  },
  trackUniqueStation(stationId: string, owner: StatsOwner = getStatsOwner()): Promise<boolean> {
    return queued(owner, async () => {
      const stations = await read<string[]>(owner, 'unique', []);
      if (!stationId || stations.includes(stationId)) return false;
      stations.push(stationId);
      await write(owner, 'unique', stations);
      const stats = await readStats(owner);
      stats.uniqueStationsListened = stations.length;
      await saveStats(owner, stats);
      return true;
    });
  },
  getUniqueStationsListened(owner: StatsOwner = getStatsOwner()): Promise<number> {
    return queued(owner, async () => {
      const stations = await read<string[]>(owner, 'unique', []);
      const history = await read<ListeningSession[]>(owner, 'history', []);
      return new Set([...stations, ...history.map(session => session.stationId)]).size;
    });
  },
  getUniqueStationsCount(owner: StatsOwner = getStatsOwner()): Promise<number> {
    return this.getUniqueStationsListened(owner);
  },
};
export default statsService;
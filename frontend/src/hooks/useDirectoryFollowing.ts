import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

export function useDirectoryFollowing(ids: string[], enabled: boolean) {
  const { user, token, isAuthenticated } = useAuthStore();
  const owner = isAuthenticated ? user?._id || (user as any)?.id || '' : '';
  const current = useRef(owner); current.current = owner;
  const [state, setState] = useState<{ owner: string; values: Record<string, boolean> }>({ owner: '', values: {} });
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const revisions = useRef<Record<string, number>>({});
  const mutationVersion = useRef(0);
  const signature = ids.join('|');
  useEffect(() => {
    let active = true;
    const storageKey = `megaradio_follow_status:user:${owner}`;
    const loadVersion = mutationVersion.current;
    setState({ owner, values: {} }); setBusy({});
    if (!enabled || !owner || !token) return;
    void (async () => {
      try {
        const cached = await AsyncStorage.getItem(storageKey);
        if (active && cached) setState({ owner, values: JSON.parse(cached) });
      } catch {}
      const pending = ids.filter(id => id !== owner);
      const values: Record<string, boolean> = {};
      await Promise.all(Array.from({ length: 4 }, async () => {
        while (active && pending.length) {
          const id = pending.shift()!;
          const revision = revisions.current[id] || 0;
          try {
            const { data } = await api.get(`/api/user/is-following/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            values[id] = Boolean(data?.isFollowing);
          } catch { values[id] = false; }
          if (active && revision === (revisions.current[id] || 0)) {
            setState(prev => ({ owner, values: { ...prev.values, [id]: values[id] } }));
          }
        }
      }));
      if (active && loadVersion === mutationVersion.current) await AsyncStorage.setItem(storageKey, JSON.stringify(values));
    })();
    return () => { active = false; };
  }, [owner, token, signature, enabled]);

  const values = state.owner === owner ? state.values : {};
  const toggle = async (id: string) => {
    if (!owner || !token || busy[id]) return;
    const before = Boolean(values[id]);
    revisions.current[id] = (revisions.current[id] || 0) + 1;
    mutationVersion.current++;
    setBusy(prev => ({ ...prev, [id]: true }));
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (before) await api.delete(`/api/user/unfollow/${id}`, config);
      else await api.post(`/api/user/follow/${id}`, {}, config);
      if (current.current !== owner) return;
      setState(prev => ({ owner, values: { ...prev.values, [id]: !before } }));
      await AsyncStorage.removeItem(`megaradio_follow_status:user:${owner}`);
    } finally { if (current.current === owner) setBusy(prev => ({ ...prev, [id]: false })); }
  };
  return { owner, values, busy, toggle };
}
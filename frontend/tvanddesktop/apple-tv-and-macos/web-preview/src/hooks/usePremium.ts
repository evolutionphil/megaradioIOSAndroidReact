import { useCallback, useEffect, useState } from 'react';
import { SUBSCRIPTION_API_URL } from '@/services/megaRadioApi';

export type PremiumState = { isPremium: boolean; adsRemoved: boolean; expiresAt: number | null; owner?: string };
const empty = (): PremiumState => ({ isPremium: false, adsRemoved: false, expiresAt: null });
function owner(): string {
  try { const user = JSON.parse(localStorage.getItem('tv_auth_user') || 'null'); return user?.id || user?._id || ''; } catch { return ''; }
}
function token(): string { try { return localStorage.getItem('tv_auth_token') || ''; } catch { return ''; } }

// Never derive expiry from a clicked product ID or extend it by Date.now()+1year.
export function premiumFromServer(data: any, userId: string, now = Date.now()): PremiumState {
  if (!userId || data?.isActive !== true) return empty();
  const plan = typeof data.plan === 'string' ? data.plan : '';
  const lifetime = plan === 'premium_lifetime';
  const rawExpiry = data.expiryDate || data.expiresAt || data.validUntil;
  const expiresAt = rawExpiry ? new Date(rawExpiry).getTime() : null;
  if (!lifetime && (!expiresAt || !Number.isFinite(expiresAt) || expiresAt <= now)) return empty();
  const isPremium = ['premium', 'premium_monthly', 'premium_yearly', 'premium_lifetime'].includes(plan);
  return { isPremium, adsRemoved: isPremium || plan === 'remove_ads', expiresAt: lifetime ? null : expiresAt, owner: userId };
}
export function usePremium() {
  const [state, setState] = useState<PremiumState>(empty);
  const [ready, setReady] = useState(false);
  const applyVerified = useCallback((data: any) => {
    const next = premiumFromServer(data, owner());
    setState(next);
    setReady(true);
    window.dispatchEvent(new CustomEvent('mr:premium-changed', { detail: next }));
  }, []);
  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;
    const refresh = async () => {
      controller?.abort(); const requestController = new AbortController(); controller = requestController;
      const signal = requestController.signal;
      const requestOwner = owner(), requestToken = token();
      setState(empty());
      setReady(false);
      // Unscoped legacy cache can belong to another account; never hydrate it.
      try { localStorage.removeItem('premium_state_v1'); } catch {}
      if (!requestOwner || !requestToken) { setReady(true); return; }
      const timeout = setTimeout(() => requestController.abort(), 15000);
      try {
        const response = await fetch(SUBSCRIPTION_API_URL, { signal, headers: { Authorization: 'Bearer ' + requestToken } });
        if (!response.ok) return;
        const data = await response.json();
        if (active && !signal.aborted && owner() === requestOwner && token() === requestToken) applyVerified(data);
      } catch {} finally { clearTimeout(timeout); }
    };
    const onVerified = () => { void refresh(); };
    void refresh();
    window.addEventListener('mr:auth-changed', onVerified);
    window.addEventListener('mr:purchase', onVerified);
    return () => { active = false; controller?.abort(); window.removeEventListener('mr:auth-changed', onVerified); window.removeEventListener('mr:purchase', onVerified); };
  }, [applyVerified]);
  return { state, ready, isPremium: state.isPremium, adsRemoved: state.adsRemoved, applyVerified };
}
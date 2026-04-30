// Premium state hook — shared across TV app
// Source of truth: localStorage `premium_state_v1`
// On native platforms, this will be synced with the App Store / Play Store
// receipt via a postMessage bridge from the WKWebView / Android WebView shell.

import { useEffect, useState, useCallback } from 'react';

export interface PremiumState {
  isPremium: boolean;
  adsRemoved: boolean;
  productId?: string;
  purchasedAt?: number;
  expiresAt?: number;  // undefined for lifetime
}

const KEY = 'premium_state_v1';

function readState(): PremiumState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { isPremium: false, adsRemoved: false };
    const p: PremiumState = JSON.parse(raw);
    // Auto-expire
    if (p.expiresAt && p.expiresAt < Date.now()) {
      return { isPremium: false, adsRemoved: false };
    }
    return p;
  } catch { return { isPremium: false, adsRemoved: false }; }
}

function writeState(state: PremiumState) {
  localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('mr:premium-changed'));
}

export function usePremium() {
  const [state, setState] = useState<PremiumState>(readState);

  useEffect(() => {
    const refresh = () => setState(readState());
    window.addEventListener('mr:premium-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('mr:premium-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const applyPurchase = useCallback((productId: string) => {
    const now = Date.now();
    const YEAR = 365 * 24 * 60 * 60 * 1000;
    const MONTH = 30 * 24 * 60 * 60 * 1000;
    let next: PremiumState;
    switch (productId) {
      case 'megaradio_premium_yearly':
        next = { isPremium: true, adsRemoved: true, productId, purchasedAt: now, expiresAt: now + YEAR };
        break;
      case 'megaradio_premium_lifetime':
        next = { isPremium: true, adsRemoved: true, productId, purchasedAt: now };
        break;
      case 'megaradio_premium_monthly1':
        next = { isPremium: true, adsRemoved: true, productId, purchasedAt: now, expiresAt: now + MONTH };
        break;
      case 'megaradio_remove_ads_yearly1':
        next = { isPremium: false, adsRemoved: true, productId, purchasedAt: now, expiresAt: now + YEAR };
        break;
      default:
        return;
    }
    writeState(next);
  }, []);

  const clear = useCallback(() => writeState({ isPremium: false, adsRemoved: false }), []);

  return { ...state, applyPurchase, clear };
}

// Native bridge (tvOS / Android TV / Electron) listener.
// The native shell posts a message when an IAP completes on the device.
// Format: { type: 'mr-iap-completed', productId: string }
if (typeof window !== 'undefined') {
  window.addEventListener('message', (e) => {
    const data = e.data;
    if (data && data.type === 'mr-iap-completed' && data.productId) {
      const now = Date.now();
      const YEAR = 365 * 24 * 60 * 60 * 1000;
      const MONTH = 30 * 24 * 60 * 60 * 1000;
      let next: PremiumState | null = null;
      if (data.productId === 'megaradio_premium_yearly') next = { isPremium: true, adsRemoved: true, productId: data.productId, purchasedAt: now, expiresAt: now + YEAR };
      else if (data.productId === 'megaradio_premium_lifetime') next = { isPremium: true, adsRemoved: true, productId: data.productId, purchasedAt: now };
      else if (data.productId === 'megaradio_premium_monthly1') next = { isPremium: true, adsRemoved: true, productId: data.productId, purchasedAt: now, expiresAt: now + MONTH };
      else if (data.productId === 'megaradio_remove_ads_yearly1') next = { isPremium: false, adsRemoved: true, productId: data.productId, purchasedAt: now, expiresAt: now + YEAR };
      if (next) {
        localStorage.setItem(KEY, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('mr:premium-changed'));
      }
    }
  });
}

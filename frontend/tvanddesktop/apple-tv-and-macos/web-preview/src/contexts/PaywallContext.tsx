// Paywall Context — exposes `showPaywall(variant)` anywhere in the app.
// Handles native IAP bridge if running inside the tvOS/Android/Electron shell.

import { createContext, useCallback, useContext, useState, useEffect, ReactNode } from 'react';
import { PremiumPaywall, PaywallVariant } from '@/components/PremiumPaywall';
import { usePremium } from '@/hooks/usePremium';

interface PaywallContextType {
  showPaywall: (variant?: PaywallVariant) => void;
  hidePaywall: () => void;
  isPremium: boolean;
  adsRemoved: boolean;
}

const PaywallContext = createContext<PaywallContextType | null>(null);

export function PaywallProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState<PaywallVariant>('premium');
  const premium = usePremium();

  const showPaywall = useCallback((v: PaywallVariant = 'premium') => {
    if (v === 'premium' && premium.isPremium) return;
    if (v === 'remove_ads' && premium.adsRemoved) return;
    setVariant(v);
    setOpen(true);
  }, [premium.isPremium, premium.adsRemoved]);

  const hidePaywall = useCallback(() => setOpen(false), []);

  // Auto-show paywall after 45s on app launch (once per session, non-premium only).
  // Skipped on splash, login, paywall, and onboarding screens to avoid awkward overlap.
  useEffect(() => {
    if (premium.isPremium) return;
    const SHOWN_KEY = 'mr_auto_paywall_shown_session';
    if (sessionStorage.getItem(SHOWN_KEY) === '1') return;

    const timer = setTimeout(() => {
      const path = (typeof window !== 'undefined' && window.location.hash) || '';
      const blockedRoutes = ['#/', '#/login', '#/premium', '#/remove-ads', '#/guide-1', '#/guide-2', '#/guide-3', '#/guide-4'];
      const isBlocked = blockedRoutes.some(r => path === r || path.startsWith(r + '?'));
      if (isBlocked) return;
      sessionStorage.setItem(SHOWN_KEY, '1');
      setVariant('premium');
      setOpen(true);
    }, 45_000);

    return () => clearTimeout(timer);
  }, [premium.isPremium]);

  const onPurchase = useCallback((productId: string) => {
    if (productId === 'restore') {
      // Native bridge: ask the shell to restore purchases
      const bridge = (window as any).megaRadioNative;
      if (bridge?.restorePurchases) {
        bridge.restorePurchases();
      } else {
        alert('Restore Purchases will be handled by the native shell on tvOS / Android TV / Desktop.');
      }
      return;
    }

    // Ask the native shell to trigger StoreKit / BillingClient / Electron IAP.
    const bridge = (window as any).megaRadioNative;
    if (bridge?.purchase) {
      bridge.purchase(productId);
    } else {
      // Preview / dev fallback: simulate success
      premium.applyPurchase(productId);
      setOpen(false);
      alert(`✓ [Preview mode] Purchase ${productId} simulated. On device, native IAP will handle this.`);
    }
  }, [premium]);

  return (
    <PaywallContext.Provider value={{
      showPaywall, hidePaywall,
      isPremium: premium.isPremium,
      adsRemoved: premium.adsRemoved,
    }}>
      {children}
      <PremiumPaywall
        open={open}
        variant={variant}
        onClose={hidePaywall}
        onPurchase={onPurchase}
      />
    </PaywallContext.Provider>
  );
}

export function usePaywall() {
  const ctx = useContext(PaywallContext);
  if (!ctx) throw new Error('usePaywall must be used within PaywallProvider');
  return ctx;
}

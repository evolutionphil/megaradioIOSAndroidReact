// MegaRadio TV — Premium Paywall Component
// 3-tier pricing: yearly (€29.99, selected by default), lifetime (€59.99), monthly (€3.99)
// Design source: paywall-premium.jpg / Frame 570.png (birebir uygulandı)

import { useState, useEffect } from 'react';
import { assetPath } from '@/lib/assetPath';

// Shared IAP product IDs — identical to the iOS/Android mobile app
// so a single App Store Connect / Play Console setup covers every platform.
export const IAP_PRODUCTS = {
  premium_monthly: 'megaradio_premium_monthly1',
  premium_yearly: 'megaradio_premium_yearly',
  premium_lifetime: 'megaradio_premium_lifetime',
  remove_ads_yearly: 'megaradio_remove_ads_yearly1',
} as const;

export type PaywallVariant = 'premium' | 'remove_ads';

interface PaywallProps {
  open: boolean;
  variant?: PaywallVariant;
  onClose: () => void;
  onPurchase?: (productId: string) => void;
}

export function PremiumPaywall({ open, variant = 'premium', onClose, onPurchase }: PaywallProps) {
  // Default-select the yearly tile (screenshot shows yearly as highlighted)
  const [selected, setSelected] = useState<'yearly' | 'lifetime' | 'monthly'>('yearly');

  // Focus (D-pad): 0 = yearly, 1 = lifetime, 2 = monthly, 3 = subscribe, 4 = close
  const [focusIdx, setFocusIdx] = useState(0);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const tiers: Array<'yearly' | 'lifetime' | 'monthly'> = ['yearly', 'lifetime', 'monthly'];
      if (e.key === 'ArrowDown') setFocusIdx(i => Math.min(i + 1, variant === 'premium' ? 3 : 1));
      else if (e.key === 'ArrowUp') setFocusIdx(i => Math.max(i - 1, 0));
      else if (e.key === 'Backspace' || e.key === 'Escape') onClose();
      else if (e.key === 'Enter' || e.key === ' ') {
        if (variant === 'remove_ads') {
          if (focusIdx === 1) onPurchase?.(IAP_PRODUCTS.remove_ads_yearly);
          else onClose();
        } else {
          if (focusIdx < 3) {
            setSelected(tiers[focusIdx]);
          } else if (focusIdx === 3) {
            const map = {
              yearly: IAP_PRODUCTS.premium_yearly,
              lifetime: IAP_PRODUCTS.premium_lifetime,
              monthly: IAP_PRODUCTS.premium_monthly,
            };
            onPurchase?.(map[selected]);
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, focusIdx, selected, variant, onClose, onPurchase]);

  if (!open) return null;

  const isRemoveAds = variant === 'remove_ads';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      data-testid="paywall-backdrop"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 560, backgroundColor: '#0E0E0E', borderRadius: 28,
          overflow: 'hidden', position: 'relative',
          boxShadow: '0 20px 80px rgba(0,0,0,0.8), 0 0 40px rgba(255,65,153,0.2)',
        }}
        data-testid={`paywall-${variant}`}
      >
        {/* Hero image (yellow: remove_ads, pink: premium) */}
        <div style={{
          height: 340, background: isRemoveAds
            ? 'linear-gradient(180deg, #E8B800 0%, #0E0E0E 100%)'
            : 'linear-gradient(180deg, #2E3D8F 0%, #0E0E0E 100%)',
          position: 'relative',
        }}>
          <img
            src={assetPath(isRemoveAds ? 'images/paywall-hero-yellow.jpg' : 'images/paywall-hero-pink.jpg')}
            alt=""
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              opacity: 0.9,
            }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          {/* Close button (top-right) */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 20, right: 20,
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(0,0,0,0.5)', border: 'none',
              color: '#fff', fontSize: 24, cursor: 'pointer',
            }}
            data-testid="paywall-close-btn"
          >✕</button>
        </div>

        {/* Header row */}
        <div style={{ padding: '24px 32px 0', display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 16,
            background: 'linear-gradient(135deg, #FF4199 0%, #AD00FF 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, color: '#fff', fontWeight: 700,
          }}>M</div>
          <div>
            <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 28, fontWeight: 700, color: '#fff' }}>
              MegaRadio
            </div>
            <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 24, fontWeight: 700, color: isRemoveAds ? '#FFC700' : '#FFC700' }}>
              {isRemoveAds ? 'Remove Ads' : 'Premium'}
            </div>
          </div>
        </div>

        {isRemoveAds ? (
          <>
            <div style={{ padding: '24px 32px 0' }}>
              <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 36, fontWeight: 700, color: '#fff' }}>
                Tired of seeing ads?
              </div>
              <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 22, fontWeight: 400, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
                Now remove all annoying ads
              </div>
            </div>
            <div style={{ padding: '24px 32px 0' }}>
              <TierRow
                selected
                focused={focusIdx === 0}
                label="€ 29.99/yearly"
                sub="cancel anytime"
                onClick={() => setFocusIdx(0)}
              />
            </div>
            <div style={{ padding: '24px 32px 20px' }}>
              <button
                onClick={() => onPurchase?.(IAP_PRODUCTS.remove_ads_yearly)}
                style={{
                  width: '100%', height: 64, borderRadius: 32, border: 'none',
                  background: '#FF4199', color: '#fff',
                  fontFamily: "'Ubuntu', sans-serif", fontSize: 24, fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: focusIdx === 1 ? '0 0 24px rgba(255,65,153,0.8)' : 'none',
                  outline: focusIdx === 1 ? '3px solid #fff' : 'none',
                }}
                data-testid="paywall-remove-ads-cta"
              >Remove Ads</button>
            </div>
          </>
        ) : (
          <>
            {/* 5 checklist rows */}
            <div style={{ padding: '20px 32px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Remove Ads', 'Spotify And Youtube Music Support', 'HD Stream', 'Car Mode', 'Unlimited Stream Record', 'And more'].map(item => (
                <div key={item} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <span style={{ color: '#fff', fontSize: 22 }}>✓</span>
                  <span style={{ color: '#fff', fontFamily: "'Ubuntu', sans-serif", fontSize: 22, fontWeight: 500 }}>{item}</span>
                </div>
              ))}
            </div>
            {/* Tier rows */}
            <div style={{ padding: '20px 32px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <TierRow
                selected={selected === 'yearly'}
                focused={focusIdx === 0}
                label="€ 29.99/yearly"
                sub="cancel anytime"
                onClick={() => { setSelected('yearly'); setFocusIdx(0); }}
              />
              <TierRow
                selected={selected === 'lifetime'}
                focused={focusIdx === 1}
                label="€ 59.99/lifetime"
                sub="one-time payment"
                onClick={() => { setSelected('lifetime'); setFocusIdx(1); }}
              />
              <TierRow
                selected={selected === 'monthly'}
                focused={focusIdx === 2}
                label="€ 3.99/monthly"
                sub="cancel anytime"
                onClick={() => { setSelected('monthly'); setFocusIdx(2); }}
              />
            </div>
            <div style={{ padding: '20px 32px' }}>
              <button
                onClick={() => {
                  const map = {
                    yearly: IAP_PRODUCTS.premium_yearly,
                    lifetime: IAP_PRODUCTS.premium_lifetime,
                    monthly: IAP_PRODUCTS.premium_monthly,
                  };
                  onPurchase?.(map[selected]);
                }}
                style={{
                  width: '100%', height: 64, borderRadius: 32, border: 'none',
                  background: '#FF4199', color: '#fff',
                  fontFamily: "'Ubuntu', sans-serif", fontSize: 24, fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: focusIdx === 3 ? '0 0 24px rgba(255,65,153,0.8)' : 'none',
                  outline: focusIdx === 3 ? '3px solid #fff' : 'none',
                }}
                data-testid="paywall-subscribe-cta"
              >Subscribe Now</button>
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{
          padding: '12px 32px 24px', display: 'flex', justifyContent: 'space-between',
          color: 'rgba(255,255,255,0.5)', fontFamily: "'Ubuntu', sans-serif", fontSize: 16,
        }}>
          <button
            onClick={() => onPurchase?.('restore')}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16 }}
            data-testid="paywall-restore"
          >Already paid?</button>
          <button
            onClick={() => window.open('https://themegaradio.com/terms', '_blank')}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16 }}
            data-testid="paywall-terms"
          >Terms &amp; conditions</button>
        </div>
      </div>
    </div>
  );
}

function TierRow({ selected, focused, label, sub, onClick }: {
  selected: boolean; focused: boolean; label: string; sub: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', height: 64, borderRadius: 32,
        border: focused ? '2px solid #FF4199' : '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(40,40,40,0.9)',
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16,
        cursor: 'pointer',
        boxShadow: focused ? '0 0 16px rgba(255,65,153,0.4)' : 'none',
      }}
    >
      <span style={{
        width: 22, height: 22, borderRadius: '50%',
        border: '2px solid #FF4199',
        background: selected ? '#FF4199' : 'transparent',
        boxShadow: selected ? 'inset 0 0 0 4px #0E0E0E, 0 0 0 1px #FF4199' : 'none',
        flexShrink: 0,
      }} />
      <span style={{ color: '#fff', fontFamily: "'Ubuntu', sans-serif", fontSize: 22, fontWeight: 700 }}>
        {label},
      </span>
      <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: "'Ubuntu', sans-serif", fontSize: 22, fontWeight: 400 }}>
        {sub}
      </span>
    </button>
  );
}

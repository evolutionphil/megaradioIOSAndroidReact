// MegaRadio TV — Premium Paywall (compact card, mobile-style)
// Matches design screenshots: paywall-premium.jpg + paywall-remove-ads.jpg
// Single card centered on screen with hero image at top.

import { useState, useEffect } from 'react';
import { assetPath } from '@/lib/assetPath';

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

const FONT = "'Ubuntu', Helvetica, Arial, sans-serif";

export function PremiumPaywall({ open, variant = 'premium', onClose, onPurchase }: PaywallProps) {
  const [selected, setSelected] = useState<'yearly' | 'lifetime' | 'monthly'>('yearly');
  // focusIdx: 0..N-1 = tier rows, N = subscribe/CTA, N+1 = close
  const [focusIdx, setFocusIdx] = useState(0);

  useEffect(() => { if (open) { setFocusIdx(0); setSelected('yearly'); } }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const tiers: Array<'yearly' | 'lifetime' | 'monthly'> = ['yearly', 'lifetime', 'monthly'];
      const tierCount = variant === 'premium' ? 3 : 1;
      const ctaIdx = tierCount;
      const closeIdx = tierCount + 1;
      const max = closeIdx;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusIdx(i => Math.min(i + 1, max));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusIdx(i => Math.max(i - 1, 0));
      } else if (e.key === 'Backspace' || e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (focusIdx < tierCount) {
          if (variant === 'premium') setSelected(tiers[focusIdx]);
        } else if (focusIdx === ctaIdx) {
          if (variant === 'remove_ads') {
            onPurchase?.(IAP_PRODUCTS.remove_ads_yearly);
          } else {
            const map = {
              yearly: IAP_PRODUCTS.premium_yearly,
              lifetime: IAP_PRODUCTS.premium_lifetime,
              monthly: IAP_PRODUCTS.premium_monthly,
            };
            onPurchase?.(map[selected]);
          }
        } else if (focusIdx === closeIdx) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, focusIdx, selected, variant, onClose, onPurchase]);

  if (!open) return null;
  const isRemoveAds = variant === 'remove_ads';
  const ctaLabel = isRemoveAds ? 'Remove Ads' : 'Subscribe Now';
  const ctaIdx = isRemoveAds ? 1 : 3;
  const closeIdx = isRemoveAds ? 2 : 4;

  const heroSrc = assetPath(isRemoveAds ? 'images/paywall-hero-yellow.jpg' : 'images/paywall-hero-pink.jpg');

  return (
    <div
      data-testid="paywall-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        backgroundColor: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        data-testid={`paywall-${variant}`}
        onClick={e => e.stopPropagation()}
        style={{
          width: 460,
          maxHeight: '92vh',
          backgroundColor: '#0E0E0E',
          borderRadius: 28,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 24px 80px rgba(0,0,0,0.85), 0 0 60px rgba(255,65,153,0.15)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Hero image — full width, fades to black at the bottom */}
        <div style={{ position: 'relative', width: '100%', height: 240, flexShrink: 0 }}>
          <img
            src={heroSrc}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={e => {
              const el = e.target as HTMLImageElement;
              el.style.background = isRemoveAds
                ? 'linear-gradient(180deg,#E8B800,#0E0E0E)'
                : 'linear-gradient(180deg,#2E3D8F,#0E0E0E)';
              el.style.opacity = '0';
            }}
          />
          {/* Gradient fade so the image blends into the dark body */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(14,14,14,0) 55%, rgba(14,14,14,0.85) 88%, #0E0E0E 100%)',
            pointerEvents: 'none',
          }} />
          {/* Close button — only on remove_ads variant per spec */}
          {isRemoveAds && (
            <button
              onClick={onClose}
              data-testid="paywall-close-btn"
              style={{
                position: 'absolute', top: 16, right: 16,
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(0,0,0,0.55)', border: 'none',
                color: '#fff', fontSize: 20, cursor: 'pointer',
                outline: focusIdx === closeIdx ? '3px solid #fff' : 'none',
              }}
            >✕</button>
          )}
        </div>

        {/* Header row — logo + brand */}
        <div style={{ padding: '0 28px', marginTop: -56, position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{
              width: 76, height: 76, borderRadius: 18,
              background: 'linear-gradient(135deg, #FF4199 0%, #E91E63 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)', flexShrink: 0,
            }}>
              <img src={assetPath('images/path-8.svg')} alt="" style={{ width: 44, height: 44, filter: 'brightness(0) invert(1)' }} />
            </div>
            <div style={{ minHeight: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 4 }}>
              <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
                MegaRadio
              </div>
              <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: '#FFC700', lineHeight: 1.1 }}>
                {isRemoveAds ? 'Remove Ads' : 'Premium'}
              </div>
            </div>
          </div>
        </div>

        {/* Body — checklist OR title block */}
        <div style={{ padding: '20px 28px 0', flex: 1, overflowY: 'auto' }}>
          {isRemoveAds ? (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontFamily: FONT, fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1.15 }}>
                Tired of seeing ads?
              </div>
              <div style={{ fontFamily: FONT, fontSize: 17, fontWeight: 400, color: 'rgba(255,255,255,0.65)', marginTop: 6 }}>
                Now remove all annoying ads
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {[
                'Remove Ads',
                'Spotify And Youtube Music Support',
                'HD Stream',
                'Car Mode',
                'Unlimited Stream Record',
                'And more',
              ].map(item => (
                <div key={item} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ color: '#fff', fontSize: 18, width: 22, textAlign: 'center' }}>✓</span>
                  <span style={{ color: '#fff', fontFamily: FONT, fontSize: 17, fontWeight: 500 }}>{item}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tier rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {isRemoveAds ? (
              <TierRow
                selected
                focused={focusIdx === 0}
                label="€ 29.99/yearly"
                sub="cancel anytime"
                onClick={() => setFocusIdx(0)}
              />
            ) : (
              <>
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
                  sub="cancel anytime"
                  onClick={() => { setSelected('lifetime'); setFocusIdx(1); }}
                />
                <TierRow
                  selected={selected === 'monthly'}
                  focused={focusIdx === 2}
                  label="€ 3.99/montly"
                  sub="cancel anytime"
                  onClick={() => { setSelected('monthly'); setFocusIdx(2); }}
                />
              </>
            )}
          </div>
        </div>

        {/* CTA + footer */}
        <div style={{ padding: '16px 28px 20px', flexShrink: 0 }}>
          <button
            data-testid={isRemoveAds ? 'paywall-remove-ads-cta' : 'paywall-subscribe-cta'}
            onClick={() => {
              if (isRemoveAds) {
                onPurchase?.(IAP_PRODUCTS.remove_ads_yearly);
              } else {
                const map = {
                  yearly: IAP_PRODUCTS.premium_yearly,
                  lifetime: IAP_PRODUCTS.premium_lifetime,
                  monthly: IAP_PRODUCTS.premium_monthly,
                };
                onPurchase?.(map[selected]);
              }
            }}
            style={{
              width: '100%', height: 56, borderRadius: 28, border: 'none',
              background: '#FF4199', color: '#fff',
              fontFamily: FONT, fontSize: 20, fontWeight: 700,
              cursor: 'pointer',
              boxShadow: focusIdx === ctaIdx ? '0 0 24px rgba(255,65,153,0.85)' : '0 6px 18px rgba(255,65,153,0.35)',
              outline: focusIdx === ctaIdx ? '3px solid #fff' : 'none',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
          >{ctaLabel}</button>

          <div style={{
            marginTop: 14, display: 'flex', justifyContent: 'space-between',
            color: 'rgba(255,255,255,0.5)', fontFamily: FONT, fontSize: 14,
          }}>
            <button
              onClick={() => onPurchase?.('restore')}
              data-testid="paywall-restore"
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 14 }}
            >Already paid?</button>
            <button
              onClick={() => window.open('https://themegaradio.com/terms', '_blank')}
              data-testid="paywall-terms"
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 14 }}
            >Terms &amp; conditions</button>
          </div>
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
        width: '100%', height: 54, borderRadius: 27,
        border: focused ? '2px solid #FF4199' : '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(40,40,40,0.92)',
        display: 'flex', alignItems: 'center', padding: '0 22px', gap: 14,
        cursor: 'pointer',
        boxShadow: focused ? '0 0 14px rgba(255,65,153,0.45)' : 'none',
        transition: 'border 0.15s, box-shadow 0.15s',
      }}
    >
      <span style={{
        width: 20, height: 20, borderRadius: '50%',
        border: '2px solid #FF4199',
        background: selected ? '#FF4199' : 'transparent',
        boxShadow: selected ? 'inset 0 0 0 4px #0E0E0E, 0 0 0 1.5px #FF4199' : 'none',
        flexShrink: 0,
      }} />
      <span style={{ color: '#fff', fontFamily: FONT, fontSize: 18, fontWeight: 700 }}>
        {label},
      </span>
      <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: FONT, fontSize: 16, fontWeight: 400 }}>
        {sub}
      </span>
    </button>
  );
}

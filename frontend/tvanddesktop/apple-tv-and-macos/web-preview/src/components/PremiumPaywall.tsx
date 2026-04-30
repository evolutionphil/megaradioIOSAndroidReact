// MegaRadio TV — Premium Paywall (matches design screenshots 1:1)
// Premium variant : Frame 571.png  — large hero, 6 benefits, 3 tier rows
// Remove Ads      : Frame 570.png  — yellow hero takes top half, ✕ close, single tier
//
// Both cards are ~620px wide, ~880px tall, perfectly centered on screen.

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

      if (e.key === 'ArrowDown') { e.preventDefault(); setFocusIdx(i => Math.min(i + 1, max)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusIdx(i => Math.max(i - 1, 0)); }
      else if (e.key === 'Backspace' || e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (focusIdx < tierCount) {
          if (variant === 'premium') setSelected(tiers[focusIdx]);
        } else if (focusIdx === ctaIdx) {
          if (variant === 'remove_ads') onPurchase?.(IAP_PRODUCTS.remove_ads_yearly);
          else {
            const map = {
              yearly: IAP_PRODUCTS.premium_yearly,
              lifetime: IAP_PRODUCTS.premium_lifetime,
              monthly: IAP_PRODUCTS.premium_monthly,
            };
            onPurchase?.(map[selected]);
          }
        } else if (focusIdx === closeIdx) onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, focusIdx, selected, variant, onClose, onPurchase]);

  if (!open) return null;
  const isRemoveAds = variant === 'remove_ads';
  const ctaIdx = isRemoveAds ? 1 : 3;
  const closeIdx = isRemoveAds ? 2 : 4;

  return (
    <div
      data-testid="paywall-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        data-testid={`paywall-${variant}`}
        onClick={e => e.stopPropagation()}
        style={{
          width: 620,
          maxHeight: '94vh',
          backgroundColor: '#0E0E0E',
          borderRadius: 32,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 30px 100px rgba(0,0,0,0.9), 0 0 80px rgba(255,65,153,0.18)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {isRemoveAds ? <RemoveAdsBody focusIdx={focusIdx} closeIdx={closeIdx} ctaIdx={ctaIdx} onClose={onClose} onPurchase={onPurchase} /> : <PremiumBody focusIdx={focusIdx} ctaIdx={ctaIdx} selected={selected} setSelected={setSelected} setFocusIdx={setFocusIdx} onPurchase={onPurchase} selectedTier={selected} />}
      </div>
    </div>
  );
}

/* ─────────────────── PREMIUM VARIANT ─────────────────── */

function PremiumBody({
  focusIdx, ctaIdx, selected, setSelected, setFocusIdx, onPurchase, selectedTier,
}: {
  focusIdx: number; ctaIdx: number; selected: 'yearly' | 'lifetime' | 'monthly';
  setSelected: (v: 'yearly' | 'lifetime' | 'monthly') => void;
  setFocusIdx: (n: number) => void;
  onPurchase?: (productId: string) => void;
  selectedTier: 'yearly' | 'lifetime' | 'monthly';
}) {
  return (
    <>
      {/* Hero — gradient + brand mark (clean, no embedded UI) */}
      <div style={{
        position: 'relative', width: '100%', height: 280, flexShrink: 0,
        background: `
          radial-gradient(ellipse at 70% 30%, rgba(173, 0, 255, 0.55) 0%, transparent 60%),
          radial-gradient(ellipse at 30% 70%, rgba(255, 65, 153, 0.45) 0%, transparent 65%),
          linear-gradient(135deg, #1a0830 0%, #2E1065 50%, #0E0E0E 100%)
        `,
        overflow: 'hidden',
      }}>
        {/* Decorative musical note motif */}
        <div style={{
          position: 'absolute', top: '50%', right: '-40px', transform: 'translateY(-50%)',
          width: 280, height: 280, opacity: 0.18,
          background: `url(${assetPath('images/path-8.svg')}) center/contain no-repeat`,
          filter: 'brightness(0) invert(1)',
        }} />
        {/* Subtle equalizer bars across the bottom */}
        <div style={{
          position: 'absolute', bottom: 70, left: 0, right: 0, height: 40,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: 6,
          opacity: 0.4,
        }}>
          {[12, 28, 18, 36, 22, 32, 16, 30, 24, 38, 14, 26, 20, 34].map((h, i) => (
            <div key={i} style={{ width: 3, height: h, background: '#FF4199', borderRadius: 2 }} />
          ))}
        </div>
        {/* Bottom fade into card body */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(14,14,14,0) 50%, rgba(14,14,14,0.85) 92%, #0E0E0E 100%)',
        }} />
        {/* Logo + brand text */}
        <div style={{ position: 'absolute', left: 32, bottom: 16, display: 'flex', gap: 16, alignItems: 'flex-end', zIndex: 2 }}>
          <BrandLogoTile />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 4 }}>
            <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>MegaRadio</div>
            <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: '#FFC700', lineHeight: 1.1 }}>Premium</div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 32px 0', flex: 1, overflowY: 'auto' }}>
        {/* Benefits list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
          {[
            'Remove Ads',
            'Spotify And Youtube Music Support',
            'HD Stream',
            'Car Mode',
            'Unlimited Stream Record',
            'And more',
          ].map(item => (
            <div key={item} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ color: '#fff', fontSize: 22, width: 26, textAlign: 'center', fontWeight: 300 }}>✓</span>
              <span style={{ color: '#fff', fontFamily: FONT, fontSize: 19, fontWeight: 500 }}>{item}</span>
            </div>
          ))}
        </div>

        {/* Tier rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          <TierRow selected={selected === 'yearly'} focused={focusIdx === 0} label="€ 29.99/yearly" sub="cancel anytime" onClick={() => { setSelected('yearly'); setFocusIdx(0); }} />
          <TierRow selected={selected === 'lifetime'} focused={focusIdx === 1} label="€ 59.99/lifetime" sub="cancel anytime" onClick={() => { setSelected('lifetime'); setFocusIdx(1); }} />
          <TierRow selected={selected === 'monthly'} focused={focusIdx === 2} label="€ 3.99/montly" sub="cancel anytime" onClick={() => { setSelected('monthly'); setFocusIdx(2); }} />
        </div>
      </div>

      {/* CTA + footer */}
      <div style={{ padding: '8px 32px 24px', flexShrink: 0 }}>
        <CtaButton
          label="Subscribe Now"
          focused={focusIdx === ctaIdx}
          onClick={() => {
            const map = {
              yearly: IAP_PRODUCTS.premium_yearly,
              lifetime: IAP_PRODUCTS.premium_lifetime,
              monthly: IAP_PRODUCTS.premium_monthly,
            };
            onPurchase?.(map[selectedTier]);
          }}
          testId="paywall-subscribe-cta"
        />
        <Footer onPurchase={onPurchase} />
      </div>
    </>
  );
}

/* ─────────────────── REMOVE ADS VARIANT ─────────────────── */

function RemoveAdsBody({
  focusIdx, closeIdx, ctaIdx, onClose, onPurchase,
}: {
  focusIdx: number; closeIdx: number; ctaIdx: number;
  onClose: () => void;
  onPurchase?: (productId: string) => void;
}) {
  return (
    <>
      {/* Hero — yellow gradient + brand mark (clean, no embedded UI) */}
      <div style={{
        position: 'relative', width: '100%', height: 280, flexShrink: 0,
        background: `
          radial-gradient(ellipse at 70% 35%, rgba(255, 199, 0, 0.85) 0%, transparent 55%),
          radial-gradient(ellipse at 25% 65%, rgba(232, 184, 0, 0.5) 0%, transparent 60%),
          linear-gradient(135deg, #6b4a00 0%, #B8860B 45%, #1a1100 100%)
        `,
        overflow: 'hidden',
      }}>
        {/* Decorative musical note motif */}
        <div style={{
          position: 'absolute', top: '50%', right: '-40px', transform: 'translateY(-50%)',
          width: 280, height: 280, opacity: 0.18,
          background: `url(${assetPath('images/path-8.svg')}) center/contain no-repeat`,
          filter: 'brightness(0) invert(0.1)',
        }} />
        {/* Equalizer bars */}
        <div style={{
          position: 'absolute', bottom: 60, left: 0, right: 0, height: 40,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: 6,
          opacity: 0.45,
        }}>
          {[16, 32, 22, 38, 26, 34, 18, 30, 28, 36, 14, 24, 20, 32].map((h, i) => (
            <div key={i} style={{ width: 3, height: h, background: '#1a1100', borderRadius: 2 }} />
          ))}
        </div>
        {/* Bottom fade into card body */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(14,14,14,0) 50%, rgba(14,14,14,0.85) 92%, #0E0E0E 100%)',
        }} />
        <button
          onClick={onClose}
          data-testid="paywall-close-btn"
          style={{
            position: 'absolute', top: 22, right: 22,
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(0,0,0,0.45)', border: 'none', backdropFilter: 'blur(6px)',
            color: '#fff', fontSize: 22, cursor: 'pointer',
            outline: focusIdx === closeIdx ? '3px solid #fff' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 3,
          }}
        >✕</button>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 32px 0', flex: 1 }}>
        {/* Logo + brand */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 22 }}>
          <BrandLogoTile />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>MegaRadio</div>
            <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: '#FFC700', lineHeight: 1.1 }}>Remove Ads</div>
          </div>
        </div>

        <div style={{ marginBottom: 26 }}>
          <div style={{ fontFamily: FONT, fontSize: 32, fontWeight: 700, color: '#fff', lineHeight: 1.15, marginBottom: 6 }}>
            Tired of seeing ads?
          </div>
          <div style={{ fontFamily: FONT, fontSize: 19, fontWeight: 400, color: 'rgba(255,255,255,0.65)' }}>
            Now remove all annoying ads
          </div>
        </div>

        <TierRow selected focused={focusIdx === 0} label="€ 29.99/yearly" sub="cancel anytime" onClick={() => {}} />
      </div>

      {/* CTA + footer */}
      <div style={{ padding: '20px 32px 24px', flexShrink: 0 }}>
        <CtaButton
          label="Remove Ads"
          focused={focusIdx === ctaIdx}
          onClick={() => onPurchase?.(IAP_PRODUCTS.remove_ads_yearly)}
          testId="paywall-remove-ads-cta"
        />
        <Footer onPurchase={onPurchase} />
      </div>
    </>
  );
}

/* ─────────────────── SHARED ATOMS ─────────────────── */

function BrandLogoTile() {
  return (
    <div style={{
      width: 76, height: 76, borderRadius: 18,
      background: 'linear-gradient(135deg, #FF4199 0%, #E91E63 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)', flexShrink: 0,
    }}>
      <img src={assetPath('images/path-8.svg')} alt="" style={{ width: 44, height: 44, filter: 'brightness(0) invert(1)' }} />
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
        width: '100%', height: 60, borderRadius: 30,
        border: focused ? '2px solid #FF4199' : '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(40,40,40,0.92)',
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16,
        cursor: 'pointer',
        boxShadow: focused ? '0 0 16px rgba(255,65,153,0.5)' : 'none',
        transition: 'border 0.15s, box-shadow 0.15s',
      }}
    >
      {/* Outline-style radio: pink outline always, filled center only when selected */}
      <span style={{
        width: 24, height: 24, borderRadius: '50%',
        border: '2.5px solid #FF4199',
        background: 'transparent',
        position: 'relative',
        flexShrink: 0,
      }}>
        {selected && (
          <span style={{
            position: 'absolute', inset: 4,
            borderRadius: '50%', background: '#FF4199',
          }} />
        )}
      </span>
      <span style={{ color: '#fff', fontFamily: FONT, fontSize: 20, fontWeight: 700 }}>{label},</span>
      <span style={{ color: 'rgba(255,255,255,0.55)', fontFamily: FONT, fontSize: 18, fontWeight: 400 }}>{sub}</span>
    </button>
  );
}

function CtaButton({ label, focused, onClick, testId }: {
  label: string; focused: boolean; onClick: () => void; testId: string;
}) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      style={{
        width: '100%', height: 70, borderRadius: 35, border: 'none',
        background: '#FF4199', color: '#fff',
        fontFamily: FONT, fontSize: 22, fontWeight: 700,
        cursor: 'pointer',
        boxShadow: focused ? '0 0 30px rgba(255,65,153,0.9)' : '0 8px 22px rgba(255,65,153,0.4)',
        outline: focused ? '3px solid #fff' : 'none',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
    >{label}</button>
  );
}

function Footer({ onPurchase }: { onPurchase?: (productId: string) => void }) {
  return (
    <div style={{
      marginTop: 18, display: 'flex', justifyContent: 'space-between',
      color: 'rgba(255,255,255,0.45)', fontFamily: FONT, fontSize: 15,
    }}>
      <button
        onClick={() => onPurchase?.('restore')}
        data-testid="paywall-restore"
        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 15 }}
      >Already paid?</button>
      <button
        onClick={() => window.open('https://themegaradio.com/terms', '_blank')}
        data-testid="paywall-terms"
        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 15 }}
      >Terms &amp; conditions</button>
    </div>
  );
}

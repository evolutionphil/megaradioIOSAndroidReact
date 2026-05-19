/**
 * UpdateBanner — soft (kapatılabilir) + forced (kapatılamaz) update prompt.
 * 1920×1080 TV canvas üzerinde tasarlandı; D-pad ile odaklanabilir.
 */
import { useEffect, useRef } from 'react';
import { useTvVersionCheck, dismissSoftUpdate } from '../hooks/useTvVersionCheck';

export function UpdateBanner() {
  const state = useTvVersionCheck();
  const primaryBtnRef = useRef<HTMLButtonElement>(null);

  // Force-update modal açılınca primary butona odaklan
  useEffect(() => {
    if (state.kind === 'forced' && primaryBtnRef.current) {
      primaryBtnRef.current.focus();
    }
  }, [state.kind]);

  if (state.kind === 'none') return null;

  // Forced = full-screen blocking modal
  if (state.kind === 'forced') {
    return (
      <div
        data-testid="update-banner-forced"
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(14, 14, 14, 0.92)',
          backdropFilter: 'blur(24px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div style={{
          width: 720, padding: '48px 56px', borderRadius: 28,
          background: 'linear-gradient(160deg, rgba(40,20,32,0.95) 0%, rgba(20,12,18,0.95) 100%)',
          border: '1px solid rgba(235, 79, 159, 0.32)',
          boxShadow: '0 24px 64px rgba(235, 79, 159, 0.25)',
          color: '#fff',
        }}>
          <div style={{
            display: 'inline-block', padding: '6px 14px', borderRadius: 999,
            background: 'rgba(235, 79, 159, 0.18)', color: '#EB4F9F',
            fontSize: 14, fontWeight: 600, letterSpacing: 0.5, marginBottom: 20,
          }}>
            ZORUNLU GÜNCELLEME
          </div>
          <h2 style={{ fontSize: 36, fontWeight: 700, margin: '0 0 12px', lineHeight: 1.2 }}>
            Devam etmek için MegaRadio'yu güncelleyin
          </h2>
          <p style={{ fontSize: 18, lineHeight: 1.5, color: 'rgba(255,255,255,0.78)', margin: '0 0 28px' }}>
            Yeni sürüm <strong style={{ color: '#fff' }}>{state.latest}</strong> ile önemli iyileştirmeler ve güvenlik düzeltmeleri geldi. Lütfen mağazadan güncellemeyi yükleyin.
          </p>
          {state.notes && (
            <div style={{
              padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.04)',
              fontSize: 15, color: 'rgba(255,255,255,0.72)', margin: '0 0 24px',
            }}>
              {state.notes}
            </div>
          )}
          <button
            ref={primaryBtnRef}
            data-testid="update-banner-forced-store-btn"
            onClick={() => state.storeUrl && window.open(state.storeUrl, '_blank')}
            style={{
              padding: '16px 32px', borderRadius: 999, border: 'none',
              background: '#EB4F9F', color: '#fff',
              fontSize: 17, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(235, 79, 159, 0.4)',
              outline: 'none',
            }}
          >
            Mağazaya Git ve Güncelle
          </button>
        </div>
      </div>
    );
  }

  // Soft = bottom-right toast-style banner with dismiss
  return (
    <div
      data-testid="update-banner-soft"
      style={{
        position: 'fixed', right: 32, bottom: 32, zIndex: 9998,
        width: 480, padding: '24px 28px', borderRadius: 20,
        background: 'rgba(20, 14, 18, 0.92)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(235, 79, 159, 0.28)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
        color: '#fff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', background: '#EB4F9F',
          boxShadow: '0 0 12px rgba(235, 79, 159, 0.8)',
        }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#EB4F9F', letterSpacing: 0.4 }}>
          YENİ SÜRÜM MEVCUT
        </span>
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>
        MegaRadio {state.latest} yayında
      </h3>
      <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,0.7)', margin: '0 0 16px' }}>
        {state.notes || 'Mağazadan güncelleyerek yeni özelliklerden faydalanın.'}
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          data-testid="update-banner-soft-store-btn"
          onClick={() => state.storeUrl && window.open(state.storeUrl, '_blank')}
          style={{
            flex: 1, padding: '10px 16px', borderRadius: 999, border: 'none',
            background: '#EB4F9F', color: '#fff',
            fontSize: 14, fontWeight: 700, cursor: 'pointer', outline: 'none',
          }}
        >
          Mağazaya Git
        </button>
        <button
          data-testid="update-banner-soft-dismiss-btn"
          onClick={() => { dismissSoftUpdate(); window.location.reload(); }}
          style={{
            padding: '10px 16px', borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.16)', background: 'transparent',
            color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', outline: 'none',
          }}
        >
          Sonra
        </button>
      </div>
    </div>
  );
}

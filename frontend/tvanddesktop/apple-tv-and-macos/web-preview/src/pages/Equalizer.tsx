// Equalizer page — 10-band EQ with presets
// Uses Web Audio API (AudioContext + BiquadFilterNodes) so it runs on every target:
// Apple TV (WKWebView), Android TV (WebView), Desktop (Electron), Tizen, webOS.
// The audio graph taps into the existing <audio> element created by tv-audio-player.js.

import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';

const BANDS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;

type Preset = {
  id: string;
  name: string;
  gains: number[];  // 10 values, -12..+12 dB
};

const PRESETS: Preset[] = [
  { id: 'flat', name: 'Flat', gains: [0,0,0,0,0,0,0,0,0,0] },
  { id: 'rock', name: 'Rock', gains: [5, 4, 3, 1, -1, -1, 1, 3, 4, 5] },
  { id: 'pop', name: 'Pop', gains: [-1, 2, 4, 5, 3, 1, -1, -1, 1, 2] },
  { id: 'jazz', name: 'Jazz', gains: [3, 2, 1, 2, -1, -1, 0, 1, 2, 3] },
  { id: 'classical', name: 'Classical', gains: [4, 3, 2, 1, -1, -1, -1, 1, 2, 4] },
  { id: 'dance', name: 'Dance', gains: [5, 6, 4, 0, -1, -2, 0, 4, 5, 5] },
  { id: 'bass', name: 'Bass Boost', gains: [7, 6, 5, 3, 1, 0, 0, 0, 0, 0] },
  { id: 'treble', name: 'Treble Boost', gains: [0, 0, 0, 0, 0, 1, 3, 5, 6, 7] },
  { id: 'vocal', name: 'Vocal', gains: [-2, -2, -1, 1, 3, 4, 3, 1, -1, -2] },
  { id: 'news', name: 'News / Talk', gains: [-4, -3, -2, 2, 4, 4, 3, 1, 0, -2] },
];

const EQ_KEY = 'eq_state_v1';

function loadState(): { presetId: string; gains: number[] } {
  try {
    const raw = localStorage.getItem(EQ_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { presetId: 'flat', gains: [0,0,0,0,0,0,0,0,0,0] };
}

// Global audio graph — singleton across the SPA
let audioCtx: AudioContext | null = null;
let filters: BiquadFilterNode[] = [];
let sourceConnected = false;

function ensureGraph(): BiquadFilterNode[] {
  if (filters.length) return filters;
  const w = window as any;
  audioCtx = new (w.AudioContext || w.webkitAudioContext)();
  filters = BANDS.map((freq, i) => {
    const f = audioCtx!.createBiquadFilter();
    f.type = i === 0 ? 'lowshelf' : i === BANDS.length - 1 ? 'highshelf' : 'peaking';
    f.frequency.value = freq;
    f.Q.value = 1.0;
    f.gain.value = 0;
    return f;
  });
  // Chain
  filters.forEach((f, i) => { if (i > 0) filters[i - 1].connect(f); });
  filters[filters.length - 1].connect(audioCtx!.destination);
  return filters;
}

function connectToAudioElement() {
  if (sourceConnected) return;
  const el = document.querySelector<HTMLAudioElement>('audio');
  if (!el || !audioCtx) return;
  try {
    const src = audioCtx.createMediaElementSource(el);
    src.connect(filters[0]);
    sourceConnected = true;
  } catch (e) {
    // MediaElementSource already created — ignore
  }
}

function applyGains(gains: number[]) {
  ensureGraph();
  connectToAudioElement();
  filters.forEach((f, i) => { f.gain.value = gains[i] ?? 0; });
}

export function Equalizer() {
  const [state, setState] = useState(loadState);
  const activePreset = useMemo(() => PRESETS.find(p => p.id === state.presetId), [state.presetId]);

  useEffect(() => {
    applyGains(state.gains);
    localStorage.setItem(EQ_KEY, JSON.stringify(state));
  }, [state]);

  const onSelectPreset = (p: Preset) => {
    setState({ presetId: p.id, gains: [...p.gains] });
  };

  const onBandChange = (bandIdx: number, value: number) => {
    const gains = [...state.gains];
    gains[bandIdx] = value;
    setState({ presetId: 'custom', gains });
  };

  return (
    <div style={{
      width: 1920, height: 1080, background: '#0E0E0E', color: '#fff',
      fontFamily: "'Ubuntu', sans-serif", position: 'relative', overflow: 'hidden',
    }}
      data-testid="equalizer-page"
    >
      <Sidebar activePage="settings" />

      <div style={{ paddingLeft: 150, paddingTop: 60, display: 'flex', gap: 40, height: 'calc(100% - 60px)' }}>
        {/* Left: presets */}
        <div style={{ width: 360 }}>
          <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 28 }}>Equalizer</div>
          <div style={{ fontSize: 18, opacity: 0.7, marginBottom: 20 }}>Presets</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 720, overflowY: 'auto' }}>
            {PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => onSelectPreset(p)}
                data-testid={`eq-preset-${p.id}`}
                style={{
                  height: 56, borderRadius: 28, padding: '0 24px',
                  textAlign: 'left',
                  background: activePreset?.id === p.id ? 'rgba(255,65,153,0.2)' : 'rgba(40,40,40,0.9)',
                  border: activePreset?.id === p.id ? '2px solid #FF4199' : '1px solid rgba(255,255,255,0.08)',
                  color: '#fff', fontSize: 20, fontWeight: 500, cursor: 'pointer',
                  display: 'flex', alignItems: 'center',
                }}
              >
                <span style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: activePreset?.id === p.id ? '#FF4199' : 'transparent',
                  border: '2px solid #FF4199',
                  marginRight: 14,
                  boxShadow: activePreset?.id === p.id ? 'inset 0 0 0 4px #0E0E0E, 0 0 0 2px #FF4199' : 'none',
                }} />
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Right: 10 sliders */}
        <div style={{ flex: 1, background: 'rgba(20,20,20,0.6)', borderRadius: 24, padding: 40 }}>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>10-Band EQ</div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', justifyContent: 'space-between', height: 440 }}>
            {BANDS.map((freq, idx) => (
              <div key={freq} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flex: 1 }}>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
                  {state.gains[idx] > 0 ? '+' : ''}{state.gains[idx]?.toFixed(0) || 0}
                </div>
                <input
                  type="range"
                  min={-12} max={12} step={1}
                  value={state.gains[idx] || 0}
                  onChange={e => onBandChange(idx, parseInt(e.target.value, 10))}
                  data-testid={`eq-band-${freq}`}
                  style={{
                    writingMode: 'vertical-lr' as any,
                    WebkitAppearance: 'slider-vertical',
                    width: 8, height: 320, accentColor: '#FF4199',
                  } as any}
                />
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
                  {freq >= 1000 ? `${freq / 1000}k` : freq}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 32, display: 'flex', gap: 16 }}>
            <button
              onClick={() => onSelectPreset(PRESETS[0])}
              data-testid="eq-reset-btn"
              style={{
                height: 52, padding: '0 32px', borderRadius: 26,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', fontSize: 18, cursor: 'pointer',
              }}
            >Reset to Flat</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Equalizer;

import { useEffect, useState } from "react";

/**
 * Tiny on-screen overlay showing the current TV focus state.
 * Enable via `?debug=1` in URL OR by setting `window.__tvDebug = true`.
 *
 * The overlay reads from `window.__tvFocusDebug` which is updated by every
 * page's customHandleNavigation / setFocusIndex hook (see useFocusManager.ts).
 *
 * Refreshes 5x/sec — cheap enough not to affect TV perf.
 */
export const FocusDebugOverlay = (): JSX.Element | null => {
  const [tick, setTick] = useState(0);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      const w = window as any;
      // Enable if URL has ?debug=1 OR explicit flag set.
      const params = new URLSearchParams((window.location.hash.split('?')[1]) || window.location.search);
      if (params.get('debug') === '1' || w.__tvDebug === true) {
        setEnabled(true);
      }
    } catch (e) { /* noop */ }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setTick((n) => n + 1), 200);
    return () => clearInterval(id);
  }, [enabled]);

  if (!enabled) return null;

  const dbg = (window as any).__tvFocusDebug || {};
  const focused = document.activeElement as HTMLElement | null;
  const focusedTid = focused?.getAttribute?.('data-testid') || focused?.tagName || 'none';
  const route = (window.location.hash || '#/').replace(/^#/, '') || '/';

  return (
    <div
      data-testid="focus-debug-overlay"
      style={{
        position: 'fixed',
        top: 8,
        right: 8,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.85)',
        color: '#0f0',
        padding: '8px 12px',
        fontFamily: 'monospace',
        fontSize: 13,
        lineHeight: 1.4,
        borderRadius: 6,
        border: '1px solid #0f0',
        pointerEvents: 'none',
        maxWidth: 380,
        whiteSpace: 'pre',
        textShadow: '0 0 4px #0f0',
      }}
    >
      {`route   : ${route}\n` +
        `index   : ${dbg.focusIndex ?? '?'}\n` +
        `page    : ${dbg.page ?? '?'}\n` +
        `flags   : ${dbg.flags ? JSON.stringify(dbg.flags) : '{}'}\n` +
        `domFocus: ${focusedTid}\n` +
        `tick    : ${tick}`}
    </div>
  );
};

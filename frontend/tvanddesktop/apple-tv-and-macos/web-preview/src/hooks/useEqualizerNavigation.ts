import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useHelp } from '@/contexts/HelpContext';
import { usePageKeyHandler } from '@/contexts/FocusRouterContext';

type Zone = 'sidebar' | 'preset' | 'band' | 'reset';
const sideIds = ['discover', 'genres', 'search', 'favorites', 'country', 'settings', 'help'];

export function useEqualizerNavigation(presetIds: string[], bands: readonly number[], adjust: (index: number, delta: number) => void) {
  const [target, setTarget] = useState<{ zone: Zone; index: number }>({ zone: 'preset', index: 0 });
  const [, navigate] = useLocation();
  const { helpOpen, closeHelp } = useHelp();
  const focus = useCallback((zone: Zone, index = 0) => {
    setTarget(old => old.zone === zone && old.index === index ? old : { zone, index });
  }, []);
  const id = target.zone === 'sidebar' ? (target.index === 6 ? 'button-help' : `sidebar-link-${sideIds[target.index]}`)
    : target.zone === 'preset' ? `eq-preset-${presetIds[target.index]}`
    : target.zone === 'band' ? `eq-band-${bands[target.index]}` : 'eq-reset-btn';
  useEffect(() => { document.querySelector<HTMLElement>(`[data-testid="${id}"]`)?.focus({ preventScroll: true }); }, [id]);

  usePageKeyHandler('/equalizer', e => {
    if (e.defaultPrevented) return;
    const key = e.key || ({ 37: 'ArrowLeft', 38: 'ArrowUp', 39: 'ArrowRight', 40: 'ArrowDown', 13: 'Enter' } as Record<number, string>)[e.keyCode];
    const back = key === 'Escape' || e.keyCode === 461 || e.keyCode === 10009;
    if (helpOpen) { if (back || key === 'Enter') { e.preventDefault(); closeHelp(); } return; }
    if (back) { e.preventDefault(); navigate('/settings'); return; }
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(key)) return;
    e.preventDefault();
    const { zone, index } = target;
    if (key === 'Enter') {
      if (zone === 'band') focus('reset');
      else document.querySelector<HTMLElement>(`[data-testid="${id}"]`)?.click();
    } else if (zone === 'sidebar') {
      if (key === 'ArrowRight') focus('preset');
      if (key === 'ArrowUp') focus('sidebar', Math.max(0, index - 1));
      if (key === 'ArrowDown') focus('sidebar', Math.min(6, index + 1));
    } else if (zone === 'preset') {
      if (key === 'ArrowLeft') focus('sidebar', 5);
      if (key === 'ArrowRight') focus('band');
      if (key === 'ArrowUp') focus('preset', Math.max(0, index - 1));
      if (key === 'ArrowDown') focus('preset', Math.min(presetIds.length - 1, index + 1));
    } else if (zone === 'band') {
      if (key === 'ArrowUp' || key === 'ArrowDown') adjust(index, key === 'ArrowUp' ? 1 : -1);
      if (key === 'ArrowLeft') index ? focus('band', index - 1) : focus('preset');
      if (key === 'ArrowRight') index < bands.length - 1 ? focus('band', index + 1) : focus('reset');
    } else {
      if (key === 'ArrowUp') focus('band', bands.length - 1);
      if (key === 'ArrowLeft') focus('preset', presetIds.length - 1);
    }
  });
  return { focus, isFocused: (zone: Zone, index = 0) => target.zone === zone && target.index === index };
}
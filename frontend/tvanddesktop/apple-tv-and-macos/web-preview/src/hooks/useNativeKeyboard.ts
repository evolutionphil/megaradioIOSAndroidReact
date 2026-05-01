import { useEffect } from "react";

/**
 * Global physical-keyboard capture for desktop (Electron / web). Lets the user
 * start typing on Mac / Windows / Linux without having to click into a field
 * first — the visible query text updates live. D-pad / arrow / Enter keys are
 * NOT consumed here; the spatial navigation engine keeps receiving them so
 * on-screen keyboard focus still works as intended.
 *
 * Usage:
 *   useNativeKeyboard({
 *     onChar: (c) => setQ(q => q + c),
 *     onBackspace: () => setQ(q => q.slice(0, -1)),
 *     onEscape: onClose,               // optional
 *     enabled: isOpen && !dropdownOpen,
 *   });
 */
interface Opts {
  onChar: (ch: string) => void;
  onBackspace?: () => void;
  onEscape?: () => void;
  onEnter?: () => void;
  enabled?: boolean;
  /** Only allow a-z0-9 when true (mimic mobile Search); default: all printable. */
  alphanumericOnly?: boolean;
  /** Register in capture phase so we run before any bubbling D-pad listener
      that calls stopPropagation() on every keydown. */
  capture?: boolean;
}

export function useNativeKeyboard({
  onChar,
  onBackspace,
  onEscape,
  onEnter,
  enabled = true,
  alphanumericOnly = false,
  capture = false,
}: Opts) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      // Don't fight with D-pad or native inputs (text fields in shadcn etc.)
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const k = e.key;
      if (k === "Backspace") {
        if (onBackspace) {
          e.preventDefault();
          onBackspace();
        }
        return;
      }
      if (k === "Escape") {
        if (onEscape) {
          e.preventDefault();
          onEscape();
        }
        return;
      }
      if (k === "Enter") {
        if (onEnter) {
          e.preventDefault();
          onEnter();
        }
        return;
      }
      // Arrow keys / Tab / function keys are handled by the D-pad engine.
      if (k.length !== 1) return;

      if (alphanumericOnly) {
        if (/^[a-zA-Z0-9 ]$/.test(k)) {
          e.preventDefault();
          onChar(k.toLowerCase());
        }
        return;
      }

      // Allow any printable character (lets non-Latin layouts work too).
      if (/[^\u0000-\u001F]/.test(k)) {
        e.preventDefault();
        onChar(k);
      }
    };

    window.addEventListener("keydown", handler, capture);
    return () => window.removeEventListener("keydown", handler, capture);
  }, [enabled, alphanumericOnly, capture, onChar, onBackspace, onEscape, onEnter]);
}

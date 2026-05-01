// Native shell bridge — pushes "Continue Listening" updates from the web
// layer to the surrounding Android TV / Apple TV / Electron host so they can
// publish home-screen rails (Top Shelf on tvOS, Recommendations Channel on
// Android TV). On platforms without a native shell (browser dev preview,
// Tizen, webOS) the call silently no-ops.
//
// Usage:
//   nativeBridge.postContinueListening([
//     { id, name, genre, streamUrl, iconUrl, description },
//     …
//   ]);

export interface BridgeStation {
  id: string;
  name: string;
  genre?: string;
  streamUrl: string;
  iconUrl: string;
  description?: string;
}

declare global {
  interface Window {
    MegaRadioBridge?: {
      onContinueListening?: (json: string) => void;
    };
    webkit?: {
      messageHandlers?: {
        continueListening?: { postMessage: (msg: unknown) => void };
      };
    };
    megaRadioNative?: {
      postContinueListening?: (list: BridgeStation[]) => void;
    };
  }
}

const debug = (...a: unknown[]) => {
  if (typeof window !== "undefined" && (window as any).__MR_DEBUG__) console.log("[bridge]", ...a);
};

export const nativeBridge = {
  /** Push the latest top-N stations to whichever native host is available. */
  postContinueListening(list: BridgeStation[]) {
    if (typeof window === "undefined") return;
    const top = list.slice(0, 10);
    let delivered = false;

    // ── Android TV / Fire TV — JavaScriptInterface set up in MainActivity ──
    try {
      if (window.MegaRadioBridge?.onContinueListening) {
        window.MegaRadioBridge.onContinueListening(JSON.stringify(top));
        delivered = true;
        debug("→ Android JS interface", top.length);
      }
    } catch (e) { debug("android bridge failed", e); }

    // ── Apple TV / iOS WKWebView — WKScriptMessageHandler ─────────────────
    try {
      const h = window.webkit?.messageHandlers?.continueListening;
      if (h && typeof h.postMessage === "function") {
        h.postMessage(top);
        delivered = true;
        debug("→ WKScriptMessage", top.length);
      }
    } catch (e) { debug("ios bridge failed", e); }

    // ── Electron / desktop — preload-injected wrapper ─────────────────────
    try {
      if (window.megaRadioNative?.postContinueListening) {
        window.megaRadioNative.postContinueListening(top);
        delivered = true;
        debug("→ Electron preload", top.length);
      }
    } catch (e) { debug("electron bridge failed", e); }

    if (!delivered) debug("no native host detected (browser/web preview)");
  },
};

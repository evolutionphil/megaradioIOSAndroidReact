import { detectPlatform } from "./platform";

/**
 * Native IAP bridge for Apple TV (StoreKit) and Android TV (Google Play Billing).
 *
 * The bridge is a thin promise-based RPC over the WKWebView / WebView's
 * built-in messaging primitive:
 *   - Apple TV: window.webkit.messageHandlers.megaradio.postMessage({ id, fn, args })
 *               + window.MegaRadioBridge.__resolve(id, payload)  ← Swift calls back
 *   - Android TV: window.MegaRadioNative.invoke(JSON-string)
 *                 + window.MegaRadioBridge.__resolve(id, payload) ← Kotlin calls back
 *
 * Both platforms use the SAME product IDs already configured for the
 * mobile React Native app (`/app/frontend/src/services/iapService.ts`):
 *   - megaradio_premium_monthly1
 *   - megaradio_premium_yearly
 *   - megaradio_premium_lifetime
 *   - megaradio_remove_ads_yearly1
 *
 * After a successful purchase the native shell calls
 * `POST /api/user/subscription` with the receipt (iOS) or purchaseToken
 * (Android). The backend then validates with Apple/Google and unlocks
 * premium across all the user's devices. Same flow as the mobile app.
 */

export interface IapProduct {
  productId: string;
  title: string;
  description: string;
  localizedPrice: string;
  currency: string;
  /** "subscription" | "one-time" (lifetime) */
  type: "subscription" | "one-time";
  /** Optional billing period for subs: "P1M" | "P1Y" */
  billingPeriod?: string;
}

export interface IapPurchaseResult {
  ok: boolean;
  productId?: string;
  /** New active plan reported by the backend after receipt validation. */
  plan?: "premium_monthly" | "premium_yearly" | "premium_lifetime" | "remove_ads";
  validUntil?: string;
  error?: string;
}

interface PendingCall {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

const pending = new Map<string, PendingCall>();
let nextId = 1;

// One-time wiring: the native shell calls this when it has a reply.
(function installResolver() {
  if (typeof window === "undefined") return;
  const existing = (window as any).MegaRadioBridge || {};
  if (existing.__resolveIap) return;
  existing.__resolveIap = (id: string, payload: any) => {
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    if (payload && payload.error) p.reject(new Error(String(payload.error)));
    else p.resolve(payload);
  };
  (window as any).MegaRadioBridge = existing;
})();

function call<T = any>(fn: string, args: Record<string, any> = {}, timeoutMs = 30000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = "rpc-" + (nextId++) + "-" + Date.now().toString(36);
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      pending.delete(id);
      reject(new Error("Native IAP bridge timeout: " + fn));
    }, timeoutMs);

    pending.set(id, {
      resolve: (v) => { if (settled) return; settled = true; clearTimeout(timer); resolve(v); },
      reject: (e) => { if (settled) return; settled = true; clearTimeout(timer); reject(e); },
    });

    const payload = { id, fn, args };

    try {
      const p = detectPlatform();
      if (p === "appletv") {
        const mh = (window as any).webkit?.messageHandlers?.megaradio;
        if (!mh) throw new Error("Apple TV bridge missing");
        mh.postMessage(payload);
      } else if (p === "androidtv") {
        const nat = (window as any).MegaRadioNative;
        if (!nat || typeof nat.invoke !== "function") {
          throw new Error("Android TV bridge missing");
        }
        nat.invoke(JSON.stringify(payload));
      } else {
        throw new Error("No native IAP on platform: " + p);
      }
    } catch (e: any) {
      pending.delete(id);
      clearTimeout(timer);
      settled = true;
      reject(e);
    }
  });
}

export const nativeIap = {
  /** Fetches the localized product list from StoreKit / Play Billing. */
  getProducts: (): Promise<IapProduct[]> => call("getProducts"),

  /**
   * Triggers the native purchase sheet for the given product ID.
   * Resolves AFTER the backend has confirmed the receipt is valid and
   * the user's subscription record has been updated.
   */
  purchaseProduct: (productId: string): Promise<IapPurchaseResult> =>
    call("purchaseProduct", { productId }, 120000), // up to 2 min for user interaction

  /** Re-validates existing entitlements with the store (e.g. user re-installs). */
  restorePurchases: (): Promise<IapPurchaseResult> => call("restorePurchases"),

  /**
   * Opens the native subscription management screen
   * (Settings → Subscriptions on tvOS, Play Store account on Android).
   */
  manageSubscriptions: (): Promise<void> => call("manageSubscriptions"),
};

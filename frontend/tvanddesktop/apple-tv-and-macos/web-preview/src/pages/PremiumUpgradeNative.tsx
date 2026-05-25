import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useLocalization } from "@/contexts/LocalizationContext";
import { usePageKeyHandler } from "@/contexts/FocusRouterContext";
import { useAuth } from "@/contexts/AuthContext";
import { assetPath } from "@/lib/assetPath";
import { getFocusClasses } from "@/hooks/useFocusManager";
import { nativeIap, IapProduct, IapPurchaseResult } from "@/lib/nativeIap";
import { detectPlatform } from "@/lib/platform";

/**
 * Native IAP premium upgrade screen for Apple TV (StoreKit) and Android TV
 * (Google Play Billing). Replaces the QR-code account-linking flow on
 * platforms that allow in-app purchases.
 *
 * UX:
 *   - On mount → asks the native shell for the product catalog
 *   - Renders a "pick your plan" card grid (Monthly / Yearly / Lifetime)
 *   - User selects → native bridge opens the StoreKit / Play Billing sheet
 *   - On success → toasts "You're Premium!" and routes back to Discover
 *
 * The native shells handle receipt validation against the backend
 * (POST /api/user/subscription) before resolving the purchase promise,
 * so by the time we receive a "success" result, the user's account is
 * already upgraded on the server.
 */

const PLAN_ORDER = [
  "megaradio_premium_yearly",
  "megaradio_premium_monthly1",
  "megaradio_premium_lifetime",
  "megaradio_remove_ads_yearly1",
];

const PLAN_BADGE: Record<string, string | null> = {
  megaradio_premium_yearly: "BEST VALUE",
  megaradio_premium_lifetime: "ONE-TIME",
  megaradio_premium_monthly1: null,
  megaradio_remove_ads_yearly1: null,
};

export function PremiumUpgradeNative(): JSX.Element {
  const { t } = useLocalization();
  const [, setLocation] = useLocation();
  const auth = useAuth();
  const platform = detectPlatform();
  const isAppleTv = platform === "appletv";

  const [products, setProducts] = useState<IapProduct[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [activated, setActivated] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0); // 0..N-1 = product cards, N = Restore, N+1 = Cancel

  // Pre-sorted products by intended display order
  const sortedProducts = [...products].sort((a, b) => {
    const ai = PLAN_ORDER.indexOf(a.productId);
    const bi = PLAN_ORDER.indexOf(b.productId);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const totalItems = sortedProducts.length + 2; // + Restore + Cancel
  const restoreIndex = sortedProducts.length;
  const cancelIndex = sortedProducts.length + 1;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    nativeIap
      .getProducts()
      .then((items) => {
        if (cancelled) return;
        setProducts(Array.isArray(items) ? items : []);
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("[PremiumUpgradeNative] getProducts failed:", err);
        setLoadError(err?.message || "Failed to load products");
        setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  function handlePurchase(productId: string) {
    if (purchasing) return;
    setPurchasing(true);
    nativeIap
      .purchaseProduct(productId)
      .then((res: IapPurchaseResult) => {
        if (res && res.ok) {
          setActivated(true);
          // Refresh auth so the Discover page shows the PREMIUM badge.
          // The native shell already posted the purchase to the backend,
          // so a token verify will pull the new subscription record.
          setTimeout(() => setLocation("/discover-no-user"), 2000);
        } else {
          setPurchasing(false);
          setLoadError(res?.error || "Purchase failed");
        }
      })
      .catch((err) => {
        setPurchasing(false);
        // user-cancelled is the most common case; show a friendly message.
        if (String(err?.message || "").toLowerCase().includes("cancel")) {
          return; // silent — they backed out of the sheet
        }
        setLoadError(err?.message || "Purchase failed");
      });
  }

  function handleRestore() {
    if (purchasing) return;
    setPurchasing(true);
    nativeIap
      .restorePurchases()
      .then((res) => {
        setPurchasing(false);
        if (res && res.ok) {
          setActivated(true);
          setTimeout(() => setLocation("/discover-no-user"), 2000);
        } else {
          setLoadError(res?.error || (t("premium_no_purchases_found") || "No previous purchases found"));
        }
      })
      .catch((err) => {
        setPurchasing(false);
        setLoadError(err?.message || "Restore failed");
      });
  }

  usePageKeyHandler("/premium-upgrade", (e: KeyboardEvent) => {
    if (purchasing || activated) return;
    const kc = e.keyCode || 0;
    if (kc === 37) { // LEFT
      e.preventDefault();
      setFocusIndex((i) => Math.max(0, i - 1));
    } else if (kc === 39) { // RIGHT
      e.preventDefault();
      setFocusIndex((i) => Math.min(totalItems - 1, i + 1));
    } else if (kc === 38) { // UP — move to product row from buttons
      e.preventDefault();
      if (focusIndex >= restoreIndex && sortedProducts.length > 0) setFocusIndex(0);
    } else if (kc === 40) { // DOWN — move down to Restore
      e.preventDefault();
      if (focusIndex < restoreIndex) setFocusIndex(restoreIndex);
    } else if (kc === 13) { // ENTER
      e.preventDefault();
      if (focusIndex === cancelIndex) {
        setLocation("/discover-no-user");
      } else if (focusIndex === restoreIndex) {
        handleRestore();
      } else {
        const p = sortedProducts[focusIndex];
        if (p) handlePurchase(p.productId);
      }
    } else if (kc === 10009 || kc === 461 || kc === 8) { // BACK
      e.preventDefault();
      setLocation("/discover-no-user");
    }
  });

  return (
    <div
      data-testid="page-premium-upgrade-native"
      style={{
        position: "relative",
        width: "1920px",
        height: "1080px",
        backgroundColor: "#0e0e0e",
        overflow: "hidden",
        color: "white",
        fontFamily: "'Ubuntu', Helvetica",
      }}
    >
      {/* Logo */}
      <div style={{ position: "absolute", left: 96, top: 80, display: "flex", alignItems: "center", gap: 12 }}>
        <img src={assetPath("images/path-8.svg")} alt="" style={{ width: 60, height: 60 }} />
        <span style={{ fontSize: 32 }}>
          <span style={{ fontWeight: "bold" }}>mega</span>radio
        </span>
      </div>

      {/* Title */}
      <div style={{ position: "absolute", left: 96, right: 96, top: 200, textAlign: "center" }}>
        <p style={{ fontSize: 18, color: "#ff4199", letterSpacing: 2, fontWeight: "bold", margin: 0 }}>
          MEGARADIO PREMIUM
        </p>
        <h1 style={{ fontSize: 54, fontWeight: "bold", margin: "16px 0 0 0", lineHeight: 1.1 }}>
          {t("premium_pick_plan") || "Pick the plan that's right for you"}
        </h1>
        <p style={{ fontSize: 22, color: "rgba(255,255,255,0.65)", marginTop: 16 }}>
          {isAppleTv
            ? (t("premium_billed_via_apple") || "Billed securely through your Apple ID. Cancel anytime in tvOS Settings.")
            : (t("premium_billed_via_google") || "Billed through Google Play. Cancel anytime in your Play account.")}
        </p>
      </div>

      {/* Body — products / loading / error / activated */}
      <div style={{ position: "absolute", left: 96, right: 96, top: 420 }}>
        {activated ? (
          <div style={{ textAlign: "center" }} data-testid="premium-activated-native">
            <div style={{
              width: 96, height: 96, borderRadius: "50%",
              backgroundColor: "rgba(46,204,113,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto",
            }}>
              <svg width={56} height={56} viewBox="0 0 24 24" fill="none">
                <circle cx={12} cy={12} r={10} stroke="#2ecc71" strokeWidth={2} />
                <path d="M7 12.5l3 3 7-7" stroke="#2ecc71" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 style={{ fontSize: 36, fontWeight: "bold", marginTop: 24 }}>
              {t("premium_activated") || "You're Premium!"}
            </h2>
            <p style={{ fontSize: 20, color: "rgba(255,255,255,0.7)", marginTop: 16 }}>
              {t("premium_redirecting") || "Returning to your radio..."}
            </p>
          </div>
        ) : isLoading ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <div style={{
              width: 60, height: 60, margin: "0 auto",
              border: "4px solid rgba(255,65,153,0.3)",
              borderTopColor: "#ff4199",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }} />
            <p style={{ marginTop: 24, fontSize: 22, color: "rgba(255,255,255,0.7)" }}>
              {t("loading") || "Loading..."}
            </p>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: 32 }}>
            <p style={{ fontSize: 22, color: "#ff4199", fontWeight: "bold" }}>
              {loadError || (t("premium_no_products") || "Products unavailable. Please try again later.")}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 28, justifyContent: "center", flexWrap: "wrap" }}>
            {sortedProducts.map((p, idx) => {
              const focused = focusIndex === idx;
              const badge = PLAN_BADGE[p.productId];
              return (
                <div
                  key={p.productId}
                  data-testid={`product-card-${p.productId}`}
                  data-tv-focusable="true"
                  tabIndex={0}
                  className={getFocusClasses(focused)}
                  style={{
                    width: 380,
                    minHeight: 360,
                    padding: "32px 28px",
                    borderRadius: 20,
                    backgroundColor: focused ? "rgba(255,65,153,0.12)" : "rgba(255,255,255,0.06)",
                    border: focused ? "3px solid #ff4199" : "3px solid rgba(255,255,255,0.10)",
                    boxShadow: focused ? "0 0 30px rgba(255,65,153,0.45)" : "none",
                    transform: focused ? "scale(1.04)" : "none",
                    transition: "all 180ms ease-out",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                  }}
                >
                  {badge && (
                    <span style={{
                      position: "absolute", top: -14, right: 20,
                      background: "linear-gradient(135deg,#ff4199,#ff79c6)",
                      padding: "4px 12px", borderRadius: 12,
                      fontSize: 12, fontWeight: 800, letterSpacing: 1.2,
                    }}>{badge}</span>
                  )}
                  <h3 style={{ fontSize: 28, fontWeight: "bold", margin: 0 }}>{p.title}</h3>
                  <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", margin: "8px 0 24px 0", lineHeight: 1.4 }}>
                    {p.description}
                  </p>
                  <div style={{ marginTop: "auto" }}>
                    <p style={{ fontSize: 44, fontWeight: "bold", color: "#ff4199", margin: 0, lineHeight: 1 }}>
                      {p.localizedPrice}
                    </p>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 8 }}>
                      {p.type === "subscription"
                        ? (p.billingPeriod === "P1Y" ? (t("per_year") || "per year") : (t("per_month") || "per month"))
                        : (t("one_time_payment") || "one-time payment")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom: Restore + Cancel */}
      {!activated && (
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 64,
          display: "flex", justifyContent: "center", gap: 24,
        }}>
          <button
            onClick={handleRestore}
            data-testid="button-restore-purchases"
            data-tv-focusable="true"
            disabled={purchasing}
            style={{
              minWidth: 240, height: 64, borderRadius: 32,
              border: focusIndex === restoreIndex ? "3px solid #ff4199" : "3px solid rgba(255,255,255,0.18)",
              background: focusIndex === restoreIndex ? "rgba(255,65,153,0.18)" : "rgba(255,255,255,0.06)",
              boxShadow: focusIndex === restoreIndex ? "0 0 20px rgba(255,65,153,0.4)" : "none",
              color: "white", fontFamily: "inherit", fontSize: 20, fontWeight: 600,
              cursor: "pointer", opacity: purchasing ? 0.5 : 1,
            }}
          >
            {t("premium_restore_purchases") || "Restore Purchases"}
          </button>
          <button
            onClick={() => setLocation("/discover-no-user")}
            data-testid="button-premium-cancel"
            data-tv-focusable="true"
            style={{
              minWidth: 200, height: 64, borderRadius: 32,
              border: focusIndex === cancelIndex ? "3px solid #ff4199" : "3px solid rgba(255,255,255,0.18)",
              background: focusIndex === cancelIndex ? "rgba(255,65,153,0.18)" : "rgba(255,255,255,0.06)",
              boxShadow: focusIndex === cancelIndex ? "0 0 20px rgba(255,65,153,0.4)" : "none",
              color: "white", fontFamily: "inherit", fontSize: 20, fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {t("cancel") || "Cancel"}
          </button>
        </div>
      )}

      {purchasing && !activated && (
        <div style={{
          position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
          background: "rgba(14,14,14,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 10,
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 60, height: 60, margin: "0 auto",
              border: "4px solid rgba(255,65,153,0.3)",
              borderTopColor: "#ff4199",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }} />
            <p style={{ marginTop: 24, fontSize: 22 }}>
              {t("premium_processing") || "Processing..."}
            </p>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default PremiumUpgradeNative;

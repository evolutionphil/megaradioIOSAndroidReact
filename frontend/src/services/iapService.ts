import { Platform } from 'react-native';
import { usePremiumStore, PremiumPlan } from '../store/premiumStore';

// Product IDs - must match App Store Connect & Google Play Console
export const PRODUCT_IDS = {
  REMOVE_ADS_YEARLY: 'megaradio_remove_ads_yearly',
  PREMIUM_MONTHLY: 'megaradio_premium_monthly',
  PREMIUM_YEARLY: 'megaradio_premium_yearly',
  PREMIUM_LIFETIME: 'megaradio_premium_lifetime',
};

const ALL_SKUS = Object.values(PRODUCT_IDS);

// Map product ID → premium plan
const PRODUCT_TO_PLAN: Record<string, PremiumPlan> = {
  [PRODUCT_IDS.REMOVE_ADS_YEARLY]: 'remove_ads',
  [PRODUCT_IDS.PREMIUM_MONTHLY]: 'premium_monthly',
  [PRODUCT_IDS.PREMIUM_YEARLY]: 'premium_yearly',
  [PRODUCT_IDS.PREMIUM_LIFETIME]: 'premium_lifetime',
};

export interface IAPProduct {
  productId: string;
  title: string;
  description: string;
  localizedPrice: string;
  currency: string;
}

// Lazy-load react-native-iap to avoid crash on web
const getIAP = () => {
  if (Platform.OS === 'web') return null;
  try {
    return require('react-native-iap');
  } catch (e) {
    console.log('[IAP] react-native-iap not available:', e);
    return null;
  }
};

class IAPService {
  private isConnected = false;
  private products: IAPProduct[] = [];
  private purchaseUpdateSub: any = null;
  private purchaseErrorSub: any = null;
  private initialized = false;

  async initialize(): Promise<boolean> {
    if (this.initialized) return this.isConnected;
    if (Platform.OS === 'web') return false;

    const iap = getIAP();
    if (!iap) return false;

    try {
      console.log('[IAP] Initializing...');
      await iap.initConnection();
      this.isConnected = true;
      this.initialized = true;

      this.setupListeners(iap);
      await this.loadProducts(iap);
      await this.restorePurchases(iap);

      console.log('[IAP] Ready');
      return true;
    } catch (error: any) {
      console.error('[IAP] Init error:', error.message);
      return false;
    }
  }

  private setupListeners(iap: any): void {
    this.removeListeners();

    // Purchase success listener
    this.purchaseUpdateSub = iap.purchaseUpdatedListener(async (purchase: any) => {
      console.log('[IAP] Purchase updated:', purchase.productId || purchase.id);
      try {
        await this.handlePurchaseSuccess(purchase);
        await iap.finishTransaction({ purchase, isConsumable: false });
        console.log('[IAP] Transaction finished');
      } catch (err: any) {
        console.error('[IAP] Error handling purchase:', err.message);
      }
    });

    // Purchase error listener
    this.purchaseErrorSub = iap.purchaseErrorListener((error: any) => {
      if (error.code === 'user-cancelled') {
        console.log('[IAP] User cancelled');
      } else {
        console.error('[IAP] Purchase error:', error.code, error.message);
      }
    });
  }

  private removeListeners(): void {
    if (this.purchaseUpdateSub) {
      this.purchaseUpdateSub.remove();
      this.purchaseUpdateSub = null;
    }
    if (this.purchaseErrorSub) {
      this.purchaseErrorSub.remove();
      this.purchaseErrorSub = null;
    }
  }

  async loadProducts(iapModule?: any): Promise<IAPProduct[]> {
    const iap = iapModule || getIAP();
    if (!iap || !this.isConnected) return [];

    try {
      console.log('[IAP] Fetching products:', ALL_SKUS);
      const products = await iap.fetchProducts({ skus: ALL_SKUS });
      console.log('[IAP] Fetched', products.length, 'products');

      this.products = products.map((p: any) => ({
        productId: p.productId || p.id,
        title: p.title || p.displayName || p.productId || p.id,
        description: p.description || '',
        localizedPrice: p.localizedPrice || p.displayPrice || `${p.price} ${p.currency}`,
        currency: p.currency || 'EUR',
      }));

      return this.products;
    } catch (error: any) {
      console.error('[IAP] Load products error:', error.message);
      return [];
    }
  }

  getProducts(): IAPProduct[] {
    return this.products;
  }

  getProduct(productId: string): IAPProduct | undefined {
    return this.products.find((p) => p.productId === productId);
  }

  async purchaseSubscription(productId: string): Promise<boolean> {
    const iap = getIAP();
    if (!iap || !this.isConnected) return false;

    try {
      console.log('[IAP] Requesting purchase:', productId);

      if (Platform.OS === 'ios') {
        try { await iap.clearTransactionIOS(); } catch (e) { /* ignore */ }
      }

      // v14 API: requestPurchase with type 'subs'
      await iap.requestPurchase({
        request: Platform.OS === 'ios'
          ? { apple: { sku: productId } }
          : { google: { skus: [productId] } },
        type: 'subs',
      });

      return true;
    } catch (error: any) {
      if (error.code === 'user-cancelled') {
        console.log('[IAP] Cancelled by user');
        return false;
      }
      console.error('[IAP] Purchase error:', error.message);
      throw error;
    }
  }

  // For lifetime (non-consumable, one-time purchase)
  async purchaseProduct(productId: string): Promise<boolean> {
    const iap = getIAP();
    if (!iap || !this.isConnected) return false;

    try {
      console.log('[IAP] Requesting one-time purchase:', productId);

      if (Platform.OS === 'ios') {
        try { await iap.clearTransactionIOS(); } catch (e) { /* ignore */ }
      }

      await iap.requestPurchase({
        request: Platform.OS === 'ios'
          ? { apple: { sku: productId } }
          : { google: { skus: [productId] } },
        type: 'in-app',
      });

      return true;
    } catch (error: any) {
      if (error.code === 'user-cancelled') return false;
      throw error;
    }
  }

  private async handlePurchaseSuccess(purchase: any): Promise<void> {
    const productId = purchase.productId || purchase.id;
    const plan = PRODUCT_TO_PLAN[productId];
    if (!plan) {
      console.error('[IAP] Unknown product:', productId);
      return;
    }

    console.log('[IAP] Activating:', plan);

    let expiryDate: string | null = null;
    const now = Date.now();

    switch (plan) {
      case 'remove_ads':
        expiryDate = new Date(now + 365 * 86400000).toISOString();
        break;
      case 'premium_monthly':
        expiryDate = new Date(now + 30 * 86400000).toISOString();
        break;
      case 'premium_yearly':
        expiryDate = new Date(now + 365 * 86400000).toISOString();
        break;
      case 'premium_lifetime':
        expiryDate = null;
        break;
    }

    await usePremiumStore.getState().setPremiumStatus(plan, expiryDate);
    console.log('[IAP] Activated:', plan, expiryDate || 'LIFETIME');
  }

  async restorePurchases(iapModule?: any): Promise<boolean> {
    const iap = iapModule || getIAP();
    if (!iap || !this.isConnected) return false;

    try {
      console.log('[IAP] Restoring...');
      const purchases = await iap.getAvailablePurchases();
      console.log('[IAP] Found', purchases.length, 'purchases');

      if (!purchases.length) return false;

      let bestPlan: PremiumPlan = 'none';
      let bestExpiry: string | null = null;
      const ranks: Record<string, number> = {
        none: 0, remove_ads: 1, premium_monthly: 2, premium_yearly: 3, premium_lifetime: 4,
      };

      for (const p of purchases) {
        const pid = p.productId || p.id;
        const plan = PRODUCT_TO_PLAN[pid];
        if (!plan) continue;

        if ((ranks[plan] || 0) > (ranks[bestPlan] || 0)) {
          bestPlan = plan;
          if (plan === 'premium_lifetime') {
            bestExpiry = null;
          } else {
            const transDate = p.transactionDate ? new Date(Number(p.transactionDate)) : new Date();
            const dur = plan === 'premium_monthly' ? 30 * 86400000 : 365 * 86400000;
            bestExpiry = new Date(transDate.getTime() + dur).toISOString();
          }
        }

        try { await iap.finishTransaction({ purchase: p, isConsumable: false }); } catch (e) { /* ignore */ }
      }

      if (bestPlan !== 'none') {
        await usePremiumStore.getState().setPremiumStatus(bestPlan, bestExpiry);
        console.log('[IAP] Restored:', bestPlan);
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('[IAP] Restore error:', error.message);
      return false;
    }
  }

  async destroy(): Promise<void> {
    this.removeListeners();
    if (this.isConnected) {
      const iap = getIAP();
      try { if (iap) await iap.endConnection(); } catch (e) { /* ignore */ }
      this.isConnected = false;
      this.initialized = false;
    }
  }

  isAvailable(): boolean {
    return Platform.OS !== 'web' && this.isConnected;
  }
}

export const iapService = new IAPService();
export default iapService;

// Mac App Store In-App Purchase bridge
// Wraps Electron's built-in `inAppPurchase` module (macOS only) into IPC
// handlers consumed by preload.js. On Windows / Linux the same handlers
// gracefully reject so the renderer can fall back to Stripe / web checkout.
//
// Apple StoreKit flow:
//   1. Renderer calls window.megaRadioNative.purchase('megaradio_premium_yearly')
//   2. preload.js → ipcRenderer.invoke('mr-iap-purchase', productId)
//   3. Main process: inAppPurchase.purchaseProduct(productId) opens system sheet
//   4. transactions-updated event fires → we finish the transaction & forward
//      the receipt to the renderer via 'mr-iap-completed' DOM event
//
// Server-side receipt validation (recommended) should hit the user's backend
// with the receipt blob from `inAppPurchase.getReceiptURL()` so the premium
// flag is mirrored across devices. That step is left to the backend dev — the
// receipt URL is included in the completion payload.

const { inAppPurchase, app } = require('electron');
const fs = require('fs');

let mainWindowRef = null;
let listenerAttached = false;

function isMac() {
  return process.platform === 'darwin';
}

function attachTransactionListener() {
  if (listenerAttached || !isMac()) return;
  listenerAttached = true;

  inAppPurchase.on('transactions-updated', (_event, transactions) => {
    if (!Array.isArray(transactions)) return;
    transactions.forEach((tx) => {
      const productId = tx.payment?.productIdentifier;
      const state = tx.transactionState; // purchased | failed | restored | deferred | purchasing
      console.log('[IAP] tx', state, productId, tx.transactionIdentifier);

      if (state === 'purchased' || state === 'restored') {
        // Read the App Store receipt so backend can validate.
        let receiptB64 = null;
        try {
          const url = inAppPurchase.getReceiptURL();
          if (url && fs.existsSync(url.replace('file://', ''))) {
            receiptB64 = fs.readFileSync(url.replace('file://', '')).toString('base64');
          }
        } catch (e) {
          console.warn('[IAP] could not read receipt:', e?.message);
        }
        // Tell the renderer the user is now premium for this product.
        const channel = state === 'restored' ? 'mr-iap-restored' : 'mr-iap-completed';
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.webContents.send(channel, {
            productId,
            transactionId: tx.transactionIdentifier,
            originalTransactionId: tx.originalTransactionIdentifier,
            receipt: receiptB64,
            state,
          });
        }
        inAppPurchase.finishTransactionByDate(tx.transactionDate);
      } else if (state === 'failed') {
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.webContents.send('mr-iap-failed', {
            productId,
            error: tx.errorMessage || 'Purchase failed',
            errorCode: tx.errorCode,
          });
        }
        inAppPurchase.finishTransactionByDate(tx.transactionDate);
      }
    });
  });
}

function registerIpc(ipcMain, getMainWindow) {
  ipcMain.handle('mr-iap-purchase', async (_e, productId) => {
    if (!isMac()) {
      return { ok: false, reason: 'not-mac', message: 'StoreKit only available on macOS App Store builds.' };
    }
    if (!inAppPurchase.canMakePayments()) {
      return { ok: false, reason: 'cannot-pay', message: 'In-App Purchases are disabled on this device.' };
    }
    mainWindowRef = getMainWindow();
    attachTransactionListener();
    try {
      const ok = await inAppPurchase.purchaseProduct(productId, 1);
      return { ok, productId };
    } catch (err) {
      return { ok: false, reason: 'exception', message: String(err?.message || err) };
    }
  });

  ipcMain.handle('mr-iap-restore', async () => {
    if (!isMac()) return { ok: false, reason: 'not-mac' };
    mainWindowRef = getMainWindow();
    attachTransactionListener();
    try {
      // Apple will replay every previous purchase via transactions-updated.
      // (No public Electron API to trigger this directly — purchasing the same
      // product is treated as a restore by Apple when entitled.)
      // For Mac App Store apps the receipt itself proves entitlement, so the
      // simplest restore is to re-read the receipt file and forward it.
      const url = inAppPurchase.getReceiptURL();
      let receipt = null;
      if (url && fs.existsSync(url.replace('file://', ''))) {
        receipt = fs.readFileSync(url.replace('file://', '')).toString('base64');
      }
      if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.webContents.send('mr-iap-restored', { receipt });
      }
      return { ok: true, hasReceipt: !!receipt };
    } catch (err) {
      return { ok: false, reason: 'exception', message: String(err?.message || err) };
    }
  });

  ipcMain.handle('mr-iap-get-products', async (_e, ids) => {
    if (!isMac()) return [];
    try {
      const products = await inAppPurchase.getProducts(Array.isArray(ids) ? ids : []);
      return products;
    } catch (err) {
      console.warn('[IAP] getProducts failed:', err?.message);
      return [];
    }
  });
}

module.exports = { registerIpc };

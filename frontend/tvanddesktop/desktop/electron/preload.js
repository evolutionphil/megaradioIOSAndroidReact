// Preload — exposes minimal APIs to the renderer.
//   • megaRadioDesktop  → media-key shortcuts + platform info
//   • megaRadioNative   → in-app purchase bridge (StoreKit on Mac App Store)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('megaRadioDesktop', {
  onShortcut: (cb) => ipcRenderer.on('mr-shortcut', (_e, key) => cb(key)),
  platform: process.platform,
  isDesktop: true,
});

// Native IAP bridge — matches the API expected by PaywallContext.tsx
//   bridge.purchase(productId)         → main process invokes StoreKit
//   bridge.restorePurchases()          → main process restores past purchases
//   bridge.canMakePayments() → boolean (sync from main)
//
// Successful transactions are dispatched to the renderer as a DOM event
// `mr-iap-completed` with detail = { productId } — this is exactly what
// usePremium() listens for so no extra hook code is needed.
contextBridge.exposeInMainWorld('megaRadioNative', {
  isNativeShell: true,
  platform: process.platform,
  purchase: (productId) => ipcRenderer.invoke('mr-iap-purchase', productId),
  restorePurchases: () => ipcRenderer.invoke('mr-iap-restore'),
  getProducts: (ids) => ipcRenderer.invoke('mr-iap-get-products', ids),
});

// Forward main-process IAP events to the renderer as DOM events.
ipcRenderer.on('mr-iap-completed', (_e, payload) => {
  window.dispatchEvent(new CustomEvent('mr-iap-completed', { detail: payload }));
});
ipcRenderer.on('mr-iap-failed', (_e, payload) => {
  window.dispatchEvent(new CustomEvent('mr-iap-failed', { detail: payload }));
});
ipcRenderer.on('mr-iap-restored', (_e, payload) => {
  window.dispatchEvent(new CustomEvent('mr-iap-restored', { detail: payload }));
});

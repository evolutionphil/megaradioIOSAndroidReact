// Preload — exposes a minimal API to the renderer for media-key shortcuts.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('megaRadioDesktop', {
  onShortcut: (cb) => ipcRenderer.on('mr-shortcut', (_e, key) => cb(key)),
  platform: process.platform,
  isDesktop: true,
});

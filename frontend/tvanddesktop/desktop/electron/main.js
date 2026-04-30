// MegaRadio Desktop — Electron main process
// Wraps the same TV web build (built into ../apple-tv-and-macos/web-preview/dist)
// into a native desktop window for Windows / macOS / Linux.

const { app, BrowserWindow, Menu, shell, globalShortcut, ipcMain } = require('electron');
const path = require('path');

// Disable hardware acceleration on Linux to avoid GPU sandbox issues in CI/headless
if (process.platform === 'linux') {
  app.disableHardwareAcceleration();
}

let mainWindow = null;

const APP_URL_PROD = 'https://music-premium-fix.preview.emergentagent.com/api/tv-app/';
const APP_URL_LOCAL = 'file://' + path.join(__dirname, '..', 'renderer', 'index.html');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0E0E0E',
    title: 'MegaRadio',
    icon: path.join(__dirname, '..', 'renderer', 'images', 'icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load the deployed TV preview by default; fall back to local bundle if offline.
  const url = process.env.MR_LOCAL === '1' ? APP_URL_LOCAL : APP_URL_PROD;
  mainWindow.loadURL(url);

  // Open external links in default browser, not inside the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' }, { type: 'separator' },
        { role: 'services' }, { type: 'separator' },
        { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
        { type: 'separator' }, { role: 'quit' },
      ],
    }] : []),
    {
      label: 'File',
      submenu: [ isMac ? { role: 'close' } : { role: 'quit' } ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Audio',
      submenu: [
        {
          label: 'Play / Pause', accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow?.webContents.send('mr-shortcut', 'play-pause'),
        },
        {
          label: 'Next Station', accelerator: 'CmdOrCtrl+Right',
          click: () => mainWindow?.webContents.send('mr-shortcut', 'next'),
        },
        {
          label: 'Previous Station', accelerator: 'CmdOrCtrl+Left',
          click: () => mainWindow?.webContents.send('mr-shortcut', 'prev'),
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Visit MegaRadio.live', click: () => shell.openExternal('https://themegaradio.com') },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  // Global media keys (best-effort; not all distros allow registration)
  try { globalShortcut.register('MediaPlayPause', () => mainWindow?.webContents.send('mr-shortcut', 'play-pause')); } catch (_) {}
  try { globalShortcut.register('MediaNextTrack', () => mainWindow?.webContents.send('mr-shortcut', 'next')); } catch (_) {}
  try { globalShortcut.register('MediaPreviousTrack', () => mainWindow?.webContents.send('mr-shortcut', 'prev')); } catch (_) {}

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

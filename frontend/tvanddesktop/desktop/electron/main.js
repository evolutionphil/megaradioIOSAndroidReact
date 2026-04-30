// MegaRadio Desktop — Electron main process
// Wraps the same TV web build (built into ../apple-tv-and-macos/web-preview/dist)
// into a native desktop window for Windows / macOS / Linux.

const { app, BrowserWindow, Menu, shell, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const updater = require('./updater');

// Disable hardware acceleration on Linux to avoid GPU sandbox issues in CI/headless
if (process.platform === 'linux') {
  app.disableHardwareAcceleration();
}

let mainWindow = null;

const APP_URL_PROD = 'https://music-premium-fix.preview.emergentagent.com/api/tv-app/';
const APP_URL_LOCAL = 'file://' + path.join(__dirname, '..', 'renderer', 'index.html');

function createWindow() {
  const { screen } = require('electron');
  const primary = screen.getPrimaryDisplay();
  const sw = primary.workAreaSize.width;
  const sh = primary.workAreaSize.height;

  // The TV UI is authored at a fixed 1920×1080 canvas. Open the window at
  // full HD when the display can fit it, otherwise fall back to a size that
  // preserves the 16:9 aspect ratio. The auto-scale script below adapts the
  // body so the whole UI always fits the window without scrollbars.
  const canFitFullHd = sw >= 1920 && sh >= 1080;
  const initialWidth  = canFitFullHd ? 1920 : Math.min(1600, sw - 40);
  const initialHeight = canFitFullHd ? 1080 : Math.round(initialWidth * 9 / 16);

  mainWindow = new BrowserWindow({
    width: initialWidth,
    height: initialHeight,
    minWidth: 960,
    minHeight: 540,
    useContentSize: true,
    backgroundColor: '#0E0E0E',
    title: 'MegaRadio',
    icon: path.join(__dirname, '..', 'renderer', 'images', 'icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      // Force a 16:9 viewport so the UI scales evenly regardless of window chrome
      devTools: true,
    },
  });

  // Start maximised on Windows/Linux for the best full-HD experience
  if (process.platform !== 'darwin') {
    mainWindow.maximize();
  }

  // Load the deployed TV preview by default; fall back to local bundle if offline.
  const url = process.env.MR_LOCAL === '1' ? APP_URL_LOCAL : APP_URL_PROD;
  mainWindow.loadURL(url);

  // Inject auto-scale CSS so the fixed 1920×1080 UI always fits the window,
  // centred, with a dark letterbox. This runs after the page loads.
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.insertCSS(`
      html, body {
        background: #0E0E0E !important;
        overflow: hidden !important;
        width: 100vw !important;
        height: 100vh !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      #root {
        position: fixed !important;
        top: 50%; left: 50%;
        width: 1920px;
        height: 1080px;
        transform-origin: center center;
        transform: translate(-50%, -50%) scale(var(--mr-scale, 1));
        background: #0E0E0E;
      }
    `).catch(() => {});

    mainWindow.webContents.executeJavaScript(`
      (function() {
        function updateScale() {
          var sx = window.innerWidth  / 1920;
          var sy = window.innerHeight / 1080;
          var s = Math.min(sx, sy);
          document.documentElement.style.setProperty('--mr-scale', s);
        }
        updateScale();
        window.addEventListener('resize', updateScale);
      })();
    `).catch(() => {});
  });

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
        {
          label: 'Actual Size (1920×1080)',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            if (!mainWindow) return;
            mainWindow.setFullScreen(false);
            mainWindow.unmaximize();
            mainWindow.setContentSize(1920, 1080);
            mainWindow.center();
          },
        },
        { role: 'togglefullscreen', accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11' },
        { type: 'separator' },
        { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' },
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
  // Auto-update from GitHub Releases (skips in dev)
  if (mainWindow && !process.env.MR_DISABLE_UPDATER) {
    try { updater.init(mainWindow); } catch (e) { console.warn('Updater init failed:', e); }
  }

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

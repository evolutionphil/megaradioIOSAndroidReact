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
let splashWindow = null;

const APP_URL_PROD = 'https://desktop.themegaradio.com/api/tv-app/';
const APP_URL_LOCAL = 'file://' + path.join(__dirname, '..', 'renderer', 'index.html');

/**
 * Splash window — small frameless brand window shown for the first ~2-3
 * seconds while Chromium establishes the connection to desktop.themegaradio.com.
 * Closed automatically once the main window finishes its first paint.
 */
function createSplash() {
  splashWindow = new BrowserWindow({
    width: 460,
    height: 320,
    frame: false,
    transparent: false,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    show: true,
    skipTaskbar: false,
    backgroundColor: '#0E0E0E',
    icon: path.join(__dirname, '..', 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html')).catch(() => {});
  splashWindow.once('closed', () => { splashWindow = null; });
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    try { splashWindow.close(); } catch (_) {}
  }
  splashWindow = null;
}

function createWindow() {
  const { screen } = require('electron');
  const primary = screen.getPrimaryDisplay();
  const sw = primary.workAreaSize.width;
  const sh = primary.workAreaSize.height;

  // The TV UI is authored at a fixed 1920×1080 canvas. Open the window at
  // full HD when the display can fit it, otherwise fall back to a size that
  // preserves the 16:9 aspect ratio. The zoom factor below keeps the UI
  // filling the window without scrollbars as the user resizes.
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
    show: false,                       // hidden until first paint, splash takes over
    icon: path.join(__dirname, '..', 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: true,
    },
  });

  // Cloudflare and other CDNs often serve a JS challenge page (or a flat 403)
  // when the User-Agent contains the string "Electron". Override with a stock
  // Chrome UA so the deployed TV bundle loads identically to a real browser.
  const chromeVersion = process.versions.chrome || '124.0.0.0';
  const platformUA = process.platform === 'darwin'
    ? 'Macintosh; Intel Mac OS X 10_15_7'
    : process.platform === 'win32'
      ? 'Windows NT 10.0; Win64; x64'
      : 'X11; Linux x86_64';
  const desktopUA = `Mozilla/5.0 (${platformUA}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36 MegaRadioDesktop/1.0`;
  mainWindow.webContents.setUserAgent(desktopUA);

  // Lock aspect ratio at 16:9 — the TV UI is designed only for 1920×1080
  // so any other ratio would cause letterboxing or blank areas.
  if (mainWindow.setAspectRatio) {
    mainWindow.setAspectRatio(16 / 9);
  }

  // Start maximised on Windows/Linux for the best full-HD experience
  if (process.platform !== 'darwin') {
    mainWindow.maximize();
  }

  // Load the deployed TV preview by default; fall back to local bundle if offline.
  const url = process.env.MR_LOCAL === '1' ? APP_URL_LOCAL : APP_URL_PROD;
  console.log('[MegaRadio] Loading', url, 'with UA:', desktopUA);
  mainWindow.loadURL(url);

  // Surface load failures so the user sees something better than a black window.
  mainWindow.webContents.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -3) return; // ERR_ABORTED — happens during normal redirects
    console.error('[MegaRadio] did-fail-load', errorCode, errorDescription, validatedURL);
    closeSplash();
    if (!mainWindow.isVisible()) mainWindow.show();
    const safeMsg = String(errorDescription || 'Unknown error').replace(/[<>&]/g, '');
    const safeUrl = String(validatedURL || url).replace(/[<>&]/g, '');
    mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
      <html><head><meta charset="utf-8"><title>MegaRadio - Connection error</title>
      <style>
        html,body{height:100%;margin:0;background:#0E0E0E;color:#fff;font-family:-apple-system,Segoe UI,sans-serif}
        .wrap{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:40px;text-align:center}
        h1{font-size:28px;margin:0;color:#FF4199}
        p{color:#aaa;max-width:560px;line-height:1.5}
        code{background:#1a1a1a;padding:2px 8px;border-radius:6px;color:#ffb;font-size:13px}
        button{margin-top:14px;background:#FF4199;color:#fff;border:0;padding:12px 28px;border-radius:24px;font-size:16px;cursor:pointer}
      </style></head><body><div class="wrap">
        <h1>MegaRadio cannot reach the server</h1>
        <p><b>${safeMsg}</b></p>
        <p>URL: <code>${safeUrl}</code></p>
        <p>Internet bağlantınızı kontrol edin ve uygulamayı yeniden başlatın.</p>
        <button onclick="location.href=${JSON.stringify(url)}">Yeniden dene</button>
      </div></body></html>
    `));
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[MegaRadio] did-finish-load', mainWindow.webContents.getURL());
    // Reveal the main window only after the page is painted, then drop the splash.
    if (!mainWindow.isVisible()) mainWindow.show();
    setTimeout(closeSplash, 200);   // tiny overlap for a smooth crossfade
  });

  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('[MegaRadio] renderer crashed:', details.reason);
    closeSplash();
  });

  // ────────────────────────────────────────────────────────────────────
  //  AUTO-ZOOM  —  keeps the 1920×1080 UI always filling the window
  // ────────────────────────────────────────────────────────────────────
  // Chromium's setZoomFactor scales the ENTIRE page (including position:fixed
  // children), unlike a CSS transform on a single element. This is exactly
  // what we need because the TV UI uses fixed-positioned layers that would
  // otherwise escape a CSS-scaled container.
  const applyZoom = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const [cw, ch] = mainWindow.getContentSize();
    // Base canvas is 1920×1080. Pick the smaller axis so the whole UI fits.
    const zx = cw / 1920;
    const zy = ch / 1080;
    const z  = Math.min(zx, zy);
    try { mainWindow.webContents.setZoomFactor(z); } catch (_) {}
  };

  mainWindow.webContents.on('did-finish-load', () => {
    applyZoom();
    // A tiny CSS overlay: lock scrolling and set the page background so the
    // edges (if any) blend with the UI.
    mainWindow.webContents.insertCSS(`
      html, body {
        background: #0E0E0E !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
      }
    `).catch(() => {});
  });

  mainWindow.on('resize', applyZoom);
  mainWindow.on('maximize', applyZoom);
  mainWindow.on('unmaximize', applyZoom);
  mainWindow.on('enter-full-screen', applyZoom);
  mainWindow.on('leave-full-screen', applyZoom);

  // Open external links in default browser, not inside the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // Open DevTools automatically when launched without `electron-builder` (i.e.
  // `yarn start`) so any black-screen failure shows its real cause in the
  // Console tab. Suppress in production builds (asar packed).
  if (!app.isPackaged) {
    mainWindow.webContents.once('dom-ready', () => {
      try { mainWindow.webContents.openDevTools({ mode: 'detach' }); } catch (_) {}
    });
  }
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
      label: 'Dev',
      submenu: [
        {
          label: 'Reset Premium State',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            if (!mainWindow) return;
            mainWindow.webContents.executeJavaScript(`
              localStorage.removeItem('premium_state_v1');
              sessionStorage.removeItem('mr_auto_paywall_shown_session');
              console.log('[MegaRadio] Premium state cleared.');
              location.reload();
            `).catch(() => {});
          },
        },
        {
          label: 'Clear All Local Storage',
          click: () => {
            if (!mainWindow) return;
            mainWindow.webContents.executeJavaScript(`
              localStorage.clear();
              sessionStorage.clear();
              console.log('[MegaRadio] All storage cleared.');
              location.reload();
            `).catch(() => {});
          },
        },
        { type: 'separator' },
        {
          label: 'Toggle DevTools',
          accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: () => mainWindow?.webContents.toggleDevTools(),
        },
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
  createSplash();    // show brand logo splash window first
  createWindow();    // main window starts hidden, splash overlays until first paint
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

// Electron auto-updater — checks GitHub Releases every 6h and prompts user.
// Requires: yarn add electron-updater electron-log
// Configure the `publish` field in package.json "build" to point at your GitHub repo
// and set GH_TOKEN in the CI env when running `electron-builder --publish always`.

const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const { dialog } = require('electron');

let mainWin = null;

function init(win) {
  mainWin = win;
  log.transports.file.level = 'info';
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
    if (mainWin) {
      mainWin.webContents.send('mr-update-status', { state: 'available', version: info.version });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info.version);
    dialog.showMessageBox(mainWin, {
      type: 'info',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      title: 'MegaRadio Update Ready',
      message: `Version ${info.version} is ready to install.`,
      detail: 'The update will be applied after restart.',
    }).then((result) => {
      if (result.response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.on('error', (err) => log.error('Updater error:', err));

  // First check after 10s, then every 6 hours
  setTimeout(() => autoUpdater.checkForUpdatesAndNotify().catch(log.warn), 10000);
  setInterval(() => autoUpdater.checkForUpdatesAndNotify().catch(log.warn), 6 * 60 * 60 * 1000);
}

module.exports = { init };

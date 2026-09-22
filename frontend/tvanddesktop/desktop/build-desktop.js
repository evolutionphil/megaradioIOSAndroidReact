// Explicit config also works with electron-builder releases that prioritize
// package.json's legacy build object over auto-discovered config files.
const { build } = require('electron-builder');
const path = require('path');
const { Platform } = require('electron-builder');
const name = process.argv[2];
if (!['mac', 'win', 'linux'].includes(name)) throw new Error('Usage: node build-desktop.js mac|win|linux');
const platform = name === 'mac' ? Platform.MAC : name === 'win' ? Platform.WINDOWS : Platform.LINUX;
build({ projectDir: __dirname, config: path.join(__dirname, 'electron-builder.config.js'), targets: platform.createTarget() })
  .catch(error => { console.error(error); process.exitCode = 1; });